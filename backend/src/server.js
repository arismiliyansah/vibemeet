import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

const PUBLIC_DIR = join(__dirname, '../public')

const PORT = process.env.PORT || 3001

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
  : null

const corsOptions = {
  origin: allowedOrigins
    ? (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
        console.warn(`[CORS] blocked: ${origin}`)
        cb(new Error(`CORS blocked: ${origin}`))
      }
    : true,
  credentials: true,
}

const app = express()
app.use(cors(corsOptions))
app.use(express.json())

const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: { ...corsOptions, methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['polling', 'websocket'],
})

const rooms = new Map()

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', rooms: rooms.size })
})

if (existsSync(PUBLIC_DIR)) {
  app.use(express.static(PUBLIC_DIR))

  app.get('*', (_req, res) => {
    res.sendFile(join(PUBLIC_DIR, 'index.html'))
  })
} else {
  app.get('/', (_req, res) => res.send('VibeMeet backend running. No frontend build found.'))
}

io.on('connection', (socket) => {
  console.log(`[+] connected  ${socket.id}`)

  socket.on('join-room', ({ roomId, userName }) => {
    socket.data.roomId = roomId
    socket.data.userName = userName

    if (!rooms.has(roomId)) rooms.set(roomId, new Set())
    const room = rooms.get(roomId)

    const existingPeers = [...room].map((id) => ({
      socketId: id,
      userName: io.sockets.sockets.get(id)?.data.userName ?? 'Unknown',
    }))

    socket.emit('room-joined', { roomId, peers: existingPeers })

    room.forEach((peerId) => {
      io.to(peerId).emit('peer-joined', {
        socketId: socket.id,
        userName,
      })
    })

    room.add(socket.id)
    socket.join(roomId)

    console.log(`[room:${roomId}] ${userName} joined (${room.size} peers)`)
  })

  socket.on('offer', ({ to, offer }) => {
    io.to(to).emit('offer', { from: socket.id, offer, userName: socket.data.userName })
  })

  socket.on('answer', ({ to, answer }) => {
    io.to(to).emit('answer', { from: socket.id, answer, userName: socket.data.userName })
  })

  socket.on('ice-candidate', ({ to, candidate }) => {
    io.to(to).emit('ice-candidate', { from: socket.id, candidate })
  })

  socket.on('disconnect', () => {
    const { roomId, userName } = socket.data
    if (roomId && rooms.has(roomId)) {
      const room = rooms.get(roomId)
      room.delete(socket.id)
      if (room.size === 0) rooms.delete(roomId)

      socket.to(roomId).emit('peer-left', { socketId: socket.id })
      console.log(`[-] disconnected  ${socket.id}  (room:${roomId})`)
    } else {
      console.log(`[-] disconnected  ${socket.id}`)
    }
  })
})

httpServer.listen(PORT, () => {
  console.log(`✅  VibeMeet signaling server → http://localhost:${PORT}`)
  console.log(`    Health: http://localhost:${PORT}/health`)
})
