import 'dotenv/config';
import fs from 'fs';
import { policy } from '../policy.js';
import { getQvacClient, releaseQvacClient } from '../qvac/client.js';
import { applyTriageLabel, getGmail, getTriageLabelIds } from '../gmail/client.js';

const ctxPath = process.env.CONTEXTO_PATH || './contexto.json';
const logPath = process.env.LOG_PATH || './triage.log';
const batchSize = parseInt(process.env.GMAIL_BATCH_SIZE, 10) || 15;

const args = process.argv;
const limitIdx = args.indexOf('--limit');
const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : batchSize;
const useInbox = args.includes('--inbox');
const forceFixtures = args.includes('--fixtures');

console.log(`[Triage BATCH] Scope 5 - Lote ${limit} - Iniciando...`);

const contexto = JSON.parse(fs.readFileSync(ctxPath, 'utf8'));

function fixtureToMessage(f, i) {
  return {
    id: f.id || `fixture-${i + 1}`,
    text: [f.from, f.subject, f.snippet || f.body].filter(Boolean).join(' '),
  };
}

async function loadMessages() {
  if (forceFixtures) {
    const fix = JSON.parse(fs.readFileSync('fixtures.json', 'utf8'));
    return { messages: fix.slice(0, limit).map(fixtureToMessage), gmail: null };
  }
  try {
    const gmail = getGmail();
    const query = useInbox
      ? 'in:inbox is:unread'
      : 'in:inbox subject:[TRIAGE-DEMO]';
    const { data } = await gmail.users.messages.list({
      userId: 'me',
      maxResults: limit,
      q: query,
    });
    const ids = data.messages || [];
    if (!ids.length) throw new Error(useInbox ? 'inbox vacio' : 'sin correos [TRIAGE-DEMO]');
    const messages = [];
    for (const m of ids) {
      const msg = await gmail.users.messages.get({
        userId: 'me',
        id: m.id,
        format: 'metadata',
        metadataHeaders: ['Subject', 'From'],
      });
      const headers = msg.data.payload?.headers || [];
      const subj = headers.find((h) => h.name === 'Subject')?.value || '';
      const from = headers.find((h) => h.name === 'From')?.value || '';
      messages.push({ id: m.id, text: `${from} ${subj} ${msg.data.snippet || ''}` });
    }
    return { messages, gmail };
  } catch (e) {
    console.log(`[Triage] Sin Gmail usable (${e.message}) - usando fixtures`);
    try {
      const fix = JSON.parse(fs.readFileSync('fixtures.json', 'utf8'));
      return { messages: fix.slice(0, limit).map(fixtureToMessage), gmail: null };
    } catch {
      return {
        messages: [
          { id: 'fixture-1', text: 'Cierre lista invitados evento jueves catering@proveedor-evento.com urgente necesitamos' },
          { id: 'fixture-2', text: 'Comunicado mensual bienestar direccion FYI' },
          { id: 'fixture-3', text: 'Auditorio principal jueves 28 confirmacion produccion@venue.com' },
          { id: 'fixture-4', text: 'Newsletter descuento software' },
          { id: 'fixture-5', text: 'Gracias recibido' },
        ].slice(0, limit),
        gmail: null,
      };
    }
  }
}

const { messages, gmail } = await loadMessages();
const qvac = await getQvacClient();
const labelIds = gmail ? await getTriageLabelIds(gmail) : {};

const stats = { Ahora: 0, Despues: 0, NoResponder: 0 };
let i = 0;
for (const m of messages) {
  i += 1;
  process.stdout.write(`[${i}/${messages.length}] ${String(m.id).slice(0, 15)}... `);
  try {
    const answers = await qvac.askFourQuestions(m.text, contexto);
    const label = policy(answers);
    const entry = {
      messageId: m.id,
      answers,
      label_final: label,
      timestamp: new Date().toISOString(),
      modelo: qvac.engineName, // el motor que decidio de verdad (qvac:<modelo> | mock)
    };
    fs.appendFileSync(logPath, JSON.stringify(entry) + '\n');
    if (gmail) {
      await applyTriageLabel(gmail, m.id, label, labelIds);
    }
    const short = label.split('/')[1];
    stats[short] = (stats[short] || 0) + 1;
    console.log(`-> ${short} (${answers.es_stakeholder}/${answers.bloquea_evento}/${answers.pide_accion}/${answers.es_fyi})`);
  } catch (e) {
    console.log(`WARN parse/label: ${e.message} -> Despues`);
    stats.Despues += 1;
  }
}

console.log('\n[Triage BATCH] Resumen:');
console.log(`  Ahora: ${stats.Ahora} | Despues: ${stats.Despues} | NoResponder: ${stats.NoResponder}`);
console.log(`  Log: ${logPath}`);
console.log('  Scope 5 VERDE si >=10 etiquetados y ningun parse tumba lote');
await releaseQvacClient();
process.exit(0);
