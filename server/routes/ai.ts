import { Router } from "express";
import { aiConfig } from "../env";
import { AIProviderError, callDeepSeek } from "../lib/deepseek";
import { buildAssistMessages, buildFinalizeMessages, buildLabelPageMessages } from "../lib/prompts";
import { buildTermLabelMessages } from "../prompts/termLabels";
import { buildFinalSummaryMarkdown } from "../../src/lib/markdown";
import type {
  AiHealthResponse,
  AssistRequest,
  AssistResponse,
  FinalizeRequest,
  FinalizeResponse,
  LabelPageRequest,
  LabelPageResponse,
  SentenceLabel,
  SentenceRecord,
  TermLabel,
  TermLabelRequest,
  TermLabelResponse
} from "../../src/shared/contracts";

export const aiRouter = Router();

const MAX_LABEL_SENTENCES = 80;
const MAX_TERM_LABELS = 260;

aiRouter.get("/health", (_req, res) => {
  const config = aiConfig();
  res.json({
    ok: true,
    mockAI: config.mock,
    model: config.mock ? "mock" : config.model,
    hasKey: config.hasKey,
    reasoning: config.reasoning
  } satisfies AiHealthResponse);
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

aiRouter.post("/label-terms", async (req, res) => {
  try {
    const payload = req.body as TermLabelRequest;
    if (!Array.isArray(payload.terms) || !payload.terms.length) {
      res.status(400).json({ error: "词义标注请求缺少 terms。" });
      return;
    }

    const config = aiConfig();
    const boundedPayload: TermLabelRequest = {
      ...payload,
      terms: [...new Set(payload.terms.map((term) => term.trim()).filter(Boolean))].slice(0, MAX_TERM_LABELS)
    };

    const labels = config.mock
      ? boundedPayload.terms.map((term) => mockTermLabel(term))
      : normalizeTermLabels(
        boundedPayload.terms,
        parseTermLabels(await callDeepSeek(buildTermLabelMessages(boundedPayload), {
          temperature: 0.05,
          maxTokens: 5200,
          timeoutMs: 60_000,
          reasoning: true
        }))
      );
    res.json({ labels, mock: config.mock, model: config.mock ? "mock" : config.model } satisfies TermLabelResponse);
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

function parseTermLabels(raw: string): TermLabel[] {
  const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    const parsed = JSON.parse(cleaned) as { labels?: unknown };
    if (!Array.isArray(parsed.labels)) return [];
    return parsed.labels.filter(isTermLabel).map((label) => ({
      ...label,
      normalized: normalizeTermKey(label.normalized || label.term),
      source: "deepseek" as const,
      updatedAt: new Date().toISOString()
    }));
  } catch {
    return [];
  }
}

function normalizeTermLabels(terms: string[], labels: TermLabel[]) {
  const byKey = new Map(labels.map((label) => [normalizeTermKey(label.normalized || label.term), label]));
  return terms.map((term) => byKey.get(normalizeTermKey(term)) || mockTermLabel(term, "deepseek"));
}

function mockTermLabel(term: string, source: "mock" | "deepseek" = "mock"): TermLabel {
  const key = normalizeTermKey(term);
  const dictionary: Record<string, Pick<TermLabel, "chinese" | "definition" | "isProperNoun">> = {
    virtual: { chinese: "虚拟的", definition: "在系统中由软件抽象出来、看起来像真实存在的资源。" },
    memory: { chinese: "内存", definition: "程序运行时存放代码、数据、栈和堆等内容的地址空间。" },
    malloc: { chinese: "动态内存分配", definition: "C 语言中从堆上申请一块内存的库函数。", isProperNoun: true },
    heap: { chinese: "堆", definition: "进程地址空间中用于动态分配内存的区域。" },
    stack: { chinese: "栈", definition: "保存函数调用帧、局部变量和返回地址的内存区域。" },
    kernel: { chinese: "内核", definition: "操作系统中管理硬件资源和保护机制的核心部分。", isProperNoun: true },
    process: { chinese: "进程", definition: "正在运行的程序实例，拥有自己的地址空间。" },
    address: { chinese: "地址", definition: "内存中定位字节或数据对象的位置编号。" },
    protection: { chinese: "保护", definition: "防止进程越权访问其他进程或内核内存的机制。" },
    bound: { chinese: "界限", definition: "Base and Bound 机制中限制可访问地址范围的上界。" },
    base: { chinese: "基址", definition: "地址转换或范围检查中作为起点的地址值。" },
    cache: { chinese: "缓存", definition: "保存常用数据以减少访问延迟的较小高速存储。" },
    page: { chinese: "页", definition: "虚拟内存中固定大小的地址空间管理单位。" },
    segment: { chinese: "段", definition: "按逻辑区域划分的地址空间部分。" },
    management: { chinese: "管理" },
    operating: { chinese: "操作的；运行的" },
    system: { chinese: "系统" },
    hardware: { chinese: "硬件" },
    data: { chinese: "数据" },
    code: { chinese: "代码" }
  };
  const hit = dictionary[key];
  return {
    term,
    normalized: key,
    chinese: hit?.chinese || fallbackChinese(term),
    definition: hit?.definition,
    isProperNoun: hit?.isProperNoun || /^[A-Z]/.test(term) || key.includes("malloc"),
    source,
    updatedAt: new Date().toISOString()
  };
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

function isTermLabel(value: unknown): value is TermLabel {
  if (!value || typeof value !== "object") return false;
  const label = value as Partial<TermLabel>;
  return typeof label.term === "string"
    && typeof label.chinese === "string"
    && (label.normalized === undefined || typeof label.normalized === "string")
    && (label.definition === undefined || typeof label.definition === "string")
    && (label.isProperNoun === undefined || typeof label.isProperNoun === "boolean");
}

function normalizeTermKey(term: string) {
  return term.trim().toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, "");
}

function fallbackChinese(term: string) {
  if (term.length <= 3) return "英文缩写或短词";
  if (/tion$/.test(term)) return "抽象名词";
  if (/ing$/.test(term)) return "动作或过程";
  if (/ed$/.test(term)) return "过去分词或形容词";
  return "课件词汇";
}

function sendAiError(res: { status: (code: number) => { json: (body: unknown) => void } }, error: unknown) {
  if (error instanceof AIProviderError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }
  res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
}
