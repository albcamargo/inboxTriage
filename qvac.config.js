import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

export default {
  loggerLevel: "info",
  loggerConsoleOutput: true,
  cacheDirectory: path.resolve(root, "models"),
  httpDownloadConcurrency: 3,
  httpConnectionTimeoutMs: 10000,
  deviceDefaults: [
    {
      name: "CPU-only demo",
      match: { platform: "linux" },
      defaults: { llm: { "device": "cpu" } },
    },
  ],
};
