import 'dotenv/config';
import { getGmail } from './client.js';

const gmail = getGmail();

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