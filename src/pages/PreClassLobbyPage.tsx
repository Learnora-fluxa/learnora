import { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, Video, VideoOff, ArrowLeft, Users, Clock, AlertCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

type Props = { onNavigate: (page: string) => void }

export default function PreClassLobbyPage({ onNavigate }: Props) {
  const { profile } = useAuth()

  const topic      = sessionStorage.getItem('learnora_session_topic') ?? 'Live Class'
  const className  = sessionStorage.getItem('learnora_session_class') ?? ''
  const isTeacher  = sessionStorage.getItem('learnora_session_is_teacher') === 'true'
  const backPage   = isTeacher ? 'teacher-live-classes' : 'live-classes'

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [micOn,    setMicOn]    = useState(true)
  const [cameraOn, setCameraOn] = useState(true)
  const [camError, setCamError] = useState(false)

  // Start camera preview on mount
  useEffect(() => {
    let active = true
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        if (!active) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
        setCameraOn(true)
        setCamError(false)
      } catch {
        setCameraOn(false)
        setCamError(true)
      }
    }
    startCamera()
    return () => {
      active = false
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  function toggleCamera() {
    if (!streamRef.current) return
    const track = streamRef.current.getVideoTracks()[0]
    if (!track) return
    track.enabled = !cameraOn
    setCameraOn(!cameraOn)
  }

  function toggleMic() {
    setMicOn(!micOn)
  }

  function joinClass() {
    // Stop preview stream — Daily will request camera again inside the call
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    // Pass device prefs so LiveClassRoomPage can apply them on join
    sessionStorage.setItem('learnora_lobby_mic_on',  String(micOn))
    sessionStorage.setItem('learnora_lobby_cam_on',  String(cameraOn))
    onNavigate('live-classroom')
  }

  const initials = (profile?.full_name ?? 'You')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex flex-col items-center justify-center p-6 gap-8">
      {/* Back */}
      <button
        onClick={() => { streamRef.current?.getTracks().forEach(t => t.stop()); onNavigate(backPage) }}
        className="absolute top-6 left-6 flex items-center gap-2 text-white/60 text-sm hover:text-white transition-colors"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div className="text-center mb-2">
        <h1 className="text-2xl font-bold text-white">Ready to join?</h1>
        <p className="text-white/60 text-sm mt-1">{topic}{className ? ` · ${className}` : ''}</p>
      </div>

      {/* Camera preview */}
      <div className="relative w-full max-w-[480px] aspect-video bg-[#1a2035] rounded-2xl overflow-hidden flex items-center justify-center">
        {cameraOn && !camError ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover scale-x-[-1]"
          />
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="size-20 rounded-full bg-primary flex items-center justify-center text-white text-3xl font-bold">
              {initials}
            </div>
            {camError && (
              <p className="text-white/40 text-xs mt-1">Camera unavailable</p>
            )}
            {!cameraOn && !camError && (
              <div className="flex flex-col items-center gap-2 mt-2">
                <VideoOff size={20} className="text-white/30" />
                <p className="text-white/40 text-sm">Camera is off</p>
              </div>
            )}
          </div>
        )}

        {/* Name tag */}
        <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/50 rounded-full px-3 py-1.5">
          {micOn ? <Mic size={12} className="text-green-400" /> : <MicOff size={12} className="text-red-400" />}
          <span className="text-white text-xs font-medium">{profile?.full_name ?? 'You'}</span>
        </div>
      </div>

      {/* Camera unavailable notice */}
      {camError && (
        <div className="flex items-center gap-2 text-amber-400 text-xs">
          <AlertCircle size={13} /> Camera permission denied — you'll join with camera off.
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleMic}
          className={`size-14 rounded-full flex flex-col items-center justify-center gap-1 transition-colors ${micOn ? 'bg-white/15 hover:bg-white/25' : 'bg-red-500 hover:bg-red-600'}`}
        >
          {micOn ? <Mic size={20} className="text-white" /> : <MicOff size={20} className="text-white" />}
          <span className="text-[9px] text-white/60">{micOn ? 'Mute' : 'Unmute'}</span>
        </button>
        <button
          onClick={toggleCamera}
          disabled={camError}
          className={`size-14 rounded-full flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-40 ${cameraOn ? 'bg-white/15 hover:bg-white/25' : 'bg-red-500 hover:bg-red-600'}`}
        >
          {cameraOn ? <Video size={20} className="text-white" /> : <VideoOff size={20} className="text-white" />}
          <span className="text-[9px] text-white/60">{cameraOn ? 'Stop' : 'Start'}</span>
        </button>
      </div>

      {/* Class info */}
      <div className="flex items-center gap-6 text-sm text-white/60">
        <div className="flex items-center gap-2">
          <Users size={14} /> <span>Learnora Live</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock size={14} /> <span>Joining {isTeacher ? 'as host' : 'as student'}</span>
        </div>
      </div>

      {/* Join button */}
      <button
        onClick={joinClass}
        className="h-13 px-10 bg-primary text-white text-base font-bold rounded-pill shadow-primary hover:bg-primary-deep transition-colors"
      >
        {isTeacher ? 'Start Class' : 'Join Class'}
      </button>
    </div>
  )
}
