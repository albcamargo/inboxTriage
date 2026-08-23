import 'dotenv/config';
import fs from 'fs';
import { google } from 'googleapis';

const tokens = JSON.parse(fs.readFileSync('tokens.json', 'utf8'));
const oAuth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
oAuth2Client.setCredentials(tokens);
const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

const LABELS = ['InboxTriage/Ahora', 'InboxTriage/Despues', 'InboxTriage/NoResponder'];

async function ensureLabels() {
  const { data } = await gmail.users.labels.list({ userId: 'me' });
  const existing = data.labels.map(l => l.name);
  for (const name of LABELS) {
    if (!existing.includes(name)) {
      await gmail.users.labels.create({ userId: 'me', requestBody: { name, labelListVisibility: 'labelShow', messageListVisibility: 'show' } });
      console.log(`[Gmail] Label creada: ${name}`);
    } else {
      console.log(`[Gmail] Label existe: ${name}`);
    }
  }
  console.log('[Gmail] 3 labels OK - Scope 2 VERDE');
}
ensureLabels().catch(e => { console.error(e.message); process.exit(1); });