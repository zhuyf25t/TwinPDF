import type { AssistRequest, FinalizeRequest, LabelPageRequest, StudyLogEntry } from "../../src/shared/contracts";
import type { ChatMessage } from "./deepseek";

const LEARNING_ASSISTANT_SYSTEM = `你是 TwinPDF 的 AI Assist：一个强大、温暖、同频的中文学习助手。用户正在看英文课件，并且需要真正理解而不是机械翻译。

回答要求：
- 默认用中文回答，保留关键英文术语。
- 不要像冰冷文档一样只会分点；先用自然语言解释“这句话其实在说什么”。
- 如果涉及公式，先讲直觉，再讲符号。
- 语言要通俗，但不能胡说。
- 控制长度：默认 2-5 个短段落；如果问题复杂，可以用小标题和少量 bullet。
- 结合选中文本、上下文和右侧中文讲义。
- 明确指出本页中它的作用、容易混的点、考试可能怎么问。
- 不要编造课件外的事实。`;

export function buildAssistMessages(payload: AssistRequest): ChatMessage[] {
  const user = `课程：${payload.courseTitle || "未命名课程"}
工作区：${payload.workspaceName || "未命名工作区"}
页码：${payload.pageLabel || payload.pageNumber || "未知"}
模式：${payload.mode || "explain"}

【选中文本】
${payload.selectedText || "（无）"}

【用户问题】
${payload.question || "请解释这段内容。"}

【本页附近上下文】
${clip(payload.pageContext, 2600)}

【右侧中文讲义摘录】
${clip(payload.rightNoteContext, 1800)}

【句子标签缓存】
${JSON.stringify(payload.sentenceLabels || [], null, 2).slice(0, 1200)}

【最近问答摘要】
${(payload.recentEntries || []).map((entry, index) => `${index + 1}. Q: ${clip(entry.question, 160)}\nA: ${clip(entry.answer, 240)}`).join("\n\n") || "（无）"}

请给出一个真实帮助学习的回答。`;
  return [
    { role: "system", content: LEARNING_ASSISTANT_SYSTEM },
    { role: "user", content: user }
  ];
}

export function buildLabelPageMessages(payload: LabelPageRequest): ChatMessage[] {
  return [
    {
      role: "system",
      content: "你是课件句子标注器。只输出 JSON，不输出 markdown。为每个 sentenceId 给出 kind、difficulty、shortGloss、likelyQuestion、examHint。shortGloss 必须短。不要长篇解释。"
    },
    {
      role: "user",
      content: `课程：${payload.courseTitle || "未命名课程"}\nPDF：${payload.pdfName}\n页码：${payload.pageNumber}\n\n【页面文本】\n${clip(payload.pageText, 3000)}\n\n【句子列表】\n${JSON.stringify(payload.sentences, null, 2)}\n\n请输出：{"labels":[...]}`
    }
  ];
}

export function buildFinalizeMessages(payload: FinalizeRequest): ChatMessage[] {
  return [
    {
      role: "system",
      content: "你是 TwinPDF 的课程总结助手。请根据用户保存的学习问答，生成一份中文 Markdown 个人子讲义。要像给自己考前复习用，不要空泛。保留英文关键术语。"
    },
    {
      role: "user",
      content: `请生成最终个人子讲义。\n课程：${payload.courseTitle}\n工作区：${payload.workspaceName || "未命名"}\n\n【保存的学习日志】\n${formatEntries(payload.entries)}`
    }
  ];
}

function formatEntries(entries: StudyLogEntry[]) {
  if (!entries.length) return "（没有保存的问答，请生成一个提醒用户先加入问答的空白模板。）";
  return entries.map((entry, index) => `## Entry ${index + 1}
页码：${entry.pageLabel || "未知"}
原文：${entry.selectedText}
翻译区：${entry.translationSurface}
问题：${entry.question}
AI回答：${entry.answer}`).join("\n\n---\n\n");
}

function clip(input = "", max = 1000) {
  return input.length > max ? `${input.slice(0, max)}…` : input;
}
