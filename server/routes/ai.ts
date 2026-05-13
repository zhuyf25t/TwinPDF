import { Router } from "express";
import { aiConfig } from "../env";
import { AIProviderError, callDeepSeek } from "../lib/deepseek";
import { buildAssistMessages, buildFinalizeMessages, buildLabelPageMessages } from "../lib/prompts";
import { buildFinalSummaryMarkdown } from "../../src/lib/markdown";
import type {
  AssistRequest,
  AssistResponse,
  FinalizeRequest,
  FinalizeResponse,
  LabelPageRequest,
  LabelPageResponse,
  SentenceLabel,
  SentenceRecord
} from "../../src/shared/contracts";

export const aiRouter = Router();

const MAX_LABEL_SENTENCES = 80;

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

    const config = aiConfig();
    const answer = config.mock
      ? mockAssist(payload)
      : await callDeepSeek(buildAssistMessages(payload), { temperature: 0.25, maxTokens: 1400 });
    res.json({ answer, mock: config.mock } satisfies AssistResponse);
  } catch (error) {
    sendAiError(res, error);
  }
});

aiRouter.post("/label-page", async (req, res) => {
  try {
    const payload = req.body as LabelPageRequest;
    if (!payload.pdfName || typeof payload.pageNumber !== "number" || !Array.isArray(payload.sentences)) {
      res.status(400).json({ error: "页面标注请求缺少 PDF 名称、页码或句子列表。" });
      return;
    }

    const config = aiConfig();
    const boundedPayload: LabelPageRequest = {
      ...payload,
      sentences: payload.sentences.filter(hasSentenceShape).slice(0, MAX_LABEL_SENTENCES)
    };

    if (!boundedPayload.sentences.length) {
      res.json({ labels: [], mock: config.mock } satisfies LabelPageResponse);
      return;
    }

    const rawLabels = config.mock
      ? []
      : parseLabels(await callDeepSeek(buildLabelPageMessages(boundedPayload), { temperature: 0.05, maxTokens: 4200 }));
    const labels = normalizeLabels(boundedPayload, rawLabels);
    res.json({ labels, mock: config.mock } satisfies LabelPageResponse);
  } catch (error) {
    sendAiError(res, error);
  }
});

aiRouter.post("/finalize", async (req, res) => {
  try {
    const payload = req.body as FinalizeRequest;
    if (!payload.courseTitle?.trim()) {
      res.status(400).json({ error: "请先填写课程名称。" });
      return;
    }

    if (aiConfig().mock) {
      res.json({
        markdown: buildFinalSummaryMarkdown({
          courseTitle: payload.courseTitle,
          workspaceName: payload.workspaceName,
          entries: payload.entries || []
        }),
        mock: true
      } satisfies FinalizeResponse);
      return;
    }

    const generatedReviewMarkdown = await callDeepSeek(
      buildFinalizeMessages(payload),
      { temperature: 0.18, maxTokens: 2200 }
    );
    const markdown = buildFinalSummaryMarkdown({
      courseTitle: payload.courseTitle,
      workspaceName: payload.workspaceName,
      entries: payload.entries || [],
      generatedReviewMarkdown
    });
    res.json({ markdown, mock: false } satisfies FinalizeResponse);
  } catch (error) {
    sendAiError(res, error);
  }
});

function mockAssist(payload: AssistRequest) {
  const selected = payload.selectedText?.trim();
  const question = payload.question?.trim();
  const page = payload.pageLabel || (payload.pageNumber ? `第 ${payload.pageNumber} 页` : "当前页面");
  const lead = selected
    ? `这段原文在 ${page} 里的作用，是把一个关键概念往前推进一步。`
    : `你现在问的是：${question || "这段内容是什么意思？"}`;

  return [
    lead,
    "",
    selected
      ? `先抓主干：${selected.slice(0, 220)}${selected.length > 220 ? "..." : ""}`
      : "先把问题落到当前页的上下文里看，不要只背一句孤立解释。",
    "",
    "你可以把它理解成课堂上老师会停下来强调的一句：它通常在说明“为什么要这样做”，或者把前面的定义连接到后面的公式/步骤。复习时，重点不是逐字翻译，而是能用自己的话说出它解决了什么问题。",
    "",
    question
      ? "针对你的问题，最短答案是：先说明直觉，再回到原文术语；如果涉及公式，就逐项解释每个符号。"
      : "如果想继续追问，可以问：这句话为什么放在这里？它和下一页的公式有什么关系？"
  ].join("\n");
}

function parseLabels(raw: string): SentenceLabel[] {
  const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    const parsed = JSON.parse(cleaned) as { labels?: unknown };
    if (!Array.isArray(parsed.labels)) return [];
    return parsed.labels.filter(isSentenceLabel);
  } catch {
    return [];
  }
}

function normalizeLabels(payload: LabelPageRequest, labels: SentenceLabel[]) {
  const byId = new Map(labels.map((label) => [label.sentenceId, label]));
  return payload.sentences.map((sentence) => byId.get(sentence.id) || mockLabel(sentence.id, sentence.text));
}

function mockLabel(sentenceId: string, text: string): SentenceLabel {
  const lowered = text.toLowerCase();
  const looksFormula = /[=<>≤≥∑∏]|log\s|kl\(|p\(|q\(/i.test(text);
  const looksDefinition = lowered.includes("is ") || lowered.includes("refers to") || text.includes("定义");

  return {
    sentenceId,
    kind: looksFormula ? "formula" : looksDefinition ? "definition" : "intuition",
    difficulty: looksFormula ? "high" : text.length > 180 ? "medium" : "low",
    shortGloss: looksFormula ? "公式或符号关系，需要拆项理解。" : "本页概念推进句。",
    likelyQuestion: looksFormula ? "这个公式每一项是什么意思？" : "这句话在本页想说明什么？",
    examHint: "能用自己的话复述，并说明它和前后内容的关系。"
  };
}

function hasSentenceShape(value: unknown): value is SentenceRecord {
  if (!value || typeof value !== "object") return false;
  const sentence = value as Partial<SentenceRecord>;
  return typeof sentence.id === "string"
    && typeof sentence.pageNumber === "number"
    && typeof sentence.indexOnPage === "number"
    && typeof sentence.text === "string";
}

function isSentenceLabel(value: unknown): value is SentenceLabel {
  if (!value || typeof value !== "object") return false;
  const label = value as Partial<SentenceLabel>;
  return typeof label.sentenceId === "string"
    && ["definition", "formula", "intuition", "procedure", "warning", "example", "other"].includes(label.kind || "")
    && ["low", "medium", "high"].includes(label.difficulty || "")
    && typeof label.shortGloss === "string"
    && typeof label.likelyQuestion === "string";
}

function sendAiError(res: { status: (code: number) => { json: (body: unknown) => void } }, error: unknown) {
  if (error instanceof AIProviderError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }
  res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
}
