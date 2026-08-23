import 'dotenv/config';
import fs from 'fs';
import { google } from 'googleapis';

const tokens = JSON.parse(fs.readFileSync('tokens.json', 'utf8'));
const oAuth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
oAuth2Client.setCredentials(tokens);
const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

const { data } = await gmail.users.messages.list({ userId: 'me', maxResults: 5, q: 'in:inbox' });
console.log(`[Gmail] ${data.messages?.length||0} mensajes:`);
for (const m of data.messages||[]) {
  const msg = await gmail.users.messages.get({ userId: 'me', id: m.id, format: 'metadata', metadataHeaders: ['Subject','From'] });
  const subj = msg.data.payload.headers.find(h=>h.name==='Subject')?.value;
  console.log(` - ${m.id} ${subj?.slice(0,80)}`);
}