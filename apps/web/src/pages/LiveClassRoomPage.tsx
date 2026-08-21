import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react'
import Daily from '@daily-co/daily-js'
import type { DailyCall } from '@daily-co/daily-js'
import {
  DailyProvider,
  useDaily,
  useParticipantIds,
  useLocalSessionId,
  DailyVideo,
  DailyAudio,
  useScreenShare,
  useAppMessage,
  useMeetingState,
  useVideoTrack,
  useAudioTrack,
} from '@daily-co/daily-react'
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, Hand,
  MessageSquare, Users, Phone, Maximize2, Send, PenLine, X, Disc,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { logSupabaseError } from '../lib/supabaseError'
import { useClassRecorder } from '../lib/useClassRecorder'

const LiveWhiteboard = lazy(() => import('../components/whiteboard/LiveWhiteboard'))

type Props = { onNavigate: (page: string) => void }
type Panel = 'chat' | 'participants' | null

interface ChatMsg { sender: string; time: string; text: string }

// ── Outer shell — creates the Daily call object once ─────────────────────────

export default function LiveClassRoomPage({ onNavigate }: Props) {
  const roomUrl = sessionStorage.getItem('learnora_daily_room_url') ?? ''
  const token   = sessionStorage.getItem('learnora_daily_token')   ?? ''

  // Reuse an existing instance if one survives (StrictMode remount / quick re-entry) —
  // Daily throws "Duplicate DailyIframe instances" if we blindly create a second one.
  const [callObject] = useState<DailyCall>(() => Daily.getCallInstance() ?? Daily.createCallObject())

  useEffect(() => {
    return () => {
      callObject.leave().catch(() => {}).finally(() => callObject.destroy().catch(() => {}))
    }
  }, [callObject])

  if (!roomUrl || !token) {
    const wasTeacher = sessionStorage.getItem('learnora_session_is_teacher') === 'true'
    return (
      <div className="h-screen bg-[#0a0f1e] flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60 text-sm mb-4">Session not found. Please go back and start again.</p>
          <button
            onClick={() => onNavigate(wasTeacher ? 'teacher-live-classes' : 'live-classes')}
            className="h-10 px-6 bg-primary text-white text-sm font-semibold rounded-pill"
          >
            Back to Live Classes
          </button>
        </div>
      </div>
    )
  }

  return (
    <DailyProvider callObject={callObject}>
      <DailyAudio />
      <LiveRoomInner onNavigate={onNavigate} roomUrl={roomUrl} token={token} />
    </DailyProvider>
  )
}

// ── Inner room — hooks work here because DailyProvider is mounted ─────────────

function LiveRoomInner({
  onNavigate,
  roomUrl,
  token,
}: {
  onNavigate: (page: string) => void
  roomUrl: string
  token: string
}) {
  const { profile } = useAuth()
  const daily         = useDaily()
  const meetingState  = useMeetingState()
  const remoteIds     = useParticipantIds()
  const localId       = useLocalSessionId()
  const localVideo    = useVideoTrack(localId ?? '')
  const localAudio    = useAudioTrack(localId ?? '')
  const { screens, startScreenShare, stopScreenShare, isSharingScreen } = useScreenShare()

  const topic      = sessionStorage.getItem('learnora_session_topic')   ?? 'Live Class'
  const className  = sessionStorage.getItem('learnora_session_class')   ?? ''
  const sessionId  = sessionStorage.getItem('learnora_session_id')      ?? ''
  const isTeacher  = sessionStorage.getItem('learnora_session_is_teacher') === 'true'
  const initMicOn  = sessionStorage.getItem('learnora_lobby_mic_on')  !== 'false'
  const initCamOn  = sessionStorage.getItem('learnora_lobby_cam_on')  !== 'false'
  const backPage   = isTeacher ? 'teacher-live-classes' : 'live-classes'

  const [panel,   setPanel]   = useState<Panel>('chat')
  const [raised,  setRaised]  = useState(false)
  const [msg,     setMsg]     = useState('')
  const [msgs,    setMsgs]    = useState<ChatMsg[]>([])
  const [mode,    setMode]    = useState<'gallery' | 'screenshare' | 'whiteboard'>('gallery')
  const [joinError, setJoinError] = useState('')
  const [raisedHands, setRaisedHands] = useState<Record<string, string>>({})  // daily sessionId -> participant name
  const chatEndRef      = useRef<HTMLDivElement>(null)
  const attendanceMarked = useRef(false)

  const recorder = useClassRecorder(sessionId, profile?.school_id ?? '')

  const camOn = localId ? !localVideo.isOff : initCamOn
  const micOn = localId ? !localAudio.isOff : initMicOn

  const allParticipantIds = localId
    ? [localId, ...remoteIds]
    : remoteIds

  // Join the call on mount
  useEffect(() => {
    if (!daily || meetingState !== 'new') return
    daily.join({
      url:   roomUrl,
      token,
      startVideoOff: !initCamOn,
      startAudioOff: !initMicOn,
    }).catch((e: unknown) => {
      setJoinError(e instanceof Error ? e.message : 'Could not connect to the class.')
    })
  }, [daily, meetingState])

  // Surface fatal call errors (expired room, invalid token, network) instead of spinning forever
  useEffect(() => {
    if (!daily) return
    const onError = (ev?: { errorMsg?: string }) => {
      setJoinError(ev?.errorMsg ?? 'The connection to the class failed.')
    }
    daily.on('error', onError)
    return () => { daily.off('error', onError) }
  }, [daily])

  // Auto-attendance: mark the student present once they actually join the call.
  // Teachers can override it later from In-Class Attendance (their save wins).
  useEffect(() => {
    if (meetingState !== 'joined-meeting' || isTeacher || attendanceMarked.current) return
    if (!profile?.id || !profile.school_id) return
    const classId = sessionStorage.getItem('learnora_session_class_id') ?? ''
    if (!classId) return
    attendanceMarked.current = true
    const today = new Date().toISOString().split('T')[0]
    ;(async () => {
      // Only write if the teacher hasn't already marked this student today
      const { data: existing } = await supabase
        .from('attendance_records')
        .select('id')
        .eq('student_id', profile.id)
        .eq('class_id', classId)
        .eq('date', today)
        .maybeSingle()
      if (existing) return
      const { error: err } = await supabase.from('attendance_records').insert({
        school_id:  profile.school_id!,
        class_id:   classId,
        student_id: profile.id,
        date:       today,
        status:     'present',
        source:     'live_auto',
        marked_at:  new Date().toISOString(),
      })
      if (err) logSupabaseError('LiveRoom/autoAttendance', err)
    })()
  }, [meetingState, isTeacher, profile?.id])

  // Scroll chat to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  // Switch to screenshare mode when a screen is being shared
  useEffect(() => {
    if (screens.length > 0) setMode('screenshare')
    else if (mode === 'screenshare') setMode('gallery')
  }, [screens.length])

  // Receive chat + raise-hand messages; returned function broadcasts to the room
  const sendMsg = useAppMessage({
    onAppMessage: useCallback((evt: { data: { type?: string; text?: string; sender?: string; raised?: boolean; sid?: string } }) => {
      if (evt.data?.type === 'chat') {
        const now = new Date()
        setMsgs(prev => [...prev, {
          sender: evt.data.sender ?? 'Participant',
          time:   `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`,
          text:   evt.data.text ?? '',
        }])
        return
      }
      if (evt.data?.type === 'hand' && evt.data.sid) {
        const { sid, raised: isUp, sender } = evt.data
        setRaisedHands(prev => {
          const n = { ...prev }
          if (isUp) n[sid] = sender ?? 'Participant'
          else delete n[sid]
          return n
        })
      }
    }, []),
  })

  function toggleHand() {
    if (!localId) return
    const next = !raised
    setRaised(next)
    setRaisedHands(prev => {
      const n = { ...prev }
      if (next) n[localId] = profile?.full_name ?? 'You'
      else delete n[localId]
      return n
    })
    sendMsg({ type: 'hand', raised: next, sid: localId, sender: profile?.full_name ?? 'Participant' }, '*')
  }

  function handleSend() {
    const text = msg.trim()
    if (!text || !daily) return
    const now = new Date()
    const localMsg: ChatMsg = {
      sender: profile?.full_name ?? 'You',
      time: `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`,
      text,
    }
    setMsgs(prev => [...prev, localMsg])
    sendMsg({ type: 'chat', text, sender: profile?.full_name ?? 'You' }, '*')
    setMsg('')
  }

  async function handleLeave() {
    await daily?.leave()
    if (isTeacher && sessionId) {
      await supabase.from('live_sessions').update({ status: 'ended' }).eq('id', sessionId)
    }
    onNavigate(backPage)
  }

  function toggleMic() {
    daily?.setLocalAudio(!micOn)
  }

  function toggleCamera() {
    daily?.setLocalVideo(!camOn)
  }

  function toggleScreen() {
    if (isSharingScreen) stopScreenShare()
    else startScreenShare()
  }

  function togglePanel(p: Panel) {
    setPanel(prev => prev === p ? null : p)
  }

  const isJoining   = meetingState === 'joining-meeting' || meetingState === 'loading'
  const isJoined    = meetingState === 'joined-meeting'

  const tileColors  = ['bg-primary','bg-accent-mint','bg-amber-500','bg-red-500','bg-green-600','bg-purple-500']

  return (
    <div className="h-screen bg-[#0a0f1e] flex flex-col overflow-hidden">

      {/* Top bar */}
      <div className="h-14 flex items-center justify-between px-5 border-b border-white/8 shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs font-bold text-white bg-red-500 px-2.5 py-1 rounded-full">
            <span className="size-1.5 rounded-full bg-white animate-pulse" />
            {isJoining ? 'JOINING' : 'LIVE'}
          </span>
          <span className="text-white font-semibold text-sm hidden sm:block">{topic}</span>
          {className && <span className="text-white/40 text-xs hidden sm:block">{className}</span>}
        </div>
        <div className="flex items-center gap-2">
          {(['gallery', 'screenshare'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`h-7 px-3 rounded-full text-xs font-semibold capitalize transition-colors ${mode === m ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'}`}
            >
              {m === 'screenshare' ? 'Screen' : 'Gallery'}
            </button>
          ))}
          {isTeacher && (
            <button
              onClick={() => recorder.state === 'recording' ? recorder.stop() : recorder.state === 'idle' && recorder.start()}
              disabled={recorder.state === 'uploading'}
              title={recorder.state === 'recording' ? 'Stop recording' : 'Record this class (share this tab with audio)'}
              className={`flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-semibold transition-colors ${
                recorder.state === 'recording' ? 'bg-red-500 text-white'
                : recorder.state === 'uploading' ? 'bg-white/10 text-white/50'
                : 'text-white/40 hover:text-white border border-white/15'
              }`}
            >
              <Disc size={11} className={recorder.state === 'recording' ? 'animate-pulse' : ''} />
              {recorder.state === 'recording'
                ? `${Math.floor(recorder.elapsed / 60)}:${String(recorder.elapsed % 60).padStart(2, '0')}`
                : recorder.state === 'uploading' ? 'Saving…' : 'Record'}
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {Object.keys(raisedHands).length > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full">
              <Hand size={11} /> {Object.keys(raisedHands).length}
            </span>
          )}
          <span className="text-white/40 text-xs">{allParticipantIds.length} in call</span>
        </div>
      </div>

      {/* Recorder error toast */}
      {recorder.error && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 px-4 py-2 bg-red-500 text-white text-xs font-semibold rounded-full shadow-lg">
          {recorder.error}
        </div>
      )}

      {/* Join error overlay */}
      {joinError && (
        <div className="absolute inset-0 z-50 bg-[#0a0f1e]/95 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <p className="text-red-400 text-sm font-semibold mb-2">Could not join the class</p>
            <p className="text-white/60 text-xs mb-5 break-words">{joinError}</p>
            <button
              onClick={() => onNavigate(backPage)}
              className="h-10 px-6 bg-primary text-white text-sm font-semibold rounded-pill"
            >
              Back to Live Classes
            </button>
          </div>
        </div>
      )}

      {/* Joining overlay */}
      {isJoining && !joinError && (
        <div className="absolute inset-0 z-50 bg-[#0a0f1e]/90 flex items-center justify-center">
          <div className="text-center">
            <div className="size-12 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-4" />
            <p className="text-white text-sm">Joining the class…</p>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">

        {/* Video / screenshare area */}
        <div className="flex-1 flex flex-col p-4 gap-3 overflow-hidden">

          {mode === 'gallery' && (
            <>
              {isJoined && allParticipantIds.length > 0 ? (
                <div className={`flex-1 grid gap-3 overflow-hidden ${
                  allParticipantIds.length === 1 ? 'grid-cols-1' :
                  allParticipantIds.length <= 4  ? 'grid-cols-2' :
                  'grid-cols-3'
                }`}>
                  {allParticipantIds.map((id, i) => (
                    <ParticipantTile
                      key={id}
                      sessionId={id}
                      isLocal={id === localId}
                      color={tileColors[i % tileColors.length]}
                      handRaised={!!raisedHands[id]}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex-1 bg-[#1a2035] rounded-xl flex items-center justify-center">
                  <p className="text-white/30 text-sm">Waiting for participants…</p>
                </div>
              )}
            </>
          )}

          {mode === 'screenshare' && (
            <div className="flex-1 flex flex-col gap-3 overflow-hidden">
              {screens.length > 0 ? (
                <div className="flex-1 bg-[#1a2035] rounded-xl overflow-hidden">
                  <DailyVideo
                    sessionId={screens[0].session_id}
                    type="screenVideo"
                    fit="contain"
                    className="w-full h-full"
                  />
                </div>
              ) : (
                <div className="flex-1 bg-[#1a2035] rounded-xl flex flex-col items-center justify-center gap-3">
                  <Monitor size={48} className="text-white/20" />
                  <p className="text-white/40 text-sm">No screen is being shared</p>
                  {isTeacher && (
                    <button
                      onClick={toggleScreen}
                      className="h-9 px-4 bg-primary/30 text-primary text-sm font-semibold rounded-full hover:bg-primary/50 transition-colors"
                    >
                      Share Your Screen
                    </button>
                  )}
                </div>
              )}
              {/* Thumbnail strip of participants */}
              {allParticipantIds.length > 0 && (
                <div className="flex gap-2 h-24 overflow-x-auto shrink-0">
                  {allParticipantIds.slice(0, 6).map((id) => (
                    <div key={id} className="h-full aspect-video bg-[#1a2035] rounded-lg overflow-hidden shrink-0">
                      <DailyVideo sessionId={id} type="video" fit="cover" mirror={id === localId} className="w-full h-full" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {mode === 'whiteboard' && (
            <div className="flex-1 rounded-xl overflow-hidden">
              <Suspense fallback={
                <div className="w-full h-full bg-white rounded-xl flex items-center justify-center">
                  <p className="text-gray-400 text-sm">Loading whiteboard…</p>
                </div>
              }>
                <LiveWhiteboard sessionId={sessionId} />
              </Suspense>
            </div>
          )}
        </div>

        {/* Side panel */}
        {panel && (
          <div className="w-72 border-l border-white/8 flex flex-col shrink-0">
            <div className="h-10 flex items-center border-b border-white/8 shrink-0 px-1">
              {(['chat', 'participants'] as Panel[]).map(p => (
                <button
                  key={p!}
                  onClick={() => setPanel(p)}
                  className={`flex-1 text-xs font-semibold capitalize transition-colors h-full ${panel === p ? 'text-white border-b-2 border-primary' : 'text-white/40 hover:text-white'}`}
                >
                  {p === 'participants' ? `People (${allParticipantIds.length})` : 'Chat'}
                </button>
              ))}
              <button onClick={() => setPanel(null)} className="text-white/30 hover:text-white ml-2 shrink-0">
                <X size={14} />
              </button>
            </div>

            {panel === 'chat' && (
              <>
                <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
                  {msgs.length === 0 && (
                    <p className="text-xs text-white/20 text-center mt-8">No messages yet</p>
                  )}
                  {msgs.map((m, i) => (
                    <div key={i}>
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="text-xs font-semibold text-white/70">{m.sender}</span>
                        <span className="text-[10px] text-white/30">{m.time}</span>
                      </div>
                      <p className="text-xs text-white/80 leading-relaxed">{m.text}</p>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div className="p-3 border-t border-white/8 flex gap-2">
                  <input
                    value={msg}
                    onChange={e => setMsg(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                    placeholder="Message…"
                    className="flex-1 h-9 px-3 bg-white/10 rounded-full text-xs text-white placeholder:text-white/30 outline-none"
                  />
                  <button
                    onClick={handleSend}
                    className="size-9 rounded-full bg-primary flex items-center justify-center hover:bg-primary-deep transition-colors"
                  >
                    <Send size={13} className="text-white" />
                  </button>
                </div>
              </>
            )}

            {panel === 'participants' && (
              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                {allParticipantIds.map((id, i) => (
                  <ParticipantRow key={id} sessionId={id} isLocal={id === localId} color={tileColors[i % tileColors.length]} handRaised={!!raisedHands[id]} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Control bar */}
      <div className="h-18 flex items-center justify-center gap-3 px-6 border-t border-white/8 shrink-0 py-3">
        <ControlBtn
          active={micOn}
          activeClass="hover:bg-white/8"
          inactiveClass="bg-red-500/20"
          icon={<Mic size={20} className="text-white" />}
          offIcon={<MicOff size={20} className="text-red-400" />}
          label="Mic"
          on={micOn}
          onClick={toggleMic}
        />
        <ControlBtn
          active={camOn}
          activeClass="hover:bg-white/8"
          inactiveClass="bg-red-500/20"
          icon={<Video size={20} className="text-white" />}
          offIcon={<VideoOff size={20} className="text-red-400" />}
          label="Camera"
          on={camOn}
          onClick={toggleCamera}
        />
        {isTeacher && (
          <ControlBtn
            active={!isSharingScreen}
            activeClass="hover:bg-white/8"
            inactiveClass="bg-primary/30"
            icon={<Monitor size={20} className="text-white" />}
            offIcon={<MonitorOff size={20} className="text-primary" />}
            label="Share"
            on={!isSharingScreen}
            onClick={toggleScreen}
          />
        )}
        <button
          onClick={() => { setMode('whiteboard'); setPanel(null) }}
          className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${mode === 'whiteboard' ? 'bg-primary/30' : 'hover:bg-white/8'}`}
        >
          <PenLine size={20} className={mode === 'whiteboard' ? 'text-primary' : 'text-white'} />
          <span className="text-[9px] text-white/50">Board</span>
        </button>
        <button
          onClick={toggleHand}
          className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${raised ? 'bg-amber-500/30' : 'hover:bg-white/8'}`}
        >
          <Hand size={20} className={raised ? 'text-amber-400' : 'text-white'} />
          <span className="text-[9px] text-white/50">Raise</span>
        </button>
        <button
          onClick={() => togglePanel('chat')}
          className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${panel === 'chat' ? 'bg-primary/30' : 'hover:bg-white/8'}`}
        >
          <MessageSquare size={20} className={panel === 'chat' ? 'text-primary' : 'text-white'} />
          <span className="text-[9px] text-white/50">Chat</span>
        </button>
        <button
          onClick={() => togglePanel('participants')}
          className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${panel === 'participants' ? 'bg-primary/30' : 'hover:bg-white/8'}`}
        >
          <Users size={20} className={panel === 'participants' ? 'text-primary' : 'text-white'} />
          <span className="text-[9px] text-white/50">People</span>
        </button>
        <button
          onClick={() => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()}
          className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl hover:bg-white/8 transition-colors"
        >
          <Maximize2 size={20} className="text-white" />
          <span className="text-[9px] text-white/50">Full</span>
        </button>
        <div className="h-8 w-px bg-white/10 mx-1" />
        <button
          onClick={handleLeave}
          className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/40 transition-colors"
        >
          <Phone size={20} className="text-red-400 rotate-[135deg]" />
          <span className="text-[9px] text-red-400">{isTeacher ? 'End' : 'Leave'}</span>
        </button>
      </div>
    </div>
  )
}

// ── Participant video tile ─────────────────────────────────────────────────────

function ParticipantTile({ sessionId, isLocal, color, handRaised }: { sessionId: string; isLocal: boolean; color: string; handRaised?: boolean }) {
  const videoTrack = useVideoTrack(sessionId)
  const audioTrack = useAudioTrack(sessionId)
  const camOn = !videoTrack.isOff
  const micOn = !audioTrack.isOff

  return (
    <div className={`relative bg-[#1a2035] rounded-xl overflow-hidden flex items-center justify-center ${handRaised ? 'ring-2 ring-amber-400' : ''}`}>
      {camOn ? (
        <DailyVideo
          sessionId={sessionId}
          type="video"
          fit="cover"
          mirror={isLocal}
          className="w-full h-full"
        />
      ) : (
        <div className={`size-14 rounded-full ${color} flex items-center justify-center text-white text-xl font-bold`}>
          {sessionId.substring(0, 2).toUpperCase()}
        </div>
      )}
      {handRaised && (
        <span className="absolute top-2 right-2 bg-amber-400 text-black rounded-full p-1.5 shadow">
          <Hand size={12} />
        </span>
      )}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
        <span className="text-white text-[11px] font-semibold bg-black/50 px-2 py-0.5 rounded-full truncate">
          {isLocal ? 'You' : 'Participant'}
        </span>
        {!micOn && <MicOff size={11} className="text-red-400 shrink-0" />}
      </div>
    </div>
  )
}

// ── Participant row (side panel) ───────────────────────────────────────────────

function ParticipantRow({ sessionId, isLocal, color, handRaised }: { sessionId: string; isLocal: boolean; color: string; handRaised?: boolean }) {
  const videoTrack = useVideoTrack(sessionId)
  const audioTrack = useAudioTrack(sessionId)
  const camOn = !videoTrack.isOff
  const micOn = !audioTrack.isOff

  return (
    <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors">
      <div className={`size-8 rounded-full ${color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
        {sessionId.substring(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white truncate">
          {isLocal ? 'You' : 'Participant'}
          {isLocal && <span className="text-white/40 ml-1 font-normal">(you)</span>}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        {handRaised && <Hand size={11} className="text-amber-400" />}
        {micOn ? <Mic size={11} className="text-white/40" /> : <MicOff size={11} className="text-red-400" />}
        {camOn ? <Video size={11} className="text-white/40" /> : <VideoOff size={11} className="text-red-400" />}
      </div>
    </div>
  )
}

// ── Generic control button ─────────────────────────────────────────────────────

function ControlBtn({
  on, icon, offIcon, label, onClick, activeClass, inactiveClass,
}: {
  on: boolean; icon: React.ReactNode; offIcon: React.ReactNode
  label: string; onClick: () => void; activeClass: string; inactiveClass: string
  active: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-colors ${on ? activeClass : inactiveClass}`}
    >
      {on ? icon : offIcon}
      <span className="text-[9px] text-white/50">{label}</span>
    </button>
  )
}
