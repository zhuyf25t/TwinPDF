import { Router } from "express";
import { aiConfig } from "../env";
import { callDeepSeek } from "../lib/deepseek";
import { buildAssistMessages, buildFinalizeMessages, buildLabelPageMessages } from "../lib/prompts";
import type { AssistRequest, FinalizeRequest, LabelPageRequest, SentenceLabel } from "../../src/shared/contracts";

export const aiRouter = Router();

aiRouter.get("/health", (_req, res) => {
  const config = aiConfig();
  res.json({ ok: true, mockAI: config.mock, model: config.mock ? "mock" : config.model });
});

aiRouter.post("/assist", async (req, res) => {
  try {
    const payload = req.body as AssistRequest;
    if (!payload.selectedText?.trim() && !payload.question?.trim()) {
      res.status(400).json({ error: "请先选中文本或输入问题。" });
      return;
    }
    const answer = await callDeepSeek(buildAssistMessages(payload), 0.25);
    res.json({ answer, mock: aiConfig().mock });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

aiRouter.post("/label-page", async (req, res) => {
  try {
    const payload = req.body as LabelPageRequest;
    const raw = await callDeepSeek(buildLabelPageMessages(payload), 0.05);
    let labels: SentenceLabel[] = [];
    try {
      const parsed = JSON.parse(raw) as { labels?: SentenceLabel[] };
      labels = Array.isArray(parsed.labels) ? parsed.labels : [];
    } catch {
      labels = payload.sentences.slice(0, 10).map((sentence) => ({
        sentenceId: sentence.id,
        kind: "other",
        difficulty: "medium",
        shortGloss: "待人工确认的句子",
        likelyQuestion: "这句话是什么意思？"
      }));
    }
    res.json({ labels, mock: aiConfig().mock });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

aiRouter.post("/finalize", async (req, res) => {
  try {
    const payload = req.body as FinalizeRequest;
    const markdown = await callDeepSeek(buildFinalizeMessages(payload), 0.18);
    res.json({ markdown, mock: aiConfig().mock });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});
