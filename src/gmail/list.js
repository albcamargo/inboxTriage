import 'dotenv/config';
import { getGmail } from './client.js';

const gmail = getGmail();

const { data } = await gmail.users.messages.list({ userId: 'me', maxResults: 5, q: 'in:inbox' });
console.log(`[Gmail] ${data.messages?.length||0} mensajes:`);
for (const m of data.messages||[]) {
  const msg = await gmail.users.messages.get({ userId: 'me', id: m.id, format: 'metadata', metadataHeaders: ['Subject','From'] });
  const subj = msg.data.payload.headers.find(h=>h.name==='Subject')?.value;
  console.log(` - ${m.id} ${subj?.slice(0,80)}`);
}