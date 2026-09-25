import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import logger from '../utils/logger';

export const SCOPES = ['https://www.googleapis.com/auth/calendar'];
export const CREDENTIALS_PATH = process.env.GOOGLE_CREDENTIALS_PATH || path.join(__dirname, '../credentials.json');
export const TOKEN_PATH = path.join(__dirname, '../token.json');

/**
 * Build and return an authenticated OAuth2 client.
 * Loads credentials from CREDENTIALS_PATH and, if present, a saved token.
 */
export function getOAuth2Client() {
  // On cloud hosts like Render, files can't be committed — write them from env vars if needed
  if (!fs.existsSync(CREDENTIALS_PATH) && process.env.GOOGLE_CREDENTIALS_JSON) {
    fs.writeFileSync(CREDENTIALS_PATH, process.env.GOOGLE_CREDENTIALS_JSON);
  }
  if (!fs.existsSync(TOKEN_PATH) && process.env.GOOGLE_TOKEN_JSON) {
    fs.writeFileSync(TOKEN_PATH, process.env.GOOGLE_TOKEN_JSON);
  }

  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error('Google credentials file not found. Please add credentials.json to the server directory.');
  }

  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf-8'));
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  if (fs.existsSync(TOKEN_PATH)) {
    try {
      const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
      oAuth2Client.setCredentials(token);
    } catch (error) {
      logger.error({ err: error }, 'Error loading OAuth token, removing invalid token file');
      if (fs.existsSync(TOKEN_PATH)) fs.unlinkSync(TOKEN_PATH);
    }
  }

  return oAuth2Client;
}

/**
 * Generate a Google OAuth2 authorization URL.
 * @returns {string} authUrl
 */
export function getAuthUrl(): string {
  const oAuth2Client = getOAuth2Client();
  return oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });
}

/**
 * Exchange an auth code for tokens and persist them.
 * @param {string} code - The OAuth2 authorization code from the callback
 */
export async function exchangeCodeForTokens(code: string) {
  const oAuth2Client = getOAuth2Client();
  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
  return tokens;
}

/**
 * Check the current OAuth authorization status.
 */
export async function getOAuthStatus(): Promise<{ status: string; message: string }> {
  const hasCredentials = fs.existsSync(CREDENTIALS_PATH);
  if (!hasCredentials) return { status: 'no_credentials', message: 'Google Calendar credentials not configured' };

  const hasToken = fs.existsSync(TOKEN_PATH);
  if (!hasToken) return { status: 'no_token', message: 'Google Calendar not authorized' };

  try {
    const oAuth2Client = getOAuth2Client();
    await oAuth2Client.getAccessToken();
    return { status: 'authorized', message: 'Google Calendar authorized and ready' };
  } catch {
    if (fs.existsSync(TOKEN_PATH)) fs.unlinkSync(TOKEN_PATH);
    return { status: 'invalid_token', message: 'Google Calendar token expired or invalid' };
  }
}

interface ICalendarEventData {
  title: string;
  description?: string;
  start: Date | string;
  end: Date | string;
  attendees: { email: string; name?: string }[];
}

/**
 * Create a Google Calendar event with a Google Meet link.
 */
export async function createCalendarEvent({ title, description, start, end, attendees }: ICalendarEventData) {
  const oAuth2Client = getOAuth2Client();
  const calendar = google.calendar({ version: 'v3', auth: oAuth2Client });

  const event = {
    summary: title,
    description: description || '',
    start: { dateTime: new Date(start).toISOString() },
    end: { dateTime: new Date(end).toISOString() },
    attendees: attendees.map(a => ({ email: a.email, displayName: a.name })),
    conferenceData: {
      createRequest: {
        requestId: Math.random().toString(36).substring(2),
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
  };

  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
    conferenceDataVersion: 1,
    sendUpdates: 'all',
  });

  const meetLink = response.data.conferenceData?.entryPoints?.find(
    (e: any) => e.entryPointType === 'video'
  )?.uri;

  return { meetLink, eventData: response.data };
}
