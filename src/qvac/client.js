/**
 * src/qvac/client.js - Cliente QVAC real para InboxTriage
 * Alineado a PITCH.md RNF-03 (un proceso, un modelo), RNF-04 (CPU-first 1B Q4), RNF-06 (ES/EN)
 * y CICLO.md Scope 1 (Pulso) + Scope 3 (contrato SI/NO/INCIERTO) + Scope 5 (no tumba lote)
 * 
 * Uso:
 *   import { getQvacClient } from './client.js'
 *   const qvac = await getQvacClient()
 *   const answers = await qvac.askFourQuestions(emailText, contexto)
 *   // answers = { es_stakeholder: 'SI'|'NO'|'INCIERTO', bloquea_evento, pide_accion, es_fyi }
 */

import 'dotenv/config';

let singleton = null;

const DEFAULT_MODEL = process.env.QVAC_MODEL || 'llama-3.2-1b-instruct-q4';
const SINGLE_COMPLETION = (process.env.QVAC_SINGLE_COMPLETION || 'false') === 'true' || process.env.QVAC_SINGLE_COMPLETION === '1';
const MAX_TOKENS = parseInt(process.env.QVAC_MAX_TOKENS || '512');

const PROMPTS = {
  es_stakeholder: (ctx) => `Eres un clasificador estricto. Contexto stakeholders esta semana: ${ctx.stakeholders?.join(', ') || 'ninguno'}.
Pregunta: ¿El remitente o contenido menciona a uno de estos stakeholders?
Correo: "{text}"
Responde SOLO con una palabra: SI, NO, INCIERTO`,

  bloquea_evento: (ctx) => `Eres un clasificador estricto. Cosas en el plato esta semana: ${ctx.on_the_plate?.join(' | ') || 'nada'}.
Pregunta: ¿Este correo bloquea o es critico para algo que esta en el plato esta semana (evento jueves, cierre catering, auditorio)?
Correo: "{text}"
Responde SOLO: SI, NO, INCIERTO`,

  pide_accion: () => `Pregunta: ¿Este correo pide explicitamente un dato, accion, confirmacion o entrega?
Correo: "{text}"
Responde SOLO: SI, NO, INCIERTO`,

  es_fyi: (ctx) => `Contexto deprioritize: ${ctx.deprioritize?.join(', ') || 'comunicados rutina, newsletters, FYI masivo'}.
Pregunta: ¿Este correo es FYI, comunicado rutina, newsletter, agradecimiento o CC masivo sin pedido explicito?
Correo: "{text}"
Responde SOLO: SI, NO, INCIERTO`
};

const SINGLE_PROMPT = (ctx) => `Eres un clasificador de triaje de Gmail. Contexto semana:
- En el plato: ${ctx.on_the_plate?.join(' | ')}
- Stakeholders: ${ctx.stakeholders?.join(', ')}
- Deprioritize: ${ctx.deprioritize?.join(', ')}

Para el correo entre comillas, responde en JSON estricto con 4 claves, cada valor SOLO SI, NO o INCIERTO:
{
  "es_stakeholder": "...",
  "bloquea_evento": "...",
  "pide_accion": "...",
  "es_fyi": "..."
}
Correo: "{text}"
JSON:`;

function normalizeAnswer(raw) {
  const t = (raw || '').toUpperCase();
  if (t.includes('SI')) return 'SI';
  if (t.includes('NO')) return 'NO';
  return 'INCIERTO';
}

function parseJsonAnswers(raw) {
  try {
    // Extrae JSON aunque venga con texto extra
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('no json');
    const obj = JSON.parse(match[0]);
    return {
      es_stakeholder: normalizeAnswer(obj.es_stakeholder),
      bloquea_evento: normalizeAnswer(obj.bloquea_evento),
      pide_accion: normalizeAnswer(obj.pide_accion),
      es_fyi: normalizeAnswer(obj.es_fyi)
    };
  } catch {
    // fallback a parse linea por linea
    return null;
  }
}

class QvacTriageClient {
  constructor(sdkClient) {
    this.sdk = sdkClient; // instancia real @qvac/sdk o null si mock
    this.model = DEFAULT_MODEL;
    this.isMock = !sdkClient;
  }

  async completion(prompt) {
    const cleanPrompt = prompt.slice(0, 2000); // RNF: truncar, no enviar mail completo largo
    if (this.isMock) {
      // Mock deterministico para demo sin modelo - alineado a caso canonico PITCH.md
      const lower = cleanPrompt.toLowerCase();
      if (lower.includes('catering') || lower.includes('produccion@venue') || lower.includes('ana perez')) return 'SI';
      if (lower.includes('jueves') || lower.includes('cierre lista') || lower.includes('auditorio')) return 'SI';
      if (lower.includes('necesitamos') || lower.includes('urgente') || lower.includes('cierre')) return 'SI';
      if (lower.includes('comunicado') || lower.includes('bienestar') || lower.includes('fyi') || lower.includes('newsletter')) return 'SI';
      // para single prompt
      if (cleanPrompt.includes('JSON')) {
        const isA = lower.includes('catering');
        return JSON.stringify({
          es_stakeholder: isA ? 'SI' : 'NO',
          bloquea_evento: isA ? 'SI' : 'NO',
          pide_accion: isA ? 'SI' : 'NO',
          es_fyi: isA ? 'NO' : 'SI'
        });
      }
      return 'NO';
    }
    // Real SDK
    const res = await this.sdk.completion({ prompt: cleanPrompt, maxTokens: MAX_TOKENS });
    return res.text || res.output || '';
  }

  async askFourQuestions(emailText, contexto) {
    const text = (emailText || '').slice(0, 2000).replace(/\s+/g, ' ').trim();
    if (!text) return { es_stakeholder: 'INCIERTO', bloquea_evento: 'INCIERTO', pide_accion: 'INCIERTO', es_fyi: 'INCIERTO' };

    if (SINGLE_COMPLETION) {
      // Recorte permitido CICLO.md: 1 completion con 4 preguntas si QVAC lento
      const prompt = SINGLE_PROMPT(contexto).replace('{text}', text);
      const raw = await this.completion(prompt);
      const parsed = parseJsonAnswers(raw);
      if (parsed) return parsed;
      // fallback si modelo no devuelve JSON perfecto
      return {
        es_stakeholder: normalizeAnswer(raw.split('\n')[0]),
        bloquea_evento: 'INCIERTO',
        pide_accion: 'INCIERTO',
        es_fyi: 'INCIERTO'
      };
    } else {
      // 4 round-trips - mas auditable, preferido si maquina aguanta
      const results = {};
      for (const key of ['es_stakeholder', 'bloquea_evento', 'pide_accion', 'es_fyi']) {
        const promptTpl = PROMPTS[key](contexto);
        const prompt = promptTpl.replace('{text}', text);
        try {
          const raw = await this.completion(prompt);
          results[key] = normalizeAnswer(raw);
        } catch (e) {
          console.warn(`[QVAC] Error pregunta ${key}: ${e.message} -> INCIERTO (no tumba lote - Scope 5)`);
          results[key] = 'INCIERTO';
        }
      }
      return results;
    }
  }
}

export async function getQvacClient() {
  if (singleton) return singleton;

  let sdkClient = null;
  try {
    const { QvacClient } = await import('@qvac/sdk');
    console.log(`[QVAC] Cargando modelo ${DEFAULT_MODEL} (un proceso, un modelo - RNF-03, CPU-first RNF-04)`);
    const client = new QvacClient();
    await client.loadModel(DEFAULT_MODEL);
    sdkClient = client;
    console.log('[QVAC] Modelo OK - Scope 1 VERDE');
  } catch (e) {
    console.warn(`[QVAC] @qvac/sdk no disponible o fallo carga (${e.message}) - usando mock deterministico para no bloquear demo`);
    console.warn('[QVAC] En prod, asegura npm install y modelo descargado. Recorte SINGLE_COMPLETION=true si >30s/mail');
  }

  singleton = new QvacTriageClient(sdkClient);
  return singleton;
}

// Para compatibilidad con smoke.js antiguo
export async function smoke() {
  const c = await getQvacClient();
  const ans = await c.completion('Responde solo: hola');
  return ans;
}
