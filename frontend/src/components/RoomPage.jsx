import { useRef } from 'react'
import { useWebRTC } from '../hooks/useWebRTC'
import VideoTile from './VideoTile'
import ControlBar from './ControlBar'

export default function RoomPage({ roomId, userName, onLeave }) {
  const activeBgSrcRef = useRef(null)

  const {
    localStream,
    remoteStreams,
    isAudioMuted,
    isVideoOff,
    isScreenSharing,
    bgMode,
    beautyLevel,
    isVBReady,
    isConnecting,
    connectionStatus,
    error,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    setBackground,
    setBeautyLevel,
    leaveRoom,
  } = useWebRTC({ roomId, userName })

  const handleLeave = () => { leaveRoom(); onLeave() }

  const handleSetBackground = (mode, src = null) => {
    activeBgSrcRef.current = mode === 'image' ? src : null
    setBackground(mode, src)
  }

  const remotePeers = [...remoteStreams.entries()]

  const gridClass =
    remotePeers.length === 0 ? '' :
    remotePeers.length === 1 ? 'grid-cols-1' :
    remotePeers.length <= 3  ? 'grid-cols-1 sm:grid-cols-2' :
                                'grid-cols-2 sm:grid-cols-3'

  if (error) {
    return (
      <div className="min-h-screen min-h-dvh flex items-center justify-center p-4 pt-safe pb-safe">
        <div className="glass rounded-2xl p-6 sm:p-8 text-center max-w-sm w-full">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-white/70 text-sm mb-6">{error}</p>
          <button onClick={onLeave} className="btn-primary w-full">← Back</button>
        </div>
      </div>
    )
  }

  const localLabel = isScreenSharing ? `${userName} (screen)` : userName
  const effectActive = bgMode !== 'none' || beautyLevel > 0

  return (
    <div className="flex flex-col h-screen h-dvh overflow-hidden">

      <header className="flex items-center justify-between px-3 sm:px-5 py-2 sm:py-3
                         glass border-b border-white/5 pt-safe shrink-0">
        <span className="font-bold text-base sm:text-lg tracking-tight">
          Vibe<span className="text-accent">Meet</span>
        </span>

        <div className="flex items-center gap-2 sm:gap-3 min-w-0">

          {connectionStatus === 'connecting' && (
            <span className="text-xs text-white/40 animate-pulse hidden sm:inline">Connecting…</span>
          )}
          {connectionStatus === 'reconnecting' && (
            <span className="text-xs text-yellow-400 animate-pulse">⟳ Reconnecting…</span>
          )}
          {connectionStatus === 'failed' && (
            <span className="text-xs text-red-400 font-medium">✕ Failed</span>
          )}

          {effectActive && !isScreenSharing && (
            <span className="hidden sm:inline text-xs text-purple-400 font-medium truncate">
              ✦ {bgMode === 'blur' ? 'Blur' : bgMode === 'image' ? 'BG' : ''}
              {beautyLevel > 0 && bgMode !== 'none' ? ' · ' : ''}
              {beautyLevel > 0 ? 'Touch Up' : ''}
            </span>
          )}

          {isScreenSharing && (
            <span className="text-xs text-blue-400 font-medium animate-pulse">● Sharing</span>
          )}

          <span className="glass text-xs px-2 sm:px-3 py-1 rounded-full text-white/60 font-mono
                           tracking-widest shrink-0">
            {roomId}
          </span>

          <span className="text-xs text-white/40 shrink-0 hidden xs:inline">
            {1 + remotePeers.length}
            <span className="hidden sm:inline"> participant{remotePeers.length !== 0 ? 's' : ''}</span>
          </span>
        </div>
      </header>

      <main className="flex-1 overflow-hidden p-2 sm:p-4 relative min-h-0">
        {remotePeers.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 sm:gap-4">
            <VideoTile
              stream={localStream}
              label={userName}
              isLocal={!isScreenSharing}
              isVideoOff={isVideoOff && !isScreenSharing && bgMode === 'none'}
              className="w-full sm:max-w-2xl sm:aspect-video"
              style={{ height: 'min(100%, calc(100vw * 9 / 16))' }}
            />
            <p className="text-white/30 text-sm animate-pulse text-center px-4">
              Share room ID <span className="font-mono text-white/50">{roomId}</span> to invite others
            </p>
          </div>
        ) : (
          <div className={`grid ${gridClass} gap-2 sm:gap-3 h-full`}>
            {remotePeers.map(([socketId, { stream, userName: peerName }]) => (
              <VideoTile
                key={socketId}
                stream={stream}
                label={peerName}
                className="h-full min-h-0"
              />
            ))}
          </div>
        )}

        {remotePeers.length > 0 && (
          <div className={[
            'absolute bottom-3 right-3 sm:bottom-6 sm:right-6',
            'aspect-video rounded-xl overflow-hidden shadow-2xl transition-all',
            isScreenSharing
              ? 'w-28 sm:w-56 ring-2 ring-blue-400/60'
              : effectActive
                ? 'w-24 sm:w-48 ring-2 ring-purple-400/50'
                : 'w-24 sm:w-44 ring-2 ring-white/10',
          ].join(' ')}>
            <VideoTile
              stream={localStream}
              label={localLabel}
              isLocal={!isScreenSharing}
              isVideoOff={isVideoOff && !isScreenSharing && bgMode === 'none'}
              className="w-full h-full"
            />
          </div>
        )}
      </main>

      <footer className="glass border-t border-white/5 shrink-0">
        <ControlBar
          isAudioMuted={isAudioMuted}
          isVideoOff={isVideoOff}
          isScreenSharing={isScreenSharing}
          bgMode={bgMode}
          beautyLevel={beautyLevel}
          activeBgSrc={activeBgSrcRef.current}
          isVBReady={isVBReady}
          roomId={roomId}
          onToggleAudio={toggleAudio}
          onToggleVideo={toggleVideo}
          onToggleScreenShare={toggleScreenShare}
          onSetBackground={handleSetBackground}
          onSetBeautyLevel={setBeautyLevel}
          onLeave={handleLeave}
        />
      </footer>
    </div>
  )
}
