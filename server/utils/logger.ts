import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
    // Redact sensitive fields so they never appear in log output
    redact: {
      paths: ['req.headers.authorization', 'body.password', 'body.token'],
      censor: '[REDACTED]',
    },
  },
  isDev
    ? pino.transport({ target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } })
    : pino.destination(1) // fast async stdout in production
);

export default logger;
