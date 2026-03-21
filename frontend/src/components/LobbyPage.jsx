import { useState } from 'react'

const generateRoomId = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase()

export default function LobbyPage({ onJoin }) {
  const [name, setName] = useState('')
  const [room, setRoom] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) return setError('Please enter your name.')
    if (!room.trim()) return setError('Please enter or generate a room ID.')
    setError('')
    onJoin({ roomId: room.trim().toUpperCase(), userName: name.trim() })
  }

  return (
    <div className="min-h-screen min-h-dvh flex items-center justify-center p-4 pt-safe pb-safe">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-surface-elevated/60 rounded-full blur-3xl" />
      </div>

      <div className="glass rounded-2xl p-5 sm:p-8 w-full max-w-md relative z-10 shadow-2xl overflow-hidden">
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="text-2xl sm:text-3xl">🎥</span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Vibe<span className="text-accent">Meet</span>
            </h1>
          </div>
          <p className="text-white/50 text-sm">Crystal-clear video, zero friction.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">
              Your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your display name"
              autoComplete="name"
              autoCapitalize="words"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3
                         text-white placeholder-white/30 focus:outline-none focus:ring-2
                         focus:ring-accent/50 focus:border-accent/50 transition
                         text-base"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-1.5">
              Room ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value.toUpperCase())}
                placeholder="XXXXXX"
                maxLength={8}
                autoComplete="off"
                autoCapitalize="characters"
                className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-xl px-4 py-3
                           text-white placeholder-white/30 font-mono tracking-widest
                           focus:outline-none focus:ring-2 focus:ring-accent/50
                           focus:border-accent/50 transition text-base"
              />
              <button
                type="button"
                onClick={() => setRoom(generateRoomId())}
                className="glass rounded-xl px-3 py-3 text-sm text-white/70
                           hover:text-white hover:bg-white/10 transition whitespace-nowrap"
              >
                Generate
              </button>
            </div>
          </div>

          {error && (
            <p className="text-accent text-sm">{error}</p>
          )}

          <button type="submit" className="btn-primary w-full py-3 mt-2 text-base">
            Join Room →
          </button>
        </form>
      </div>
    </div>
  )
}
