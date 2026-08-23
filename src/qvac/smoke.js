import 'dotenv/config';
import { completion, LLAMA_3_2_1B_INST_Q4_0, loadModel, unloadModel } from '@qvac/sdk';

process.env.QVAC_CONFIG_PATH ||= './qvac.config.js';

const start = Date.now();
console.log('[QVAC] Pulso - Scope 1 - Iniciando smoke test...');

try {
  const modelId = await loadModel({
    modelSrc: LLAMA_3_2_1B_INST_Q4_0,
    onProgress: (p) => {
      if (!p?.percentage) return;
      const line = `▸ ${p.percentage.toFixed(0)}%`;
      process.stderr.write(process.stderr.isTTY ? `\r${line}` : `${line}\n`);
    },
  });
  const result = completion({
    modelId,
    history: [{ role: 'user', content: 'Responde solo: hola' }],
    stream: false,
  });
  const text = (await result.text)?.trim() || '';
  await unloadModel({ modelId });
  if (!text) throw new Error('Completion vacio');
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[QVAC] Respuesta: ${text.slice(0, 50)}`);
  console.log(`[QVAC] Modelo OK 1B Q4 cargado 1 vez - Tiempo: ${elapsed}s - Scope 1 VERDE`);
} catch (e) {
  console.error(`[QVAC] Scope 1 ROJO: ${e.message}`);
  process.exit(1);
}
