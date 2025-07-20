import { Server } from 'socket.io';
let io;
export function initSocket(server){
  io = new Server(server, { path: '/api/socketio' });
  io.on('connection', socket => {
    socket.on('joinRoom', sessionId => socket.join(sessionId));
    socket.on('disconnecting', () => {
      socket.rooms.forEach(room => io.to(room).emit('opponentLeft', socket.id));
    });
  });
  return io;
}
export { io };