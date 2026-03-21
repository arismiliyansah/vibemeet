# VibeMeet

A modern real-time video conference application with virtual backgrounds and beauty filters.

## Features

- **Real-time Video Calls** - Peer-to-peer video communication powered by WebRTC
- **Virtual Backgrounds** - Blur your background or replace it with any image
- **Beauty Filters** - Touch up your appearance with built-in beauty effects
- **Screen Sharing** - Share your screen with meeting participants
- **Audio/Video Controls** - Mute/unmute microphone and toggle camera on/off
- **Responsive Design** - Works seamlessly on both mobile and desktop

## Tech Stack

**Frontend**
- React 18
- Vite
- Tailwind CSS
- Socket.io Client
- MediaPipe Tasks Vision (for virtual backgrounds)

**Backend**
- Node.js
- Express
- Socket.io (WebSocket server)

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

1. Clone the repository
2. Install all dependencies:

```bash
npm run install:all
```

### Running the Application

Start both frontend and backend in development mode:

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

### Running Separately

**Frontend:**
```bash
cd frontend
npm run dev
```

**Backend:**
```bash
cd backend
npm run dev
```

## How to Use

1. Enter your display name
2. Generate a room ID or enter an existing one
3. Click "Join Room" to enter the meeting
4. Share the room ID with others to invite them

## Building for Production

```bash
npm run build:deploy
```

This will build the frontend and prepare it for deployment.

## Environment Variables

Create a `.env` file in the backend directory:

```env
PORT=3001
CORS_ORIGIN=https://your-domain.com
```

## License

MIT
