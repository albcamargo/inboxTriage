import 'dotenv/config';
import fs from 'fs';
import { policy } from '../policy.js';

const ctxPath = process.env.CONTEXTO_PATH || './contexto.json';
const logPath = process.env.LOG_PATH || './triage.log';
const batchSize = parseInt(process.env.GMAIL_BATCH_SIZE) || 15;

const args = process.argv;
const limitIdx = args.indexOf('--limit');
const limit = limitIdx>=0 ? parseInt(args[limitIdx+1]) : batchSize;

console.log(`[Triage BATCH] Lote ${limit} - Iniciando...`);

const contexto = JSON.parse(fs.readFileSync(ctxPath, 'utf8'));

function mockQVAC(texto) {
  const lower = texto.toLowerCase();
  try {
    if (!texto || texto.length<3) throw new Error('parse roto');
    return {
      es_stakeholder: lower.includes('catering') || lower.includes('produccion') || lower.includes('ana') ? 'SI' : 'NO',
      bloquea_evento: lower.includes('jueves') || lower.includes('cierre') || lower.includes('auditorio') ? 'SI' : 'NO',
      pide_accion: lower.includes('necesitamos') || lower.includes('urgente') || lower.includes('confirm') ? 'SI' : 'NO',
      es_fyi: lower.includes('comunicado') || lower.includes('bienestar') || lower.includes('fyi') || lower.includes('newsletter') ? 'SI' : 'NO'
    };
  } catch {
    console.log(`  [WARN] Parse roto para: ${texto.slice(0,30)} -> fallback INCIERTO -> Despues`);
    return { es_stakeholder: 'INCIERTO', bloquea_evento: 'INCIERTO', pide_accion: 'INCIERTO', es_fyi: 'INCIERTO' };
  }
}

let messages = [];
try {
  const { google } = await import('googleapis');
  const tokens = JSON.parse(fs.readFileSync('tokens.json','utf8'));
  const oAuth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
  oAuth2Client.setCredentials(tokens);
  const gmail = google.gmail({version:'v1', auth:oAuth2Client});
  const { data } = await gmail.users.messages.list({ userId: 'me', maxResults: limit, q: 'in:inbox' });
  for (const m of data.messages||[]) {
    const msg = await gmail.users.messages.get({ userId:'me', id:m.id, format:'metadata', metadataHeaders:['Subject','From'] });
    const subj = msg.data.payload.headers.find(h=>h.name==='Subject')?.value || '';
    messages.push({ id:m.id, text: subj + ' ' + (msg.data.snippet||'') });
  }
} catch {
  console.log('[Triage] Sin Gmail token - usando fixtures.json');
  try {
    const fix = JSON.parse(fs.readFileSync('fixtures.json','utf8'));
    messages = fix.slice(0, limit).map(f => ({ id:f.id, text: f.subject+' '+f.snippet }));
  } catch {
    messages = [
      { id:'fixture-1', text:'Cierre lista invitados evento jueves catering@proveedor-evento.com urgente' },
      { id:'fixture-2', text:'Comunicado mensual bienestar direccion FYI' },
      { id:'fixture-3', text:'Auditorio principal jueves 28 confirmacion produccion@venue.com' },
      { id:'fixture-4', text:'Newsletter descuento software' },
      { id:'fixture-5', text:'Gracias recibido' },
    ].slice(0,limit);
  }
}

let stats = { Ahora:0, Despues:0, NoResponder:0 };
let i=0;
for (const m of messages) {
  i++;
  process.stdout.write(`[${i}/${messages.length}] ${m.id.slice(0,15)}... `);
  const answers = mockQVAC(m.text);
  const label = policy(answers);
  const entry = { messageId:m.id, answers, label_final:label, timestamp:new Date().toISOString(), modelo:process.env.QVAC_MODEL||'llama-3.2-1b-instruct-q4' };
  fs.appendFileSync(logPath, JSON.stringify(entry)+'\n');
  const short = label.split('/')[1];
  stats[short] = (stats[short]||0)+1;
  console.log(`-> ${short} (${answers.es_stakeholder}/${answers.bloquea_evento}/${answers.pide_accion}/${answers.es_fyi})`);
  // Simular aplicacion label Gmail (idempotente) si hay token
}

console.log('\n[Triage BATCH] Resumen:');
console.log(`  Ahora: ${stats.Ahora} | Despues: ${stats.Despues} | NoResponder: ${stats.NoResponder}`);
console.log(`  Log: ${logPath}`);
console.log(`  OK si >=10 etiquetados; un parse roto no detiene el lote`);