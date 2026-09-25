import express, { Request, Response } from 'express';
import { createServer } from 'http';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
dotenv.config();

import logger from './utils/logger';
import { initSocket } from './socket';

// Route modules
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import meetingsRouter from './routes/meetings';
import calendarRouter from './routes/calendar';
import notificationRouter from './routes/notification';

// Fail fast if critical env vars are missing
if (!process.env.MONGO_URI) {
  throw new Error('FATAL: MONGO_URI environment variable is not set.');
}

const app = express();
const httpServer = createServer(app); // Wrap Express in a raw http.Server for Socket.io
const PORT = process.env.PORT || 5000;

const CORS_ORIGINS = ['https://smartschedulerr.netlify.app', 'http://localhost:5173'];

// --- Security Headers (helmet) ---
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// --- CORS ---
app.use(cors({
  origin: CORS_ORIGINS,
  credentials: true,
  exposedHeaders: ['Authorization'],
}));

app.use(express.json());

// --- Rate Limiting ---
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts, please try again in 15 minutes.' },
});

app.use('/api', generalLimiter);
app.use('/api/login', authLimiter);
app.use('/api/register', authLimiter);

// --- Database ---
mongoose.connect(process.env.MONGO_URI, {})
  .then(() => logger.info('MongoDB connected'))
  .catch((err) => logger.error({ err }, 'MongoDB connection error'));

// --- Socket.io ---
// Must be initialised before routes so getIO() works inside route handlers
initSocket(httpServer, CORS_ORIGINS);

// --- Routes ---
app.get('/', (req: Request, res: Response) => res.send('API is running'));

app.use('/api', authRouter);
app.use('/api', usersRouter);
app.use('/api', meetingsRouter);
app.use('/api', calendarRouter);
app.use('/api', notificationRouter);

// --- Start ---
// Use httpServer.listen (not app.listen) so WebSocket upgrades work
httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
