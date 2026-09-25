import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { body } from 'express-validator';
import validate from '../middleware/validate';
import { User, IUser } from '../models/User';
import { sendPasswordResetEmail } from '../services/email';

// Fail fast — never allow the server to start without a JWT secret
if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is not set. Server cannot start.');
}
const JWT_SECRET = process.env.JWT_SECRET;

const router = express.Router();

function generateToken(user: IUser) {
  return jwt.sign(
    { id: user._id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// ─── Register ────────────────────────────────────────────────────────────────
router.post('/register',
  validate([
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ]),
  async (req: Request, res: Response) => {
    try {
      const { name, email, password } = req.body;
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already registered' });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({ name, email, password: hashedPassword });
      await user.save();
      const token = generateToken(user);
      res.status(201).json({
        message: 'User registered successfully',
        token,
        user: { name: user.name, email: user.email, _id: user._id },
      });
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// ─── Login ───────────────────────────────────────────────────────────────────
router.post('/login',
  validate([
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ]),
  async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user) return res.status(400).json({ message: 'Invalid credentials' });
      const isMatch = await bcrypt.compare(password, user.password as string);
      if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
      const token = generateToken(user);
      res.status(200).json({
        message: 'Login successful',
        token,
        user: { name: user.name, email: user.email, _id: user._id },
      });
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// ─── Forgot Password ─────────────────────────────────────────────────────────
// Generates a secure random token, saves a hashed version to DB, and emails
// the plaintext token embedded in a reset link to the user.
router.post('/forgot-password',
  validate([
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  ]),
  async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      const user = await User.findOne({ email });

      // Always return success — never reveal whether an email is registered (anti-enumeration)
      const successMsg = { message: 'If that email is registered, a reset link has been sent.' };

      if (!user) {
        return res.status(200).json(successMsg);
      }

      // Generate a cryptographically secure random token
      const rawToken = crypto.randomBytes(32).toString('hex');
      // Store only the hash so stolen DB data can't be used to reset passwords
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

      user.resetPasswordToken = hashedToken;
      user.resetPasswordExpiry = new Date(Date.now() + 60 * 60 * 1000); // expires in 1 hour
      await user.save();

      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      const resetUrl = `${clientUrl}/reset-password/${rawToken}`;

      await sendPasswordResetEmail(email, resetUrl);

      res.status(200).json(successMsg);
    } catch (err) {
      res.status(500).json({ message: 'Server error. Please try again later.' });
    }
  }
);

// ─── Reset Password ──────────────────────────────────────────────────────────
// Validates the URL token, checks expiry, hashes and saves the new password.
router.post('/reset-password/:token',
  validate([
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ]),
  async (req: Request, res: Response) => {
    try {
      const { token } = req.params as { token: string };
      const { password } = req.body;

      // Hash the incoming token to compare with the stored hash
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpiry: { $gt: new Date() }, // must not be expired
      });

      if (!user) {
        return res.status(400).json({ message: 'Reset link is invalid or has expired.' });
      }

      user.password = await bcrypt.hash(password, 10);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpiry = undefined;
      await user.save();

      res.status(200).json({ message: 'Password reset successful. You can now log in.' });
    } catch (err) {
      res.status(500).json({ message: 'Server error. Please try again later.' });
    }
  }
);

export default router;
