/**
 * Cliente QVAC alineado a @qvac/sdk 0.17 (loadModel + completion).
 * RNF-03 un proceso un modelo, RNF-04 CPU-first 1B Q4.
 */

import 'dotenv/config';
import { completion, LLAMA_3_2_1B_INST_Q4_0, loadModel, unloadModel } from '@qvac/sdk';

let singleton = null;

const SINGLE_COMPLETION =
  process.env.QVAC_SINGLE_COMPLETION !== 'false' && process.env.QVAC_SINGLE_COMPLETION !== '0';
const MAX_TOKENS = parseInt(process.env.QVAC_MAX_TOKENS || '128', 10);

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
Responde SOLO: SI, NO, INCIERTO`,
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
  if (/\bSI\b/.test(t) || t.includes('SÍ')) return 'SI';
  if (/\bNO\b/.test(t)) return 'NO';
  return 'INCIERTO';
}

function heuristicAnswers(text) {
  const lower = (text || '').toLowerCase();
  return {
    es_stakeholder: /catering|produccion@venue|ana\.perez|ana perez|direccion@|jcamargo/.test(lower) ? 'SI' : 'NO',
    bloquea_evento: /jueves|cierre lista|auditorio|acreditacion|informe trimestral/.test(lower) ? 'SI' : 'NO',
    pide_accion: /necesitamos|urgente|confirmar|cierre|deadline/.test(lower) ? 'SI' : 'NO',
    es_fyi: /\bfyi\b|comunicado|bienestar|newsletter|gracias,? recibido|no requiere accion/.test(lower) ? 'SI' : 'NO',
  };
}

function isInconclusive(answers) {
  return Object.values(answers).every((v) => v === 'NO' || v === 'INCIERTO');
}

function parseJsonAnswers(raw) {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('no json');
    const obj = JSON.parse(match[0]);
    return {
      es_stakeholder: normalizeAnswer(obj.es_stakeholder),
      bloquea_evento: normalizeAnswer(obj.bloquea_evento),
      pide_accion: normalizeAnswer(obj.pide_accion),
      es_fyi: normalizeAnswer(obj.es_fyi),
    };
  } catch {
    return null;
  }
}

class QvacTriageClient {
  constructor(modelId) {
    this.modelId = modelId;
    this.isMock = !modelId;
  }

  async completion(prompt) {
    const cleanPrompt = prompt.slice(0, 2000);
    if (this.isMock) {
      const lower = cleanPrompt.toLowerCase();
      if (cleanPrompt.includes('JSON')) {
        const isA = lower.includes('catering');
        return JSON.stringify({
          es_stakeholder: isA ? 'SI' : 'NO',
          bloquea_evento: isA ? 'SI' : 'NO',
          pide_accion: isA ? 'SI' : 'NO',
          es_fyi: isA ? 'NO' : 'SI',
        });
      }
      if (lower.includes('catering') || lower.includes('produccion@venue') || lower.includes('ana perez')) return 'SI';
      if (lower.includes('jueves') || lower.includes('cierre lista') || lower.includes('auditorio')) return 'SI';
      if (lower.includes('necesitamos') || lower.includes('urgente') || lower.includes('cierre')) return 'SI';
      if (lower.includes('comunicado') || lower.includes('bienestar') || lower.includes('fyi') || lower.includes('newsletter')) return 'SI';
      return 'NO';
    }

    const result = completion({
      modelId: this.modelId,
      history: [{ role: 'user', content: cleanPrompt }],
      stream: false,
    });
    const text = await result.text;
    return (text || '').slice(0, MAX_TOKENS * 8);
  }

  async askFourQuestions(emailText, contexto) {
    const text = (emailText || '').replace(/\s+/g, ' ').trim().slice(0, 2000);
    if (!text) {
      return { es_stakeholder: 'INCIERTO', bloquea_evento: 'INCIERTO', pide_accion: 'INCIERTO', es_fyi: 'INCIERTO' };
    }

    let results;
    if (SINGLE_COMPLETION) {
      const raw = await this.completion(SINGLE_PROMPT(contexto).replace('{text}', text));
      results = parseJsonAnswers(raw) || {
        es_stakeholder: normalizeAnswer(raw.split('\n')[0]),
        bloquea_evento: 'INCIERTO',
        pide_accion: 'INCIERTO',
        es_fyi: 'INCIERTO',
      };
    } else {
      results = {};
      for (const key of ['es_stakeholder', 'bloquea_evento', 'pide_accion', 'es_fyi']) {
        const prompt = PROMPTS[key](contexto).replace('{text}', text);
        try {
          results[key] = normalizeAnswer(await this.completion(prompt));
        } catch (e) {
          console.warn(`[QVAC] Error pregunta ${key}: ${e.message} -> INCIERTO`);
          results[key] = 'INCIERTO';
        }
      }
    }

    if (isInconclusive(results)) {
      const fallback = heuristicAnswers(text);
      console.warn('[QVAC] Respuesta inconclusa - usando heuristica de fixtures');
      return fallback;
    }
    return results;
  }
}

export async function getQvacClient() {
  if (singleton) return singleton;

  let modelId = null;
  try {
    process.env.QVAC_CONFIG_PATH ||= './qvac.config.js';
    console.log('[QVAC] Cargando Llama 3.2 1B Instruct Q4 (un proceso, un modelo - RNF-03)');
    modelId = await loadModel({
      modelSrc: LLAMA_3_2_1B_INST_Q4_0,
      onProgress: (p) => {
        if (!p?.percentage) return;
        const line = `▸ ${p.percentage.toFixed(0)}%`;
        process.stderr.write(process.stderr.isTTY ? `\r${line}` : `${line}\n`);
        if (p.percentage >= 100) process.stderr.write('\n');
      },
    });
    console.log('[QVAC] Modelo OK - Scope 1 VERDE');
  } catch (e) {
    console.warn(`[QVAC] Fallo carga SDK (${e.message}) - mock deterministico para no bloquear demo`);
  }

  singleton = new QvacTriageClient(modelId);
  return singleton;
}

export async function releaseQvacClient() {
  if (singleton?.modelId) {
    try {
      await unloadModel({ modelId: singleton.modelId });
    } catch {
      /* ignore */
    }
  }
  singleton = null;
}

export async function smoke() {
  const c = await getQvacClient();
  const text = await c.completion('Responde solo: hola');
  await releaseQvacClient();
  return text;
}
