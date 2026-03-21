import { useEffect, useRef } from 'react'
import { BEAUTY_LABELS } from '../hooks/useVirtualBackground'

const BASE = 'https://images.unsplash.com'

function unsplash(id, label) {
  return {
    id,
    label,
    src: `${BASE}/photo-${id}?w=1280&h=720&fit=crop&auto=format`,
    thumb: `${BASE}/photo-${id}?w=160&h=90&fit=crop&auto=format`,
  }
}

export const BG_PRESETS = [
  unsplash('1497366216548-37526070297c', 'Office'),
  unsplash('1568667256549-094345857637', 'Library'),
  unsplash('1448375240586-882707db888b', 'Forest'),
  unsplash('1477959858617-67f85cf4f1df', 'City'),
  unsplash('1557683316-973673baf926', 'Gradient'),
  unsplash('1465146344425-f00d5f5c8f07', 'Mountains'),
  unsplash('1507525428034-b723cf961d3e', 'Beach'),
  unsplash('1534796636912-3b95b3ab5986', 'Space'),
]

export default function BackgroundPanel({
  bgMode, beautyLevel, isVBReady, activeSrc, onSelect, onSetBeauty, onClose,
}) {
  const panelRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose()
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [onClose])

  const isSelected = (mode, src = null) =>
    bgMode === mode && (mode !== 'image' || activeSrc === src)

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40 sm:hidden"
        onPointerDown={(e) => { e.stopPropagation(); onClose() }}
      />

      <div
        ref={panelRef}
        className={[
          'fixed bottom-0 left-0 right-0 z-50',
          'rounded-t-2xl max-h-[75vh] overflow-y-auto scrollbar-none',
          'sm:absolute sm:bottom-full sm:left-1/2 sm:-translate-x-1/2',
          'sm:right-auto sm:rounded-2xl sm:w-80 sm:max-h-none sm:overflow-visible sm:mb-3',
          'glass p-4 shadow-2xl',
          'animate-in fade-in slide-in-from-bottom-2 duration-150',
        ].join(' ')}
      >
        <div className="flex justify-center mb-3 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white/80">Virtual Background</h3>
          {!isVBReady && (
            <span className="text-xs text-yellow-400 animate-pulse">Loading model…</span>
          )}
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <OptionTile
            label="None"
            selected={isSelected('none')}
            onClick={() => onSelect('none')}
          >
            <div className="w-full h-full bg-surface-elevated flex items-center justify-center">
              <svg className="w-6 h-6 text-white/40" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="8" r="4"/>
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
            </div>
          </OptionTile>

          <OptionTile
            label="Blur"
            selected={isSelected('blur')}
            disabled={!isVBReady}
            onClick={() => isVBReady && onSelect('blur')}
          >
            <div className="w-full h-full bg-gradient-to-br from-surface-elevated to-surface-card
                            flex items-center justify-center overflow-hidden">
              <div className="w-10 h-10 rounded-full bg-white/20 blur-sm" />
              <div className="absolute inset-0 backdrop-blur-sm" />
              <svg className="w-5 h-5 text-white/60 relative z-10" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 2v2m0 16v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42
                         M2 12h2m16 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
            </div>
          </OptionTile>

          {BG_PRESETS.map((preset) => (
            <OptionTile
              key={preset.id}
              label={preset.label}
              selected={isSelected('image', preset.src)}
              disabled={!isVBReady}
              onClick={() => isVBReady && onSelect('image', preset.src)}
            >
              <img
                src={preset.thumb}
                alt={preset.label}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </OptionTile>
          ))}
        </div>

        {!isVBReady && (
          <p className="text-center text-xs text-white/30 mt-3">
            AI segmentation model is loading…
          </p>
        )}

        <div className="mt-4 pt-3 border-t border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-white/70">Touch Up</span>
            <span className="text-xs text-white/30">{BEAUTY_LABELS[beautyLevel]}</span>
          </div>
          <div className="flex gap-1.5">
            {BEAUTY_LABELS.map((label, level) => (
              <button
                key={level}
                onClick={() => onSetBeauty(level)}
                className={[
                  'flex-1 py-1.5 rounded-lg text-xs font-medium transition-all',
                  beautyLevel === level
                    ? 'bg-pink-500/80 text-white ring-1 ring-pink-400/50'
                    : 'glass text-white/60 hover:text-white hover:bg-white/10',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-white/25 mt-2 text-center">
            Adjusts brightness, contrast & warmth
          </p>
        </div>

        <div className="pb-safe sm:pb-0" />
      </div>
    </>
  )
}

function OptionTile({ label, selected, disabled, onClick, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        'relative rounded-xl overflow-hidden aspect-video text-xs font-medium',
        'transition-all duration-150 focus:outline-none',
        selected
          ? 'ring-2 ring-accent shadow-[0_0_12px_rgba(233,69,96,0.4)]'
          : 'ring-1 ring-white/10 hover:ring-white/30',
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}
    >
      {children}

      <div className="absolute inset-x-0 bottom-0 py-0.5 px-1
                      bg-black/50 text-white/80 text-[10px] text-center truncate">
        {label}
      </div>

      {selected && (
        <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-accent
                        flex items-center justify-center shadow">
          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none"
               stroke="currentColor" strokeWidth="2">
            <path d="M2 5l2.5 2.5L8 3"/>
          </svg>
        </div>
      )}
    </button>
  )
}
