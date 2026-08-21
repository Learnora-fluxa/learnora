import { useState } from 'react'
import { Monitor, MonitorOff, Users, Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useAuth, profileToSidebarUser } from '../contexts/AuthContext'

type Props = { onNavigate: (page: string) => void }

export default function ScreenSharePage({ onNavigate }: Props) {
  const { profile } = useAuth()
  const sidebarUser = profileToSidebarUser(profile)

  const [sharing, setSharing]   = useState(false)
  const [micOn,   setMicOn]     = useState(true)
  const [camOn,   setCamOn]     = useState(false)
  const [viewers, setViewers]   = useState(18)

  function toggleShare() {
    setSharing(!sharing)
    if (!sharing) setViewers(18)
  }

  return (
    <DashboardLayout
      activePage="live-classes"
      onNavigate={onNavigate}
      title="Screen Share"
      subtitle="Share your screen with the class"
      user={sidebarUser}
    >
      <div className="max-w-[860px] flex flex-col gap-5">

        {/* Main screen share area */}
        <div className="bg-[#0f172a] rounded-card overflow-hidden aspect-video relative flex items-center justify-center">
          {sharing ? (
            <>
              <div className="text-center text-white">
                <Monitor size={48} className="mx-auto mb-3 opacity-60" />
                <p className="text-sm font-semibold opacity-80">Screen sharing active</p>
                <p className="text-xs opacity-50 mt-1">Your entire screen is visible to participants</p>
              </div>
              {/* Live badge */}
              <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                <span className="size-1.5 rounded-full bg-white animate-pulse" /> LIVE
              </div>
              {/* Viewer count */}
              <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-black/50 text-white text-xs px-2.5 py-1.5 rounded-full">
                <Users size={12} /> {viewers} viewing
              </div>
            </>
          ) : (
            <div className="text-center text-white opacity-50">
              <MonitorOff size={48} className="mx-auto mb-3" />
              <p className="text-sm font-semibold">Screen share not active</p>
              <p className="text-xs mt-1">Click "Share screen" to begin</p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="bg-surface rounded-card shadow-sm p-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={() => setMicOn(!micOn)}
              className={`size-10 rounded-full flex items-center justify-center transition-colors ${micOn ? 'bg-canvas text-muted hover:bg-black/10' : 'bg-red-500 text-white'}`}>
              {micOn ? <Mic size={16} /> : <MicOff size={16} />}
            </button>
            <button onClick={() => setCamOn(!camOn)}
              className={`size-10 rounded-full flex items-center justify-center transition-colors ${camOn ? 'bg-canvas text-muted hover:bg-black/10' : 'bg-red-500 text-white'}`}>
              {camOn ? <Video size={16} /> : <VideoOff size={16} />}
            </button>
          </div>

          <button onClick={toggleShare}
            className={`flex items-center gap-2 h-11 px-6 rounded-pill text-sm font-bold transition-colors ${
              sharing
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-primary text-white hover:bg-primary-deep shadow-primary'
            }`}
          >
            {sharing ? <><MonitorOff size={16} /> Stop sharing</> : <><Monitor size={16} /> Share screen</>}
          </button>

          <button onClick={() => onNavigate('live-classroom')}
            className="size-10 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors">
            <PhoneOff size={16} />
          </button>
        </div>

        {/* Info */}
        {sharing && (
          <div className="bg-amber-50 border border-amber-200 rounded-card p-4 text-xs text-amber-800">
            <strong>Tip:</strong> Participants can see everything on your screen, including notifications. Consider enabling Do Not Disturb before sharing.
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
