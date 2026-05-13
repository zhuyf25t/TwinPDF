import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

export function loadLocalEnv(projectRoot: string) {
  for (const file of ["env.local", ".env.local", ".env"]) {
    const full = path.join(projectRoot, file);
    if (fs.existsSync(full)) dotenv.config({ path: full, override: false });
  }
}

export function aiConfig() {
  return {
    apiKey: process.env.DEEPSEEK_API_KEY || "",
    baseUrl: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1",
    model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
    mock: process.env.MOCK_AI === "true" || !process.env.DEEPSEEK_API_KEY
  };
}
