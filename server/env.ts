import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

export type AiConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
  reasoning: boolean;
  mock: boolean;
  hasKey: boolean;
};

const LOCAL_ENV_FILES = ["env.local", ".env.local", ".env"] as const;
let envLoaded = false;

export function loadLocalEnv(projectRoot = process.cwd()) {
  if (envLoaded) return;

  for (const fileName of LOCAL_ENV_FILES) {
    const envPath = path.resolve(projectRoot, fileName);
    if (fs.existsSync(envPath) && fs.statSync(envPath).isFile()) {
      dotenv.config({ path: envPath, override: false });
    }
  }

  envLoaded = true;
}

export function aiConfig(): AiConfig {
  const apiKey = (process.env.DEEPSEEK_API_KEY ?? "").trim();
  const explicitMock = parseBoolean(process.env.MOCK_AI);

  return {
    apiKey,
    baseUrl: (process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com/v1").trim(),
    model: (process.env.DEEPSEEK_MODEL ?? "deepseek-v4-pro").trim(),
    reasoning: parseBoolean(process.env.DEEPSEEK_REASONING ?? "true"),
    mock: explicitMock || !apiKey,
    hasKey: Boolean(apiKey)
  };
}

function parseBoolean(value: string | undefined) {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}
