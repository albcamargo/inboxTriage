/**
 * src/server/api.js - API local para el panel (dashboard) de InboxTriage
 *
 *   GET  /salud           -> identidad, para la deteccion desde la landing
 *   GET  /api/bandeja     -> correos clasificados (triage.log + metadatos de Gmail)
 *   POST /api/sello       -> corregir un sello: re-etiqueta el correo en Gmail
 *   GET  /api/intereses   -> intereses de la semana (contexto.json)
 *   POST /api/intereses   -> guarda los intereses en contexto.json
 *
 * Todo corre en la maquina del usuario: los datos van de localhost al navegador
 * del propio usuario. CORS abierto + soporte del preflight Private Network
 * Access de Chrome (necesario cuando el panel se sirve desde un dominio publico).
 *
 * Uso: npm run dashboard:api   (puerto 8000; cambiar con DASHBOARD_API_PORT)
 */

import 'dotenv/config';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { applyTriageLabel, getGmail, getTriageLabelIds } from '../gmail/client.js';

const PORT = parseInt(process.env.DASHBOARD_API_PORT || '8000', 10);
const LOG = process.env.LOG_PATH || './triage.log';
const CTX = process.env.CONTEXTO_PATH || './contexto.json';
// Carpeta del panel (frontend). Si existe, este server la sirve en / — mismo
// origen que la API, sin permisos de red local del navegador de por medio.
const PANEL_DIR = process.env.DASHBOARD_DIR || './panel';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function servirPanel(res, ruta) {
  const base = path.resolve(PANEL_DIR);
  let objetivo = path.resolve(base, '.' + (ruta === '/' ? '/index.html' : ruta));
  if (!objetivo.startsWith(base)) return responder(res, 403, { error: 'ruta invalida' });
  try {
    if (fs.statSync(objetivo).isDirectory()) objetivo = path.join(objetivo, 'index.html');
    const cuerpo = fs.readFileSync(objetivo);
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(objetivo).toLowerCase()] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    });
    return res.end(cuerpo);
  } catch {
    return responder(res, 404, {
      error: 'panel no encontrado',
      nota: `Define DASHBOARD_DIR en .env apuntando a la carpeta del panel (actual: ${PANEL_DIR})`,
    });
  }
}

const LABEL_A_VEREDICTO = {
  'InboxTriage/Ahora': 'AHORA',
  'InboxTriage/Despues': 'DESPUES',
  'InboxTriage/NoResponder': 'NO',
};
const VEREDICTO_A_LABEL = {
  AHORA: 'InboxTriage/Ahora',
  DESPUES: 'InboxTriage/Despues',
  NO: 'InboxTriage/NoResponder',
};

// Ultima entrada del log por messageId, mas recientes primero.
function ultimasEntradas() {
  let lineas = [];
  try {
    lineas = fs.readFileSync(LOG, 'utf8').trim().split('\n');
  } catch {
    return [];
  }
  const porId = new Map();
  for (const l of lineas) {
    try {
      const e = JSON.parse(l);
      if (e.messageId && !String(e.messageId).startsWith('fixture-')) {
        porId.delete(e.messageId); // re-inserta al final para conservar orden reciente
        porId.set(e.messageId, e);
      }
    } catch { /* linea corrupta: se ignora */ }
  }
  return [...porId.values()].reverse();
}

function razonDe(a = {}) {
  if (a.es_fyi === 'SI') return 'aviso masivo o solo informativo — nadie espera tu respuesta';
  const partes = [];
  if (a.es_stakeholder === 'SI') partes.push('es de una persona clave');
  if (a.bloquea_evento === 'SI') partes.push('toca tus prioridades de la semana');
  if (a.pide_accion === 'SI') partes.push('te piden algo');
  return partes.length ? partes.join(' y ') : 'criterio general del triaje';
}

// text/plain del arbol MIME, en parrafos. Fallback: snippet.
function extraerParrafos(payload) {
  const b64 = (d) => Buffer.from(d.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
  const busca = (p) => {
    if (!p) return null;
    if (p.mimeType === 'text/plain' && p.body?.data) return b64(p.body.data);
    for (const s of p.parts || []) {
      const t = busca(s);
      if (t) return t;
    }
    return null;
  };
  const texto = busca(payload);
  if (!texto) return null;
  return texto
    .replace(/\r/g, '')
    .split(/\n{2,}/)
    .map((s) => s.replace(/\n/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 8);
}

async function bandeja() {
  const entradas = ultimasEntradas();
  const gmail = getGmail();
  const hoyStr = new Date().toDateString();
  const correos = [];
  let n = 0;
  for (const e of entradas) {
    n += 1;
    const c = {
      id: n,
      gmailId: e.messageId,
      veredicto: LABEL_A_VEREDICTO[e.label_final] || 'DESPUES',
      regla: null,
      razon: e.correccion_manual ? 'corregido por ti' : razonDe(e.answers),
      dia: 'hoy',
      hora: '',
      leido: true,
      quien: e.messageId,
      de: '',
      asunto: '(sin asunto)',
      cuerpo: [],
    };
    try {
      const m = await gmail.users.messages.get({ userId: 'me', id: e.messageId, format: 'full' });
      const hs = m.data.payload?.headers || [];
      const h = (x) => hs.find((v) => v.name.toLowerCase() === x)?.value || '';
      const from = h('from');
      const match = from.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>/);
      c.quien = (match ? match[1].trim() : from.split('@')[0]) || from;
      c.de = match ? match[2] : from;
      c.asunto = h('subject') || '(sin asunto)';
      const f = new Date(Number(m.data.internalDate) || h('date'));
      c.dia = f.toDateString() === hoyStr ? 'hoy' : 'ayer';
      c.hora = f.toTimeString().slice(0, 5);
      c.leido = !(m.data.labelIds || []).includes('UNREAD');
      c.cuerpo = extraerParrafos(m.data.payload) || [m.data.snippet || ''];
    } catch (err) {
      c.cuerpo = ['(no se pudo cargar este correo: ' + err.message + ')'];
    }
    correos.push(c);
  }
  correos.sort((a, b) => (a.dia === b.dia ? 0 : a.dia === 'hoy' ? -1 : 1));
  return correos;
}

function intereses() {
  try {
    const ctx = JSON.parse(fs.readFileSync(CTX, 'utf8'));
    return (ctx.on_the_plate || []).map((t, i) => ({ id: 'interes-' + (i + 1), texto: t }));
  } catch {
    return [];
  }
}

function guardarIntereses(lista) {
  let ctx = {};
  try {
    ctx = JSON.parse(fs.readFileSync(CTX, 'utf8'));
  } catch { /* contexto nuevo */ }
  ctx.on_the_plate = lista.map((t) => String(t).trim()).filter(Boolean).slice(0, 5);
  fs.writeFileSync(CTX, JSON.stringify(ctx, null, 2) + '\n', 'utf8');
  return ctx.on_the_plate;
}

function responder(res, codigo, cuerpo) {
  res.writeHead(codigo, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  });
  res.end(JSON.stringify(cuerpo));
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'content-type',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Private-Network': 'true',
    });
    return res.end();
  }
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    if (req.method === 'GET' && url.pathname === '/salud') {
      return responder(res, 200, { app: 'inboxtriage' });
    }
    if (req.method === 'GET' && url.pathname === '/api/bandeja') {
      return responder(res, 200, { correos: await bandeja() });
    }
    if (req.method === 'GET' && url.pathname === '/api/intereses') {
      return responder(res, 200, { intereses: intereses() });
    }
    if (req.method === 'POST' && url.pathname === '/api/intereses') {
      let body = '';
      for await (const ch of req) body += ch;
      const datos = JSON.parse(body || '{}');
      const guardados = guardarIntereses(datos.intereses || []);
      return responder(res, 200, { intereses: guardados.map((t, i) => ({ id: 'interes-' + (i + 1), texto: t })) });
    }
    if (req.method === 'POST' && url.pathname === '/api/sello') {
      let body = '';
      for await (const ch of req) body += ch;
      const datos = JSON.parse(body || '{}');
      const label = VEREDICTO_A_LABEL[datos.veredicto];
      if (!label || !datos.gmailId) {
        return responder(res, 400, { error: 'gmailId y veredicto (AHORA|DESPUES|NO) requeridos' });
      }
      const gmail = getGmail();
      const ids = await getTriageLabelIds(gmail);
      await applyTriageLabel(gmail, datos.gmailId, label, ids);
      fs.appendFileSync(
        LOG,
        JSON.stringify({
          messageId: datos.gmailId,
          answers: {},
          label_final: label,
          timestamp: new Date().toISOString(),
          correccion_manual: true,
        }) + '\n',
      );
      return responder(res, 200, { ok: true, label });
    }
    if (req.method === 'GET' && !url.pathname.startsWith('/api/')) {
      return servirPanel(res, url.pathname);
    }
    return responder(res, 404, { error: 'ruta desconocida' });
  } catch (err) {
    return responder(res, 500, { error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`[Panel API] http://localhost:${PORT} — /salud · /api/bandeja · /api/sello · /api/intereses`);
});
