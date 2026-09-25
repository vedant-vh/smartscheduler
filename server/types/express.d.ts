/**
 * types/express.d.ts
 * Augments the Express Request interface to include the `user` field
 * set by authMiddleware after a successful JWT verification.
 */
export {};

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        iat?: number;
        exp?: number;
      };
    }
  }
}
