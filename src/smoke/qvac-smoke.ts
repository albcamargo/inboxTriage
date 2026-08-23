import { completion, LLAMA_3_2_1B_INST_Q4_0, loadModel, unloadModel } from "@qvac/sdk";

const PROMPT = "Responde solo: OK";

async function main(): Promise<void> {
  const t0 = Date.now();
  process.stderr.write("Cargando modelo QVAC (primera vez puede descargar ~700MB)...\n");

  const modelId = await loadModel({
    modelSrc: LLAMA_3_2_1B_INST_Q4_0,
    onProgress: (p) => {
      const mb = (n: number) => (n / 1e6).toFixed(1);
      const line = `▸ ${p.percentage.toFixed(0)}% (${mb(p.downloaded)}/${mb(p.total)} MB)`;
      process.stderr.write(process.stderr.isTTY ? `\r${line}` : `${line}\n`);
      if (p.percentage >= 100) process.stderr.write("\n");
    },
  });

  const loadMs = Date.now() - t0;
  const inferT0 = Date.now();
  const result = completion({
    modelId,
    history: [{ role: "user", content: PROMPT }],
    stream: false,
  });
  const text = (await result.text).trim();
  const inferMs = Date.now() - inferT0;
  await unloadModel({ modelId });

  if (!text) throw new Error("Completion vacío");
  console.log(`OK load=${loadMs}ms infer=${inferMs}ms response=${JSON.stringify(text.slice(0, 80))}`);
}

main().catch((err) => {
  console.error("smoke:qvac FAILED:", err);
  process.exit(1);
});
