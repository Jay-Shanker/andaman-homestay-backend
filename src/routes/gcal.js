import { Router } from 'express';
import { prisma } from '../utils/db.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { google } from 'googleapis';
const router = Router();
function getOAuth2Client() {
  return new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
}
router.get('/auth', (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID) return res.status(400).json({ error: 'Google OAuth not configured' });
  const url = getOAuth2Client().generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: ['https://www.googleapis.com/auth/calendar'] });
  res.redirect(url);
});
router.get('/callback', asyncHandler(async (req, res) => {
  const { code, error } = req.query;
  if (error) return res.status(400).send('OAuth error: ' + error);
  if (!code) return res.status(400).send('No code provided');
  const { tokens } = await getOAuth2Client().getToken(code);
  await prisma.gCalToken.upsert({ where: { id: 'default' }, create: { id: 'default', accessToken: tokens.access_token, refreshToken: tokens.refresh_token, expiresAt: new Date(tokens.expiry_date), scope: tokens.scope }, update: { accessToken: tokens.access_token, expiresAt: new Date(tokens.expiry_date) } });
  res.send('<html><body style="font-family:sans-serif;text-align:center;padding:50px"><h2>Google Calendar Connected!</h2><p>You can close this window.</p></body></html>');
}));
router.get('/status', asyncHandler(async (req, res) => {
  const token = await prisma.gCalToken.findUnique({ where: { id: 'default' } });
  res.json({ connected: !!token, expiresAt: token?.expiresAt, authUrl: token ? null : '/api/gcal/auth' });
}));
export default router;