import path from "node:path";
import process from "node:process";
import express from "express";
import { createServer as createViteServer } from "vite";
import { loadLocalEnv } from "./env";
import { aiRouter } from "./routes/ai";

const root = process.cwd();
loadLocalEnv(root);

const app = express();
app.use(express.json({ limit: "8mb" }));
app.use("/api/ai", aiRouter);

const isProduction = process.env.NODE_ENV === "production";
if (isProduction) {
  const dist = path.join(root, "dist");
  app.use(express.static(dist));
  app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
} else {
  const vite = await createViteServer({
    root,
    server: { middlewareMode: true },
    appType: "spa"
  });
  app.use(vite.middlewares);
}

const port = Number(process.env.APP_PORT || 5173);
app.listen(port, () => {
  const mock = process.env.MOCK_AI === "true" || !process.env.DEEPSEEK_API_KEY;
  console.log(`\n[TwinPDF] http://localhost:${port}`);
  console.log(`[TwinPDF] AI mode: ${mock ? "MOCK" : "DeepSeek"}`);
  console.log("[TwinPDF] Keep this terminal open while studying.\n");
});
