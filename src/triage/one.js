import 'dotenv/config';
import fs from 'fs';
import { policy } from '../policy.js';
import { getQvacClient, releaseQvacClient } from '../qvac/client.js';
import { applyTriageLabel, getGmail, getTriageLabelIds } from '../gmail/client.js';

const ctxPath = process.env.CONTEXTO_PATH || './contexto.json';
const logPath = process.env.LOG_PATH || './triage.log';

const args = process.argv;
const idIdx = args.indexOf('--id');
const messageId = idIdx >= 0 ? args[idIdx + 1] : 'fixture-1';

const contexto = JSON.parse(fs.readFileSync(ctxPath, 'utf8'));
let snippet = 'Cierre lista invitados evento jueves - necesitamos confirmacion catering@proveedor-evento.com';
let gmail = null;

try {
  gmail = getGmail();
  const msg = await gmail.users.messages.get({ userId: 'me', id: messageId, format: 'full' });
  const headers = msg.data.payload?.headers || [];
  const from = headers.find((h) => h.name === 'From')?.value || '';
  const subj = headers.find((h) => h.name === 'Subject')?.value || '';
  snippet = `${from} ${subj} ${msg.data.snippet || snippet}`;
} catch {
  /* modo fixture */
}

const qvac = await getQvacClient();
const answers = await qvac.askFourQuestions(snippet, contexto);
const label = policy(answers);

if (gmail && messageId !== 'fixture-1') {
  const labelIds = await getTriageLabelIds(gmail);
  await applyTriageLabel(gmail, messageId, label, labelIds);
}

const entry = {
  messageId,
  answers,
  label_final: label,
  timestamp: new Date().toISOString(),
  modelo: qvac.engineName, // el motor que decidio de verdad (qvac:<modelo> | mock)
};
fs.appendFileSync(logPath, JSON.stringify(entry) + '\n');
console.log(`[Triage ONE] ${messageId} -> ${label}`);
console.log('  Preguntas:', answers);
console.log(`  Log: ${logPath}`);
await releaseQvacClient();
process.exit(0);
