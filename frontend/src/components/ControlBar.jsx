import { useState } from 'react'
import BackgroundPanel from './BackgroundPanel'

export default function ControlBar({
  isAudioMuted,
  isVideoOff,
  isScreenSharing,
  bgMode,
  beautyLevel,
  activeBgSrc,
  isVBReady,
  roomId,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onSetBackground,
  onSetBeautyLevel,
  onLeave,
}) {
  const [showBgPanel, setShowBgPanel] = useState(false)

  const handleCopyLink = () => {
    navigator.clipboard.writeText(roomId)
      .then(() => alert(`Room ID "${roomId}" copied!`))
      .catch(() => {})
  }

  const isBgActive = bgMode !== 'none'
  const isBeautyActive = beautyLevel > 0
  const isEffectActive = isBgActive || isBeautyActive

  const supportsScreenShare = !!navigator.mediaDevices?.getDisplayMedia

  return (
    <div className="relative flex items-center justify-center gap-2 sm:gap-3 py-3 sm:py-4 px-3 sm:px-6 pb-safe-3">
      {showBgPanel && (
        <BackgroundPanel
          bgMode={bgMode}
          beautyLevel={beautyLevel}
          isVBReady={isVBReady}
          activeSrc={activeBgSrc}
          onSelect={(mode, src) => { onSetBackground(mode, src); setShowBgPanel(false) }}
          onSetBeauty={onSetBeautyLevel}
          onClose={() => setShowBgPanel(false)}
        />
      )}

      <button
        onClick={handleCopyLink}
        title="Copy Room ID"
        className="hidden sm:flex glass rounded-xl px-4 py-2.5 text-sm text-white/60 hover:text-white
                   hover:bg-white/10 transition font-mono tracking-widest"
      >
        {roomId}
      </button>

      <div className="flex items-center gap-2 sm:gap-2 mx-0 sm:mx-4">
        <ControlButton
          onClick={onToggleAudio}
          active={!isAudioMuted}
          activeLabel="Mute"
          inactiveLabel="Unmute"
          activeIcon={<MicIcon />}
          inactiveIcon={<MicOffIcon />}
        />

        <ControlButton
          onClick={onToggleVideo}
          active={!isVideoOff}
          activeLabel="Stop Video"
          inactiveLabel="Start Video"
          activeIcon={<VideoIcon />}
          inactiveIcon={<VideoOffIcon />}
        />

        {supportsScreenShare && (
          <button
            onClick={onToggleScreenShare}
            title={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
            className={[
              'btn-icon w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center transition-all',
              isScreenSharing
                ? 'bg-blue-500/90 text-white hover:bg-blue-500 ring-2 ring-blue-400/50'
                : 'glass text-white hover:bg-white/15',
            ].join(' ')}
          >
            {isScreenSharing ? <ScreenShareStopIcon /> : <ScreenShareIcon />}
          </button>
        )}

        <button
          onClick={() => setShowBgPanel((v) => !v)}
          disabled={isScreenSharing}
          title={isScreenSharing ? 'Unavailable while sharing screen' : 'Background & Effects'}
          className={[
            'btn-icon w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center transition-all relative',
            isEffectActive
              ? 'bg-purple-500/90 text-white hover:bg-purple-500 ring-2 ring-purple-400/50'
              : showBgPanel
                ? 'glass text-white ring-2 ring-white/30'
                : 'glass text-white hover:bg-white/15',
            isScreenSharing ? 'opacity-40 cursor-not-allowed' : '',
          ].join(' ')}
        >
          {!isVBReady ? <SpinnerIcon /> : <BgIcon />}
          {isBeautyActive && !isBgActive && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-pink-400
                             shadow-[0_0_4px_rgba(244,114,182,0.8)]" />
          )}
        </button>
      </div>

      <button
        onClick={onLeave}
        title="Leave room"
        className="btn-icon bg-accent hover:bg-accent-hover text-white w-12 h-12 sm:w-14 sm:h-14
                   flex items-center justify-center"
      >
        <PhoneOffIcon />
      </button>
    </div>
  )
}

function ControlButton({ onClick, active, activeLabel, inactiveLabel, activeIcon, inactiveIcon }) {
  return (
    <button
      onClick={onClick}
      title={active ? activeLabel : inactiveLabel}
      className={[
        'btn-icon w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center transition-all',
        active ? 'glass text-white hover:bg-white/15' : 'bg-red-500/80 text-white hover:bg-red-500',
      ].join(' ')}
    >
      {active ? activeIcon : inactiveIcon}
    </button>
  )
}

function MicIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/>
    </svg>
  )
}
function MicOffIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="2" y1="2" x2="22" y2="22"/>
      <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5"/>
      <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/>
      <line x1="12" y1="19" x2="12" y2="22"/>
    </svg>
  )
}
function VideoIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
    </svg>
  )
}
function VideoOffIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34"/>
      <path d="M23 7l-7 5 7 5V7z"/><line x1="2" y1="2" x2="22" y2="22"/>
    </svg>
  )
}
function ScreenShareIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 3H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3"/>
      <path d="M8 21h8m-4-4v4"/>
      <polyline points="17 8 21 4 17 0"/><line x1="21" y1="4" x2="9" y2="4"/>
    </svg>
  )
}
function ScreenShareStopIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 3H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3"/>
      <path d="M8 21h8m-4-4v4"/>
      <line x1="18" y1="2" x2="22" y2="6"/><line x1="22" y1="2" x2="18" y2="6"/>
    </svg>
  )
}
function BgIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  )
}
function SpinnerIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 animate-spin" viewBox="0 0 24 24"
         fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>
  )
}
function PhoneOffIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7
               2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07
               A2 2 0 0 1 10.68 13.31z"/>
      <line x1="23" y1="1" x2="1" y2="23"/>
      <path d="M3.17 3.17A19.79 19.79 0 0 0 2 10.5a2 2 0 0 0 2 1.72 12.84 12.84 0 0 0 2.81-.7
               2 2 0 0 1 2.11.45l1.27 1.27"/>
    </svg>
  )
}
