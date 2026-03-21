import { useEffect, useRef } from 'react'

export default function VideoTile({ stream, label, isLocal = false, isVideoOff = false, className = '' }) {
  const videoRef = useRef(null)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    el.srcObject = stream ?? null
  }, [stream])

  const initial = label?.charAt(0)?.toUpperCase() ?? '?'
  const showVideo = stream && !isVideoOff

  return (
    <div className={`relative rounded-2xl overflow-hidden bg-surface-card flex items-center justify-center ${className}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={[
          'w-full h-full object-cover',
          isLocal ? '-scale-x-100' : '',
          showVideo ? 'block' : 'hidden',
        ].join(' ')}
      />

      {!showVideo && (
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-full bg-surface-elevated flex items-center justify-center
                          text-3xl font-bold text-white/60 ring-2 ring-white/10">
            {initial}
          </div>
          {isLocal && isVideoOff && (
            <span className="text-xs text-white/40">Camera off</span>
          )}
        </div>
      )}

      <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
        <span className="glass rounded-lg px-2.5 py-1 text-xs font-medium text-white/90">
          {label}{isLocal ? ' (You)' : ''}
        </span>
      </div>

      {!isLocal && stream && (
        <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.8)]" />
      )}
    </div>
  )
}
