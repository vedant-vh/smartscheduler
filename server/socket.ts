/**
 * socket.ts
 * Singleton that holds the Socket.io Server instance.
 * Import `getIO()` in any route to emit events.
 * Import `initSocket()` once from index.ts.
 */
import { Server as HttpServer } from 'http';
import { Server as IOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { Meeting } from './models/Meeting';
import logger from './utils/logger';

let io: IOServer;

export function initSocket(httpServer: HttpServer, corsOrigins: string[]): IOServer {
  io = new IOServer(httpServer, {
    cors: {
      origin: corsOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // --- JWT Authentication Middleware ---
  // Validates the token passed in socket.handshake.auth.token before connection
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('Authentication token missing'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
      // Attach userId to socket for use in the connection handler
      (socket as any).userId = decoded.user?.id ?? decoded.id;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  // --- Connection Handler ---
  io.on('connection', async (socket: Socket) => {
    const userId = (socket as any).userId as string;
    logger.info({ userId, socketId: socket.id }, 'Socket connected');

    try {
      // Find all meetings this user is part of and join their rooms.
      // A room is named  "meeting:<meetingId>"
      // This means when we emit to that room, every participant online sees the event.
      const meetings = await Meeting.find({ $or: [{ host: userId }, { invitees: userId }] })
        .select('_id')
        .lean();

      for (const m of meetings) {
        const room = `meeting:${m._id}`;
        socket.join(room);
      }

      logger.info({ userId, rooms: meetings.length }, 'Socket joined meeting rooms');
    } catch (err) {
      logger.error({ err }, 'Error joining meeting rooms on socket connect');
    }

    // Clients can also join a specific meeting room dynamically
    // (e.g. after a new meeting is created during the session)
    socket.on('join:meeting', (meetingId: string) => {
      socket.join(`meeting:${meetingId}`);
    });

    socket.on('disconnect', (reason) => {
      logger.info({ userId, reason }, 'Socket disconnected');
    });
  });

  logger.info('Socket.io initialized');
  return io;
}

/** Returns the Socket.io instance. Must call initSocket() first. */
export function getIO(): IOServer {
  if (!io) throw new Error('Socket.io has not been initialized. Call initSocket() first.');
  return io;
}
