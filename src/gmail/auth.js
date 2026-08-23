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
// select_account: Google muestra el selector de cuentas aunque el navegador
// tenga una sola sesion — sin esto, "cambiar de cuenta" reelegiria la misma.
const authUrl = oAuth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES, prompt: 'consent select_account' });

console.log('[Gmail] Abriendo browser para OAuth...');
console.log(`[Gmail] URL: ${authUrl}`);

// El puerto sale del REDIRECT_URI (para clientes Desktop, Google acepta
// cualquier puerto de localhost) — evita chocar con otros servicios locales.
const PORT = Number(new URL(REDIRECT_URI).port) || 80;

const server = http.createServer(async (req, res) => {
  if (req.url.startsWith('/oauth2callback')) {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const code = url.searchParams.get('code');
    if (!code) { res.end('No code'); return; }
    const { tokens } = await oAuth2Client.getToken(code);
    fs.writeFileSync('tokens.json', JSON.stringify(tokens, null, 2));
    console.log('[Gmail] tokens.json guardado (gitignoreado) - Scope 2 VERDE');
    res.end('<h1>Auth OK - puedes cerrar esta ventana y volver a terminal</h1>');
    server.close();
  }
});

server.listen(PORT, () => {
  console.log(`[Gmail] Esperando callback en ${REDIRECT_URI}`);
  open(authUrl);
});