import { useState } from 'react'
import LobbyPage from './components/LobbyPage'
import RoomPage from './components/RoomPage'

export default function App() {
  const [roomId, setRoomId] = useState(null)
  const [userName, setUserName] = useState('')

  const handleJoin = ({ roomId, userName }) => {
    setRoomId(roomId)
    setUserName(userName)
  }

  const handleLeave = () => {
    setRoomId(null)
    setUserName('')
  }

  return (
    <div className="min-h-screen">
      {roomId ? (
        <RoomPage roomId={roomId} userName={userName} onLeave={handleLeave} />
      ) : (
        <LobbyPage onJoin={handleJoin} />
      )}
    </div>
  )
}
