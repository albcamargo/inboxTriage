#!/usr/bin/env node
// Precachea el MISMO modelo que usa el runtime, en el MISMO cache (qvac.config.js).
// Reemplaza la descarga manual desde HuggingFace: aquel GGUF quedaba con otro
// nombre de archivo y el SDK no lo reutilizaba al cargar por constante del registry.
// Uso: node scripts/precache-model.mjs   (respeta QVAC_MODEL y QVAC_CONFIG_PATH)

import 'dotenv/config';
import { loadModel, unloadModel, LLAMA_3_2_1B_INST_Q4_0, QWEN3_4B_INST_Q4_K_M } from '@qvac/sdk';

process.env.QVAC_CONFIG_PATH ||= './qvac.config.js';

const use1b = (process.env.QVAC_MODEL || '').includes('1b');
const modelSrc = use1b ? LLAMA_3_2_1B_INST_Q4_0 : QWEN3_4B_INST_Q4_K_M;
console.log(`[Precache] Modelo: ${use1b ? 'Llama 3.2 1B Q4 (~0.8 GB)' : 'Qwen3 4B Q4 (~2.4 GB)'} - cache segun qvac.config.js`);

const t0 = Date.now();
const modelId = await loadModel({
  modelSrc,
  modelType: 'llm',
  onProgress: (p) => {
    if (p?.percentage == null) return;
    process.stderr.write(`\r[Precache] descarga ${p.percentage.toFixed(0)}%   `);
    if (p.percentage >= 100) process.stderr.write('\n');
  },
});
await unloadModel({ modelId });
console.log(`[Precache] OK en ${((Date.now() - t0) / 1000).toFixed(1)}s - modelo listo para la demo`);
