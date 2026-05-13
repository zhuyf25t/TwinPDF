import type { AssistMode, AssistRequest, FinalizeRequest, LabelPageRequest, SentenceLabel, StudyLogEntry } from "../../src/shared/contracts";
import type { ChatMessage } from "./deepseek";

const LEARNING_ASSISTANT_SYSTEM = `你是 TwinPDF 的 AI Assist，一个耐心、强、同频的中文学习助教。
用户正在左侧阅读英文原课件，右侧对照中文讲义。你的目标不是机械翻译，而是帮助用户快速理解当前页。

回答要求：
- 默认使用中文，保留关键 English terms、公式符号和变量名。
- 先讲直觉，再讲形式化含义；不要一上来堆冷冰冰的 bullet list。
- 聚焦选中文本在本页的作用：它在定义什么、连接什么、提醒什么，哪里容易误解。
- 如果用户要求翻译，可以给自然中文解释，但要保留术语原文。
- 如果内容复杂，可以用短小标题和少量 bullet；默认控制在 2-5 个短段落。
- 不要编造课件和上下文中没有的事实。`;

export function buildAssistMessages(payload: AssistRequest): ChatMessage[] {
  const mode = payload.mode ?? "explain";
  const question = payload.question?.trim() || defaultQuestionForMode(mode);
  const user = `课程：${payload.courseTitle || "未命名课程"}
工作区：${payload.workspaceName || "未命名工作区"}
页码：${payload.pageLabel || payload.pageNumber || "未知"}
模式：${mode}

【本次任务】
${modeInstruction(mode)}

【选中英文原文】
${payload.selectedText?.trim() || "（无选中文本）"}

【用户问题】
${question}

【本页附近上下文】
${clip(payload.pageContext, 3000)}

【右侧中文讲义摘录】
${clip(payload.rightNoteContext, 1800)}

【本页句子标签缓存】
${formatLabels(payload.sentenceLabels)}

【最近保存的问答】
${formatRecentEntries(payload.recentEntries)}

请给出一个像真人 TA 一样有帮助的回答。`;

  return [
    { role: "system", content: LEARNING_ASSISTANT_SYSTEM },
    { role: "user", content: user }
  ];
}

export function buildLabelPageMessages(payload: LabelPageRequest): ChatMessage[] {
  return [
    {
      role: "system",
      content: `你是 TwinPDF 的课件句子标注器。只输出合法 JSON，不输出 Markdown 代码块或解释文字。
你要判断每个 sentenceId 在本页里的功能，而不是长篇解释。

输出格式必须是：
{"labels":[{"sentenceId":"...","kind":"definition|formula|intuition|procedure|warning|example|other","difficulty":"low|medium|high","shortGloss":"不超过40个中文字","likelyQuestion":"学生可能会问的问题","examHint":"可选，考试提醒"}]}`
    },
    {
      role: "user",
      content: `课程：${payload.courseTitle || "未命名课程"}
PDF：${payload.pdfName || "未命名 PDF"}
页码：${payload.pageNumber}

【页面文本】
${clip(payload.pageText, 3600)}

【句子列表】
${JSON.stringify(payload.sentences, null, 2)}

请为句子列表中的每个 sentenceId 返回一个 label。`
    }
  ];
}

export function buildFinalizeMessages(payload: FinalizeRequest): ChatMessage[] {
  return [
    {
      role: "system",
      content: `你是 TwinPDF 的课程总结助教。请根据用户保存的学习问答，生成一份中文 Markdown 个人子讲义。
要求像写给自己考前复习用的讲义，不要空泛；保留关键 English terms、公式符号和变量名。
输出纯 Markdown，不要包裹代码块。`
    },
    {
      role: "user",
      content: `请生成最终个人子讲义。

课程：${payload.courseTitle || "未命名课程"}
工作区：${payload.workspaceName || "未命名工作区"}

建议结构：
# ${payload.courseTitle || "个人子讲义"}
## 本节主线
## 关键概念和容易混淆点
## 已保存问答整理
## 考前复习清单
## 下次继续学习前要确认的问题

【保存的学习日志】
${formatEntries(payload.entries)}`
    }
  ];
}

function defaultQuestionForMode(mode: AssistMode) {
  if (mode === "translate") return "请解释这段英文的准确含义，并保留关键术语。";
  if (mode === "example") return "请给一个具体小例子，让我马上理解这句话。";
  if (mode === "question") return "请回答我关于这段内容的问题。";
  return "请用通俗语言解释这句话在本页中的作用。";
}

function modeInstruction(mode: AssistMode) {
  if (mode === "translate") return "把选中英文讲成自然中文，保留关键 English terms，不要只做逐词翻译。";
  if (mode === "example") return "用一个贴近课件的小例子解释，先例子后抽象。";
  if (mode === "question") return "优先回答用户问题，同时把答案和选中文本、本页上下文对齐。";
  return "解释选中文本的核心意思、直觉、在本页的作用，以及容易误解的点。";
}

function formatLabels(labels: SentenceLabel[] | undefined) {
  if (!labels?.length) return "（无）";
  return JSON.stringify(labels.slice(0, 16), null, 2);
}

function formatRecentEntries(entries: AssistRequest["recentEntries"]) {
  if (!entries?.length) return "（无）";
  return entries
    .slice(0, 4)
    .map((entry, index) => `${index + 1}. 页码：${entry.pageLabel || "未知"}
选中：${clip(entry.selectedText, 180)}
Q：${clip(entry.question, 180)}
A：${clip(entry.answer, 260)}`)
    .join("\n\n");
}

function formatEntries(entries: StudyLogEntry[]) {
  if (!entries.length) {
    return "（还没有保存问答。请生成一个空白但有用的复习模板，提醒用户先把关键问答加入个人子讲义。）";
  }

  return entries
    .map((entry, index) => `### Entry ${index + 1}
页码：${entry.pageLabel || entry.pageNumber || "未知"}
模式：${entry.mode}
选中英文：
${clip(entry.selectedText, 1200)}

用户问题：
${entry.question || "请解释这段内容。"}

AI 回答：
${clip(entry.answer, 1800)}`)
    .join("\n\n---\n\n");
}

function clip(input = "", max = 1000) {
  const normalized = input.trim();
  if (normalized.length <= max) return normalized || "（无）";
  return `${normalized.slice(0, max)}...`;
}
