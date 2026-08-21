import { useEffect, useMemo, useRef } from 'react'
import {
  Tldraw, createTLStore, defaultShapeUtils, defaultBindingUtils,
  getSnapshot, loadSnapshot,
  type TLRecord, type TLStoreSnapshot,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { supabase } from '../../lib/supabase'

type Props = {
  sessionId: string   // live_sessions.id — one shared board per session
}

type TlBroadcast = {
  added:   TLRecord[]
  updated: TLRecord[]
  removed: string[]
}

// Collaborative whiteboard synced over a Supabase Realtime broadcast channel.
// Document changes are broadcast to everyone in `whiteboard:{sessionId}`;
// late joiners request the current state and any existing peer replies with a
// full snapshot. No server round-trips or extra tables needed.
export default function LiveWhiteboard({ sessionId }: Props) {
  const store = useMemo(
    () => createTLStore({ shapeUtils: defaultShapeUtils, bindingUtils: defaultBindingUtils }),
    [sessionId],
  )
  const applyingRemote = useRef(false)
  const hasContent     = useRef(false)

  useEffect(() => {
    const channel = supabase.channel(`whiteboard:${sessionId}`)

    // Apply changes coming from other participants
    channel.on('broadcast', { event: 'tl' }, ({ payload }) => {
      const { added, updated, removed } = payload as TlBroadcast
      applyingRemote.current = true
      store.mergeRemoteChanges(() => {
        if (added.length)   store.put(added)
        if (updated.length) store.put(updated)
        if (removed.length) store.remove(removed as Parameters<typeof store.remove>[0])
      })
      applyingRemote.current = false
      hasContent.current = true
    })

    // A late joiner asked for the current board — reply if we have content
    channel.on('broadcast', { event: 'tl_request' }, () => {
      if (!hasContent.current) return
      channel.send({
        type: 'broadcast', event: 'tl_state',
        payload: { snapshot: getSnapshot(store) },
      })
    })

    // Received the current board state (only apply once, while still empty)
    channel.on('broadcast', { event: 'tl_state' }, ({ payload }) => {
      if (hasContent.current) return
      applyingRemote.current = true
      loadSnapshot(store, (payload as { snapshot: TLStoreSnapshot }).snapshot)
      applyingRemote.current = false
      hasContent.current = true
    })

    channel.subscribe(status => {
      if (status === 'SUBSCRIBED') {
        channel.send({ type: 'broadcast', event: 'tl_request', payload: {} })
      }
    })

    // Broadcast local document edits (user-made only — ignores remote merges)
    const unlisten = store.listen(
      ({ changes }) => {
        if (applyingRemote.current) return
        const added   = Object.values(changes.added)
        const updated = Object.values(changes.updated).map(([, next]) => next)
        const removed = Object.values(changes.removed).map(r => r.id)
        if (!added.length && !updated.length && !removed.length) return
        hasContent.current = true
        channel.send({ type: 'broadcast', event: 'tl', payload: { added, updated, removed } })
      },
      { scope: 'document', source: 'user' },
    )

    return () => {
      unlisten()
      supabase.removeChannel(channel)
    }
  }, [store, sessionId])

  return (
    <div className="w-full h-full rounded-xl overflow-hidden bg-white">
      <Tldraw store={store} />
    </div>
  )
}
