import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, Mic, MoreVertical, Plus, SendHorizontal } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

type Props = { onNavigate: (page: string) => void; backPage?: string }

interface Message {
  id: string
  body: string | null
  sent_at: string | null
  sender_id: string
  self: boolean
}

interface ConversationInfo {
  id: string
  name: string
  role: string
  initials: string
}

const quickChips = ['Is my son in school', 'How is he doing?', 'When is Mid term break']

const demoMessages: Message[] = [
  {
    id: 'demo-msg-1',
    body: 'David submitted his assignment today and performed very well.',
    sent_at: new Date('2026-08-04T13:20:00').toISOString(),
    sender_id: 'demo-teacher',
    self: false,
  },
  {
    id: 'demo-msg-2',
    body: 'Thank you for the update.',
    sent_at: new Date('2026-08-04T13:20:00').toISOString(),
    sender_id: 'demo-parent',
    self: true,
  },
]

function fmtTime(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' }).toUpperCase()
}

function formatInputChip(text: string) {
  return text.endsWith('?') ? text : text
}

function Avatar({
  initials,
  size = 'size-10',
  text = 'text-sm',
}: {
  initials: string
  size?: string
  text?: string
}) {
  return (
    <div className={`relative ${size} shrink-0`}>
      <div className={`flex ${size} items-center justify-center rounded-full bg-gradient-to-br from-sky-400 via-primary to-indigo-500 font-semibold text-white ${text}`}>
        {initials}
      </div>
      <span className="absolute bottom-0 right-0 size-2.5 rounded-full border-2 border-white bg-primary" />
    </div>
  )
}

export default function ParentChatRoomPage({ onNavigate, backPage = 'parent/chat' }: Props) {
  const { profile } = useAuth()

  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [convInfo, setConvInfo] = useState<ConversationInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [usingFallback, setUsingFallback] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const raw = sessionStorage.getItem('learnora_selected_conversation')
    if (!raw) {
      setConvInfo({
        id: 'demo-parent-conversation',
        name: 'Master Donald Duke',
        role: 'Maths Teacher',
        initials: 'DD',
      })
      return
    }

    try {
      setConvInfo(JSON.parse(raw) as ConversationInfo)
    } catch {
      setConvInfo({
        id: 'demo-parent-conversation',
        name: 'Master Donald Duke',
        role: 'Maths Teacher',
        initials: 'DD',
      })
    }
  }, [])

  useEffect(() => {
    if (convInfo?.id && profile?.id) loadMessages()
  }, [convInfo?.id, profile?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadMessages() {
    if (!convInfo?.id) return
    setLoading(true)

    const { data, error } = await supabase
      .from('messages')
      .select('id, body, sent_at, sender_id')
      .eq('conversation_id', convInfo.id)
      .order('sent_at', { ascending: true })
      .limit(100)

    if (error) {
      useFallback()
      return
    }

    const rows = (data ?? []) as { id: string; body: string | null; sent_at: string | null; sender_id: string }[]

    if (!rows.length) {
      useFallback()
      return
    }

    setMessages(rows.map(row => ({ ...row, self: row.sender_id === profile!.id })))
    setUsingFallback(false)
    setLoading(false)
  }

  function useFallback() {
    setMessages(demoMessages)
    setUsingFallback(true)
    setLoading(false)
  }

  async function send(text?: string) {
    const body = (text ?? draft).trim()
    if (!body || !convInfo?.id || sending) return

    if (usingFallback || !profile?.id || !profile.school_id || convInfo.id === 'demo-parent-conversation') {
      const optimistic: Message = {
        id: `demo-msg-${Date.now()}`,
        body,
        sent_at: new Date().toISOString(),
        sender_id: profile?.id ?? 'demo-parent',
        self: true,
      }
      setMessages(current => [...current, optimistic])
      setDraft('')
      return
    }

    setSending(true)
    const { error } = await supabase.from('messages').insert({
      conversation_id: convInfo.id,
      sender_id: profile.id,
      school_id: profile.school_id,
      body,
    })

    if (!error) {
      setDraft('')
      await loadMessages()
    }

    setSending(false)
  }

  const firstName = useMemo(() => convInfo?.name.split(' ')[0] ?? 'Teacher', [convInfo?.name])

  function renderMessage(message: Message) {
    if (message.self) {
      return (
        <div key={message.id} className="flex justify-end">
          <div className="max-w-[78%] rounded-[20px] rounded-br-[6px] bg-primary px-5 py-4 text-white shadow-[0_8px_20px_rgba(75,117,255,0.32)]">
            <p className="text-[14px] leading-6">{message.body}</p>
            <p className="mt-1 text-right text-[8px] text-white/75">{fmtTime(message.sent_at)}</p>
          </div>
        </div>
      )
    }

    return (
      <div key={message.id} className="flex items-end gap-3">
        <Avatar initials={convInfo?.initials ?? 'T'} size="size-8" text="text-[11px]" />
        <div className="max-w-[78%] rounded-[20px] rounded-bl-[6px] bg-white px-5 py-4 text-foreground shadow-[0_6px_18px_rgba(0,0,0,0.15)]">
          <p className="text-[14px] leading-6">{message.body}</p>
          <p className="mt-1 text-right text-[8px] text-foreground/50">{fmtTime(message.sent_at)}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-canvas lg:px-6 lg:py-8">
      <div className="mx-auto flex min-h-screen max-w-[430px] flex-col bg-white lg:min-h-[860px] lg:overflow-hidden lg:rounded-[32px] lg:shadow-xl">
        <header className="shrink-0 border-b border-black/10 bg-white px-4 pb-3 pt-11 lg:pt-6">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => onNavigate(backPage)} className="text-foreground">
              <ChevronLeft size={24} />
            </button>

            <Avatar initials={convInfo?.initials ?? '?'} />

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-[14px] font-semibold text-foreground">{convInfo?.name ?? 'Chat'}</p>
                {convInfo?.role && (
                  <>
                    <span className="size-[7px] shrink-0 rounded-full bg-black/10" />
                    <span className="truncate text-[8px] text-foreground/70">{convInfo.role}</span>
                  </>
                )}
              </div>
              <p className="mt-1 text-[12px] text-foreground">Online</p>
            </div>

            <button type="button" className="text-foreground">
              <MoreVertical size={22} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-white px-4 py-3">
          {usingFallback && (
            <div className="mb-4 rounded-[16px] border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-primary">
              Preview mode: showing a sample conversation because this chat has no live messages yet.
            </div>
          )}

          <div className="mb-5 flex justify-center">
            <span className="rounded-full bg-primary px-4 py-1 text-[10px] font-semibold text-white">Today</span>
          </div>

          {loading ? (
            <div className="py-10 text-center text-sm text-muted">Loading conversation…</div>
          ) : (
            <div className="space-y-6">
              {messages.length ? (
                messages.map(renderMessage)
              ) : (
                <div className="rounded-[24px] border border-dashed border-black/12 px-5 py-8 text-center text-sm text-muted">
                  No messages yet. Start the conversation with {firstName}.
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </main>

        {profile?.role === 'parent' && messages.length <= 2 && (
          <div className="shrink-0 overflow-x-auto px-4 py-3">
            <div className="flex min-w-max gap-3">
              {quickChips.map(chip => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => send(chip)}
                  className="rounded-[14px] border border-black/50 bg-white px-5 py-4 text-[14px] text-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  {formatInputChip(chip)}
                </button>
              ))}
            </div>
          </div>
        )}

        <footer className="shrink-0 rounded-t-[18px] border-t border-black/10 bg-white px-4 pb-6 pt-5 shadow-[0_-6px_18px_rgba(0,0,0,0.06)]">
          <div className="rounded-[18px] border border-black/10 bg-white px-4 py-4 shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
            <textarea
              value={draft}
              onChange={event => setDraft(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  send()
                }
              }}
              placeholder="Type Any Message Here"
              rows={2}
              className="min-h-[64px] w-full resize-none bg-transparent text-[16px] text-foreground outline-none placeholder:text-muted"
            />

            <div className="mt-4 flex items-center justify-end gap-5">
              <button type="button" className="text-foreground">
                <Plus size={24} />
              </button>
              <button type="button" className="text-foreground">
                <Mic size={24} />
              </button>
              <button
                type="button"
                onClick={() => send()}
                disabled={!draft.trim() || sending}
                className="flex size-[50px] items-center justify-center rounded-full bg-primary text-white transition-opacity disabled:opacity-40"
              >
                <SendHorizontal size={22} />
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
