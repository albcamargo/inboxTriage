import 'dotenv/config';
import fs from 'fs';
import { policy } from '../policy.js';

const ctxPath = process.env.CONTEXTO_PATH || './contexto.json';
const logPath = process.env.LOG_PATH || './triage.log';

function mockQVAC(texto, contexto) {
  const lower = texto.toLowerCase();
  const stakeholders = (contexto.stakeholders||[]).join(' ').toLowerCase();
  const isStake = stakeholders.split(' ').some(s => lower.includes(s.split('@')[0]) && s.length>3) || lower.includes('catering') || lower.includes('produccion');
  return {
    es_stakeholder: isStake || lower.includes('catering') ? 'SI' : 'NO',
    bloquea_evento: lower.includes('jueves') || lower.includes('cierre') || lower.includes('auditorio') ? 'SI' : 'NO',
    pide_accion: lower.includes('necesitamos') || lower.includes('urgente') || lower.includes('cierre') ? 'SI' : 'NO',
    es_fyi: lower.includes('comunicado') || lower.includes('bienestar') || lower.includes('fyi') ? 'SI' : 'NO'
  };
}

const args = process.argv;
const idIdx = args.indexOf('--id');
const messageId = idIdx>=0 ? args[idIdx+1] : 'fixture-1';

const contexto = JSON.parse(fs.readFileSync(ctxPath, 'utf8'));
let snippet = 'Cierre lista invitados evento jueves - necesitamos confirmacion';
try {
  // Intento Gmail real si hay tokens
  const { google } = await import('googleapis');
  const tokens = JSON.parse(fs.readFileSync('tokens.json','utf8'));
  const oAuth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
  oAuth2Client.setCredentials(tokens);
  const gmail = google.gmail({version:'v1', auth:oAuth2Client});
  const msg = await gmail.users.messages.get({userId:'me', id:messageId, format:'full'});
  snippet = msg.data.snippet || snippet;
} catch { /* modo fixture */ }

const answers = mockQVAC(snippet, contexto);
const label = policy(answers);

const entry = { messageId, answers, label_final: label, timestamp: new Date().toISOString(), modelo: process.env.QVAC_MODEL||'llama-3.2-1b-instruct-q4' };
fs.appendFileSync(logPath, JSON.stringify(entry)+'\n');
console.log(`[Triage ONE] ${messageId} -> ${label}`);
console.log('  Preguntas:', answers);
console.log(`  Log: ${logPath}`);