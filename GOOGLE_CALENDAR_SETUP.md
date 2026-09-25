# Google Calendar Integration Setup Guide

## Prerequisites
- Google account
- Google Cloud Console access

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

## Step 2: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Desktop application" as the application type
4. Give it a name (e.g., "Scheduling App")
5. Click "Create"
6. Download the JSON file

## Step 3: Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type
3. Fill in the required information:
   - App name: "Scheduling App"
   - User support email: Your email
   - Developer contact information: Your email
4. Add scopes:
   - `https://www.googleapis.com/auth/calendar`
5. Add test users (your email addresses)
6. Save and continue

## Step 4: Set Up Credentials File

1. Rename the downloaded JSON file to `credentials.json`
2. Place it in the `server/` directory
3. The file should look like this:
```json
{
  "installed": {
    "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
    "project_id": "your-project-id",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_secret": "YOUR_CLIENT_SECRET",
    "redirect_uris": ["http://localhost:5000/oauth2callback"]
  }
}
```

## Step 5: Update Redirect URIs

1. Go back to "APIs & Services" > "Credentials"
2. Edit your OAuth 2.0 Client ID
3. Add these redirect URIs:
   - `http://localhost:5000/oauth2callback`
   - `http://localhost:3000/oauth2callback` (if using different port)

## Step 6: Test the Integration

1. Start your server: `node index.js`
2. Try to schedule a meeting
3. You'll be redirected to Google OAuth consent screen
4. Authorize the application
5. The meeting should be created in your Google Calendar

## Troubleshooting

### Common Issues:

1. **"invalid_grant" error**: 
   - Delete the `token.json` file in the server directory
   - Re-authorize the application

2. **"credentials file not found"**:
   - Make sure `credentials.json` is in the `server/` directory
   - Check file permissions

3. **"redirect_uri_mismatch"**:
   - Update redirect URIs in Google Cloud Console
   - Make sure they match exactly

4. **"access_denied"**:
   - Add your email to test users in OAuth consent screen
   - Make sure you're using a test user account

### File Structure:
```
server/
├── credentials.json    # Google API credentials
├── token.json         # OAuth tokens (auto-generated)
├── index.js
└── routes/
    └── auth.js
```

## Security Notes

- Never commit `credentials.json` or `token.json` to version control
- Add them to `.gitignore`
- Keep your client secret secure
- Use environment variables for production

## Production Deployment

For production, you'll need to:
1. Update redirect URIs to your production domain
2. Publish your OAuth consent screen
3. Use environment variables for sensitive data
4. Set up proper SSL certificates 