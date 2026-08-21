import { useState, useRef, useCallback } from 'react'
import { supabase } from './supabase'
import { logSupabaseError } from './supabaseError'

// Teacher-side class recording (free-plan alternative to Daily cloud recording).
// Captures the browser tab (video + tab audio, i.e. remote participants) and
// mixes in the teacher's microphone, records with MediaRecorder, then uploads
// the .webm to the private `class-recordings` Storage bucket and inserts a
// session_recordings row pointing at the storage path.

type RecorderState = 'idle' | 'recording' | 'uploading'

export function useClassRecorder(sessionId: string, schoolId: string) {
  const [state,   setState]   = useState<RecorderState>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [error,   setError]   = useState('')

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef   = useRef<Blob[]>([])
  const streamsRef  = useRef<MediaStream[]>([])
  const ctxRef      = useRef<AudioContext | null>(null)
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedRef  = useRef(0)

  const cleanup = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    streamsRef.current.forEach(s => s.getTracks().forEach(t => t.stop()))
    streamsRef.current = []
    ctxRef.current?.close().catch(() => {})
    ctxRef.current = null
    recorderRef.current = null
  }, [])

  const start = useCallback(async () => {
    setError('')
    try {
      // Ask the teacher to share THIS tab ("share tab audio" keeps participants audible)
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 15 },
        audio: true,
        // @ts-expect-error - hints supported in Chromium
        selfBrowserSurface: 'include', preferCurrentTab: true,
      })
      streamsRef.current.push(display)

      // Mix tab audio + teacher's microphone into one track
      const ctx  = new AudioContext()
      ctxRef.current = ctx
      const dest = ctx.createMediaStreamDestination()
      if (display.getAudioTracks().length > 0) {
        ctx.createMediaStreamSource(new MediaStream(display.getAudioTracks())).connect(dest)
      }
      try {
        const mic = await navigator.mediaDevices.getUserMedia({ audio: true })
        streamsRef.current.push(mic)
        ctx.createMediaStreamSource(mic).connect(dest)
      } catch { /* mic denied — record with tab audio only */ }

      const combined = new MediaStream([
        ...display.getVideoTracks(),
        ...dest.stream.getAudioTracks(),
      ])

      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus' : 'video/webm'
      const rec = new MediaRecorder(combined, { mimeType: mime, videoBitsPerSecond: 1_000_000 })
      chunksRef.current = []
      rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }

      // If the teacher stops sharing from the browser UI, finish the recording
      display.getVideoTracks()[0]?.addEventListener('ended', () => stop())

      rec.onstop = async () => {
        const durationSec = Math.round((Date.now() - startedRef.current) / 1000)
        const blob = new Blob(chunksRef.current, { type: 'video/webm' })
        cleanup()
        if (blob.size < 50_000) { setState('idle'); return }  // discard near-empty recordings

        setState('uploading')
        const path = `${schoolId}/${sessionId}/${Date.now()}.webm`
        const { error: upErr } = await supabase.storage
          .from('class-recordings')
          .upload(path, blob, { contentType: 'video/webm', upsert: false })
        if (upErr) {
          setError(`Upload failed: ${upErr.message}`)
          setState('idle')
          return
        }
        const { error: dbErr } = await supabase.from('session_recordings').insert({
          school_id:        schoolId,
          session_id:       sessionId,
          recording_url:    path,             // storage path — signed URL created on playback
          duration_seconds: durationSec,
        })
        if (dbErr) { logSupabaseError('Recorder/insert', dbErr); setError(dbErr.message) }
        setState('idle')
      }

      recorderRef.current = rec
      startedRef.current  = Date.now()
      rec.start(3000) // gather chunks every 3s
      setElapsed(0)
      timerRef.current = setInterval(() => {
        setElapsed(Math.round((Date.now() - startedRef.current) / 1000))
      }, 1000)
      setState('recording')
    } catch (e) {
      cleanup()
      // User cancelled the share picker → not an error worth showing
      if (e instanceof DOMException && e.name === 'NotAllowedError') return
      setError(e instanceof Error ? e.message : 'Could not start recording.')
    }
  }, [sessionId, schoolId, cleanup])

  const stop = useCallback(() => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }, [])

  return { state, elapsed, error, start, stop }
}
