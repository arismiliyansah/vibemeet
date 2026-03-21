import { io } from 'socket.io-client'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || ''

const socket = io(BACKEND_URL, {
  path: '/socket.io',
  transports: ['polling', 'websocket'],
  autoConnect: false,
  timeout: 20000,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
})

export default socket
