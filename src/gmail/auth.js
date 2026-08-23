import 'dotenv/config';
import fs from 'fs';
import http from 'http';
import { google } from 'googleapis';
import open from 'open';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth2callback';
const SCOPES = ['https://www.googleapis.com/auth/gmail.modify'];

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Falta GOOGLE_CLIENT_ID / SECRET en .env - ver README paso 2');
  process.exit(1);
}

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
const authUrl = oAuth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES, prompt: 'consent' });

console.log('[Gmail] Abriendo browser para OAuth...');
console.log(`[Gmail] URL: ${authUrl}`);

const server = http.createServer(async (req, res) => {
  if (req.url.startsWith('/oauth2callback')) {
    const url = new URL(req.url, 'http://localhost:3000');
    const code = url.searchParams.get('code');
    if (!code) { res.end('No code'); return; }
    const { tokens } = await oAuth2Client.getToken(code);
    fs.writeFileSync('tokens.json', JSON.stringify(tokens, null, 2));
    console.log('[Gmail] tokens.json guardado (gitignoreado, nunca subir a git)');
    res.end('<h1>Auth OK - puedes cerrar esta ventana y volver a terminal</h1>');
    server.close();
  }
});

server.listen(3000, () => {
  console.log('[Gmail] Esperando callback en http://localhost:3000/oauth2callback');
  open(authUrl);
});