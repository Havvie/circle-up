// Live chat: each signed-in socket joins a private room named after its user id.
// When a message is saved over HTTP, every participant's room gets it.
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

export function attachRealtime(httpServer, app, { jwtSecret, corsOrigin = '*' }) {
  const io = new Server(httpServer, { cors: { origin: corsOrigin } });
  io.use((socket, next) => {
    try {
      socket.userId = jwt.verify(socket.handshake.auth?.token ?? '', jwtSecret).sub;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });
  io.on('connection', (socket) => socket.join(`user:${socket.userId}`));
  app.on('message', ({ message, participants }) => {
    for (const p of participants) io.to(`user:${p}`).emit('message', message);
  });
  return io;
}
