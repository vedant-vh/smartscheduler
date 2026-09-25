import express, { Request, Response } from 'express';
import authMiddleware from '../middleware/authMiddleware';
import logger from '../utils/logger';
import {
  getAuthUrl,
  exchangeCodeForTokens,
  getOAuthStatus,
} from '../services/googleCalendar';

const router = express.Router();

// Check current OAuth authorization status
router.get('/oauth-status', authMiddleware, async (req: Request, res: Response) => {
  try {
    const status = await getOAuthStatus();
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: 'Error checking OAuth status', error: error.message });
  }
});

// Start the Google OAuth2 authorization flow
router.get('/google-auth', (req: Request, res: Response) => {
  try {
    const authUrl = getAuthUrl();
    res.redirect(authUrl);
  } catch (err) {
    res.status(500).send('Google Calendar credentials not configured.');
  }
});

// OAuth2 callback — exchange code for tokens
router.get('/oauth2callback', async (req: Request, res: Response) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).send(`
      <html><body style="font-family:Arial,sans-serif;padding:20px;text-align:center;">
        <h2>Authorization Error</h2>
        <p>No authorization code provided.</p>
        <p>Please try scheduling again from the main application.</p>
      </body></html>
    `);
  }
  try {
    await exchangeCodeForTokens(code as string);
    // Redirect back to the frontend Calendar page
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${clientUrl}/calendar?oauth=success`);
  } catch (err: any) {
    logger.error({ err }, 'OAuth callback error');
    res.status(500).send(`
      <html><body style="font-family:Arial,sans-serif;padding:20px;text-align:center;">
        <h2 style="color:red;">❌ Authorization Failed</h2>
        <p>Error: ${err.message}</p>
        <p>Please try again or contact support.</p>
      </body></html>
    `);
  }
});

export default router;
