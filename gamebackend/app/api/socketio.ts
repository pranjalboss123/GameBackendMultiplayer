// pages/api/socketio.ts
import { NextApiRequest } from 'next';
import { NextApiResponse } from 'next';
import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
// @ts-ignore
import { getSession, updateScore, completeSession } from '@lib/sessionManager';

export const config = {
  api: {
    bodyParser: false,
  },
};

type NextApiResponseServerIO = NextApiResponse & {
  socket: NetServer & {
    server: NetServer & { io?: SocketIOServer }
  }
};

export default async function ioHandler(
  req: NextApiRequest,
  res: NextApiResponseServerIO
) {
  if (!res.socket.server.io) {
    console.log('🔌 Initializing Socket.io server...');
    const httpServer: NetServer = res.socket.server as any;
    const io = new SocketIOServer(httpServer, {
      path: '/api/socketio',
      cors: { origin: '*' },
    });

    io.on('connection', (socket) => {
      console.log('🟢 Socket connected', socket.id);

      // Join a session room
      socket.on('join-session', async ({ sessionId, playerId }) => {
        socket.join(sessionId);
        console.log(`👤 ${playerId} joined session ${sessionId}`);

        // Emit current session state
        const session = await getSession(sessionId);
        socket.emit('session-state', session);
        socket.to(sessionId).emit('player-joined', { playerId });
      });

      // Player score update
      socket.on('score-update', async ({ sessionId, playerId, delta }) => {
        const updated = await updateScore(sessionId, playerId, delta);
        if (updated) {
          io.to(sessionId).emit('score-update', { playerId, score: updated });
        }
      });

      // Complete match manually
      socket.on('complete-session', async ({ sessionId }) => {
        const result = await completeSession(sessionId);
        if (result) {
          io.to(sessionId).emit('match-ended', result);
        }
      });

      socket.on('disconnecting', () => {
        socket.rooms.forEach((room) => {
          if (room !== socket.id) {
            io.to(room).emit('opponent-disconnected', { id: socket.id });
          }
        });
      });

      // Handle reconnection in client by re-emitting state on new connection
    });

    res.socket.server.io = io;
  }

  res.end();
}