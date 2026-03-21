import { useEffect, useRef, useState, useCallback } from 'react'
import socket from '../services/socket'
import { useVirtualBackground } from './useVirtualBackground'

const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
]

if (import.meta.env.VITE_TURN_URL) {
  iceServers.push({
    urls: import.meta.env.VITE_TURN_URL,
    username: import.meta.env.VITE_TURN_USER || '',
    credential: import.meta.env.VITE_TURN_PASS || '',
  })
}

const ICE_SERVERS = { iceServers }

export function useWebRTC({ roomId, userName }) {
  const [cameraStream, setCameraStream] = useState(null)
  const [localStream, setLocalStream] = useState(null)
  const cameraStreamRef = useRef(null)
  const rawStreamRef = useRef(null)
  const audioCtxRef = useRef(null)
  const screenTrackRef = useRef(null)

  const [remoteStreams, setRemoteStreams] = useState(new Map())
  const pcs = useRef(new Map())
  const iceQueue = useRef(new Map())
  const peerNames = useRef(new Map())

  const [isAudioMuted, setIsAudioMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [isConnecting, setIsConnecting] = useState(true)
  const [error, setError] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState('connecting')

  const {
    bgMode,
    beautyLevel,
    isReady: isVBReady,
    setBackground,
    setBeautyLevel,
  } = useVirtualBackground(cameraStream)

  const activeVBStreamRef = useRef(null)

  useEffect(() => {
    return () => {
      rawStreamRef.current?.getTracks().forEach((t) => t.stop())
      audioCtxRef.current?.close()
    }
  }, [])

  const pushRemoteStreams = useCallback(() => {
    const next = new Map()
    pcs.current.forEach((pc, id) => {
      if (pc._stream?.getTracks().length > 0)
        next.set(id, { stream: pc._stream, userName: peerNames.current.get(id) ?? 'Unknown' })
    })
    setRemoteStreams(new Map(next))
  }, [])

  const createPC = useCallback((peerId, peerUserName) => {
    if (pcs.current.has(peerId)) return pcs.current.get(peerId)
    const pc = new RTCPeerConnection(ICE_SERVERS)
    pc._stream = new MediaStream()
    peerNames.current.set(peerId, peerUserName)
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) socket.emit('ice-candidate', { to: peerId, candidate })
    }
    pc.ontrack = ({ track }) => { pc._stream.addTrack(track); pushRemoteStreams() }
    pc.onconnectionstatechange = () => {
      console.debug(`[pc:${peerId}] ${pc.connectionState}`)
      if (pc.connectionState === 'failed') pc.restartIce()
    }
    pcs.current.set(peerId, pc)
    return pc
  }, [pushRemoteStreams])

  const addLocalTracks = useCallback((pc) => {
    const videoTrack = activeVBStreamRef.current?.getVideoTracks()[0]
      ?? cameraStreamRef.current?.getVideoTracks()[0]
    const audioTrack = cameraStreamRef.current?.getAudioTracks()[0]

    ;[videoTrack, audioTrack].filter(Boolean).forEach((track) => {
      if (!pc.getSenders().some((s) => s.track === track))
        pc.addTrack(track, cameraStreamRef.current)
    })
  }, [])

  const flushIceQueue = useCallback(async (peerId) => {
    const queue = iceQueue.current.get(peerId)
    if (!queue?.length) return
    const pc = pcs.current.get(peerId)
    for (const c of queue) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)) }
      catch (e) { console.warn('ICE flush:', e) }
    }
    iceQueue.current.delete(peerId)
  }, [])

  const closePeer = useCallback((peerId) => {
    pcs.current.get(peerId)?.close()
    pcs.current.delete(peerId)
    peerNames.current.delete(peerId)
    iceQueue.current.delete(peerId)
    setRemoteStreams((prev) => { const m = new Map(prev); m.delete(peerId); return m })
  }, [])

  const replaceVideoTrack = useCallback(async (newTrack) => {
    const senders = [...pcs.current.values()]
      .flatMap((pc) => pc.getSenders())
      .filter((s) => s.track?.kind === 'video')
    await Promise.all(senders.map((s) => s.replaceTrack(newTrack)))
  }, [])

  useEffect(() => {
    let cancelled = false

    async function setup() {
      const raw = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 48000,
          channelCount: 1,
        },
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30, max: 60 },
          facingMode: 'user',
          aspectRatio: { ideal: 16 / 9 },
        },
      })

      if (cancelled) { raw.getTracks().forEach((t) => t.stop()); return }

      rawStreamRef.current = raw
      raw.getVideoTracks().forEach((t) => { t.enabled = false })

      let finalStream = raw
      try {
        const ctx = new AudioContext({ sampleRate: 48000 })
        if (ctx.state === 'suspended') await ctx.resume()
        audioCtxRef.current = ctx

        const source = ctx.createMediaStreamSource(raw)

        const hpf = ctx.createBiquadFilter()
        hpf.type = 'highpass'
        hpf.frequency.value = 80
        hpf.Q.value = 0.707

        const presence = ctx.createBiquadFilter()
        presence.type = 'peaking'
        presence.frequency.value = 3000
        presence.gain.value = 3
        presence.Q.value = 1

        const comp = ctx.createDynamicsCompressor()
        comp.threshold.value = -20
        comp.knee.value = 20
        comp.ratio.value = 8
        comp.attack.value = 0.005
        comp.release.value = 0.15

        const gain = ctx.createGain()
        gain.gain.value = 1.2

        const dest = ctx.createMediaStreamDestination()

        source.connect(hpf)
        hpf.connect(presence)
        presence.connect(comp)
        comp.connect(gain)
        gain.connect(dest)

        finalStream = new MediaStream([
          ...raw.getVideoTracks(),
          dest.stream.getAudioTracks()[0],
        ])

        console.log('[audio] Web Audio pipeline active')
      } catch (err) {
        console.warn('[audio] pipeline failed, falling back to raw audio:', err)
      }

      if (cancelled) return

      cameraStreamRef.current = finalStream
      setCameraStream(finalStream)
      setLocalStream(finalStream)
    }

    setup().catch((err) => {
      console.error('getUserMedia:', err)
      setError('Camera/microphone access denied. Please allow permissions and refresh.')
      setIsConnecting(false)
    })

    return () => {
      cancelled = true
      rawStreamRef.current?.getTracks().forEach((t) => t.stop())
      audioCtxRef.current?.close()
      audioCtxRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!cameraStream) return

    socket.connect()

    socket.on('connect', () => {
      setConnectionStatus('connected')
      socket.emit('join-room', { roomId, userName })
      console.log(`[socket] connected — transport: ${socket.io.engine.transport.name}`)
    })

    socket.on('connect_error', (err) => {
      console.error('[socket] connect_error:', err.message)
      setConnectionStatus('failed')
      setIsConnecting(false)
      setError(`Tidak dapat terhubung ke server: ${err.message}. Coba refresh halaman.`)
    })

    socket.on('disconnect', (reason) => {
      console.warn('[socket] disconnected:', reason)
      if (reason !== 'io client disconnect') {
        setConnectionStatus('reconnecting')
      }
    })

    socket.on('reconnect', (attempt) => {
      console.log(`[socket] reconnected after ${attempt} attempt(s)`)
      setConnectionStatus('connected')
      socket.emit('join-room', { roomId, userName })
    })

    socket.on('reconnect_failed', () => {
      setConnectionStatus('failed')
      setIsConnecting(false)
      setError('Koneksi ke server gagal setelah beberapa percobaan. Periksa koneksi internet kamu.')
    })

    socket.on('room-joined', ({ peers }) => {
      setIsConnecting(false)
      console.log(`[room] joined — ${peers.length} existing peer(s)`)
    })

    socket.on('peer-joined', async ({ socketId, userName: peerName }) => {
      const pc = createPC(socketId, peerName)
      addLocalTracks(pc)
      try {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        socket.emit('offer', { to: socketId, offer })
      } catch (e) { console.error('createOffer:', e) }
    })

    socket.on('offer', async ({ from, offer, userName: peerName }) => {
      const pc = createPC(from, peerName)
      addLocalTracks(pc)
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer))
        await flushIceQueue(from)
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        socket.emit('answer', { to: from, answer })
      } catch (e) { console.error('createAnswer:', e) }
    })

    socket.on('answer', async ({ from, answer }) => {
      const pc = pcs.current.get(from)
      if (!pc) return
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer))
        await flushIceQueue(from)
      } catch (e) { console.error('setRemoteDesc:', e) }
    })

    socket.on('ice-candidate', async ({ from, candidate }) => {
      const pc = pcs.current.get(from)
      if (!pc?.remoteDescription) {
        if (!iceQueue.current.has(from)) iceQueue.current.set(from, [])
        iceQueue.current.get(from).push(candidate)
        return
      }
      try { await pc.addIceCandidate(new RTCIceCandidate(candidate)) }
      catch (e) { console.warn('addIceCandidate:', e) }
    })

    socket.on('peer-left', ({ socketId }) => { closePeer(socketId) })

    return () => {
      socket.off('connect')
      socket.off('connect_error')
      socket.off('disconnect')
      socket.off('reconnect')
      socket.off('reconnect_failed')
      socket.off('room-joined')
      socket.off('peer-joined')
      socket.off('offer')
      socket.off('answer')
      socket.off('ice-candidate')
      socket.off('peer-left')
      socket.disconnect()
      pcs.current.forEach((pc) => pc.close())
      pcs.current.clear()
    }
  }, [cameraStream, roomId, userName, createPC, addLocalTracks, flushIceQueue, closePeer])

  const toggleAudio = useCallback(() => {
    const track = cameraStreamRef.current?.getAudioTracks()[0]
    if (!track) return
    track.enabled = !track.enabled
    setIsAudioMuted(!track.enabled)
  }, [])

  const toggleVideo = useCallback(() => {
    const track = cameraStreamRef.current?.getVideoTracks()[0]
    if (!track) return
    track.enabled = !track.enabled
    setIsVideoOff(!track.enabled)
  }, [])

  const stopScreenShare = useCallback(async () => {
    const screenTrack = screenTrackRef.current
    if (!screenTrack) return
    screenTrack.stop()
    screenTrackRef.current = null

    const cameraTrack = cameraStreamRef.current?.getVideoTracks()[0] ?? null
    await replaceVideoTrack(cameraTrack)
    setLocalStream(cameraStreamRef.current)
    setIsScreenSharing(false)
  }, [replaceVideoTrack])

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) { await stopScreenShare(); return }

    let screenStream
    try {
      screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 }, audio: false,
      })
    } catch (e) { console.info('getDisplayMedia cancelled:', e); return }

    const screenTrack = screenStream.getVideoTracks()[0]
    screenTrackRef.current = screenTrack
    await replaceVideoTrack(screenTrack)

    setLocalStream(new MediaStream([
      screenTrack,
      ...(cameraStreamRef.current?.getAudioTracks() ?? []),
    ]))
    setIsScreenSharing(true)
    screenTrack.onended = () => { stopScreenShare() }
  }, [isScreenSharing, replaceVideoTrack, stopScreenShare])

  const syncVBStream = useCallback(async (newStream) => {
    if (newStream && newStream !== activeVBStreamRef.current) {
      activeVBStreamRef.current = newStream
      const track = newStream.getVideoTracks()[0]
      if (track) await replaceVideoTrack(track)
      setLocalStream(newStream)
    } else if (!newStream && activeVBStreamRef.current) {
      activeVBStreamRef.current = null
      const cameraTrack = cameraStreamRef.current?.getVideoTracks()[0] ?? null
      await replaceVideoTrack(cameraTrack)
      setLocalStream(cameraStreamRef.current)
    }
  }, [replaceVideoTrack])

  const handleSetBackground = useCallback(async (mode, imageSrc = null) => {
    if (isScreenSharing) return
    const stream = setBackground(mode, imageSrc)
    await syncVBStream(stream)
  }, [isScreenSharing, setBackground, syncVBStream])

  const handleSetBeautyLevel = useCallback(async (level) => {
    if (isScreenSharing) return
    const stream = setBeautyLevel(level)
    await syncVBStream(stream)
  }, [isScreenSharing, setBeautyLevel, syncVBStream])

  const leaveRoom = useCallback(() => {
    screenTrackRef.current?.stop()
    rawStreamRef.current?.getTracks().forEach((t) => t.stop())
    audioCtxRef.current?.close()
    audioCtxRef.current = null
    socket.disconnect()
    pcs.current.forEach((pc) => pc.close())
    pcs.current.clear()
  }, [])

  return {
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
    setBackground: handleSetBackground,
    setBeautyLevel: handleSetBeautyLevel,
    leaveRoom,
  }
}
