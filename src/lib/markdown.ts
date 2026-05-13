import type { StudyLogEntry } from "../shared/contracts";

type SubhandoutOptions = {
  title?: string;
  workspaceName?: string;
  generatedReviewMarkdown?: string;
  createdAt?: Date;
};

export function renderSimpleMarkdown(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];
  let quoteLines: string[] = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${paragraph.map(renderInlineMarkdown).join("<br />")}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!listItems.length) return;
    html.push(`<ul>${listItems.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</ul>`);
    listItems = [];
  };

  const flushQuote = () => {
    if (!quoteLines.length) return;
    const body = quoteLines.map((line) => line ? `<p>${renderInlineMarkdown(line)}</p>` : "<br />").join("");
    html.push(`<blockquote>${body}</blockquote>`);
    quoteLines = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (!line.trim()) {
      flushParagraph();
      flushList();
      flushQuote();
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      flushQuote();
      const level = heading[1].length;
      html.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    const list = /^[-*]\s+(.+)$/.exec(line);
    if (list) {
      flushParagraph();
      flushQuote();
      listItems.push(list[1]);
      continue;
    }

    const quote = /^>\s?(.*)$/.exec(line);
    if (quote) {
      flushParagraph();
      flushList();
      quoteLines.push(quote[1]);
      continue;
    }

    flushList();
    flushQuote();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  flushQuote();

  return html.join("\n");
}

export function buildPersonalSubhandoutMarkdown(entries: StudyLogEntry[], options: SubhandoutOptions = {}) {
  return buildSubhandoutMarkdown(entries, {
    title: options.title || "个人子讲义",
    workspaceName: options.workspaceName,
    generatedReviewMarkdown: options.generatedReviewMarkdown,
    createdAt: options.createdAt
  });
}

export function buildFinalSummaryMarkdown(options: SubhandoutOptions & { courseTitle: string; entries: StudyLogEntry[] }) {
  return buildSubhandoutMarkdown(options.entries, {
    title: `个人子讲义：${options.courseTitle || "本次课程"}`,
    workspaceName: options.workspaceName,
    generatedReviewMarkdown: options.generatedReviewMarkdown,
    createdAt: options.createdAt
  });
}

export function ensureFinalSummaryMarkdown(options: SubhandoutOptions & { courseTitle: string; entries: StudyLogEntry[] }) {
  const candidate = options.generatedReviewMarkdown?.trim() || "";
  if (candidate && hasFinalSections(candidate) && preservesEntries(candidate, options.entries)) {
    return candidate.endsWith("\n") ? candidate : `${candidate}\n`;
  }
  return buildFinalSummaryMarkdown(options);
}

function buildSubhandoutMarkdown(entries: StudyLogEntry[], options: Required<Pick<SubhandoutOptions, "title">> & Omit<SubhandoutOptions, "title">) {
  const sortedEntries = [...entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const formulaEntries = sortedEntries.filter(isFormulaOrDefinitionEntry);
  const createdAt = options.createdAt || new Date();
  const lines = [`# ${options.title}`, "", `生成时间：${formatDateTime(createdAt)}`];
  if (options.workspaceName) lines.push(`工作区：${options.workspaceName}`);
  lines.push("", "## 本节核心问题");

  if (!sortedEntries.length) {
    lines.push("", "还没有保存的问答。先在 AI Assist 中把关键问题加入个人子讲义，再生成课程总结。", "");
  } else {
    for (const entry of sortedEntries) {
      lines.push(`- ${pageRef(entry)}：${oneLine(entry.question || "请解释这段内容")}`);
    }
    lines.push("");
  }

  if (options.generatedReviewMarkdown?.trim()) {
    lines.push("## AI 复习整理", "", stripTopHeading(options.generatedReviewMarkdown.trim()), "");
  }

  lines.push("## 我问过的问题", "");
  if (!sortedEntries.length) {
    lines.push("暂无。", "");
  } else {
    for (const [index, entry] of sortedEntries.entries()) {
      lines.push(`${index + 1}. ${pageRef(entry)}：${oneLine(entry.question || "请解释这段内容")}`);
    }
    lines.push("");
  }

  lines.push("## 易错概念", "");
  if (!sortedEntries.length) {
    lines.push("暂无。", "");
  } else {
    for (const entry of sortedEntries) {
      lines.push(`- ${pageRef(entry)}：复习「${clip(oneLine(entry.selectedText), 60)}」时，回看问题「${oneLine(entry.question || "请解释这段内容")}」。`);
    }
    lines.push("");
  }

  lines.push("## 句子级解释", "");
  if (!sortedEntries.length) {
    lines.push("暂无。", "");
  } else {
    for (const [index, entry] of sortedEntries.entries()) {
      lines.push(`### ${index + 1}. ${pageRef(entry)}`, "", "**选中原文**", "", quoteBlock(entry.selectedText));
      if (entry.translationSurface?.trim()) lines.push("", "**浏览器翻译区**", "", quoteBlock(entry.translationSurface));
      lines.push("", "**我的问题**", "", entry.question || "请解释这段内容。", "", "**AI 回答**", "", entry.answer || "（无）", "");
    }
  }

  lines.push("## 公式与定义", "");
  if (!formulaEntries.length) {
    lines.push("本次保存的问答中没有明显的公式或定义条目。", "");
  } else {
    for (const entry of formulaEntries) {
      lines.push(`- ${pageRef(entry)}：${clip(oneLine(entry.selectedText), 110)}`);
    }
    lines.push("");
  }

  lines.push("## 考前复习清单", "");
  if (!sortedEntries.length) {
    lines.push("- [ ] 保存至少一个真实问题。", "- [ ] 重新生成个人子讲义。", "");
  } else {
    for (const entry of sortedEntries) {
      lines.push(`- [ ] 能不用原答案复述：${oneLine(entry.question || "这段内容是什么意思？")}`);
    }
    lines.push("");
  }

  lines.push("## 原始问答日志", "");
  if (!sortedEntries.length) {
    lines.push("暂无原始问答。", "");
  } else {
    for (const [index, entry] of sortedEntries.entries()) {
      lines.push(`### ${index + 1}. ${pageRef(entry)}`, "");
      lines.push(`- 时间：${entry.createdAt || "未知"}`);
      lines.push(`- 来源：${entry.source || "left-pdf"}`);
      if (entry.sentenceId) lines.push(`- 句子 ID：${entry.sentenceId}`);
      lines.push("", "**选中原文**", "", quoteBlock(entry.selectedText));
      if (entry.translationSurface?.trim()) lines.push("", "**浏览器翻译区**", "", quoteBlock(entry.translationSurface));
      lines.push("", "**问题**", "", entry.question || "请解释这段内容。", "", "**回答**", "", entry.answer || "（无）");
      if (entry.pageContext?.trim()) lines.push("", "**页面上下文摘录**", "", quoteBlock(clip(entry.pageContext, 600)));
      if (entry.rightNoteContext?.trim()) lines.push("", "**右侧讲义摘录**", "", quoteBlock(clip(entry.rightNoteContext, 600)));
      lines.push("");
    }
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

function renderInlineMarkdown(input: string) {
  return escapeHtml(input)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

export function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function pageRef(entry: StudyLogEntry) {
  if (entry.pageLabel?.trim()) return entry.pageLabel.trim();
  if (entry.pageNumber) return `第 ${entry.pageNumber} 页`;
  return "未知页";
}

function quoteBlock(input = "") {
  const text = input.trim() || "（无）";
  return text.split(/\r?\n/).map((line) => `> ${line}`).join("\n");
}

function oneLine(input = "") {
  return input.replace(/\s+/g, " ").trim();
}

function clip(input = "", max = 120) {
  const text = oneLine(input);
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function stripTopHeading(markdown: string) {
  return markdown.replace(/^#\s+.*(?:\r?\n)+/, "").trim();
}

function isFormulaOrDefinitionEntry(entry: StudyLogEntry) {
  const text = `${entry.selectedText}\n${entry.question}\n${entry.answer}`.toLowerCase();
  return /公式|定义|definition|formula|theorem|lemma|equation|[=∑∏≈≤≥]|p\(|q\(|log\s/.test(text);
}

function hasFinalSections(markdown: string) {
  return [
    "## 本节核心问题",
    "## 我问过的问题",
    "## 易错概念",
    "## 句子级解释",
    "## 公式与定义",
    "## 考前复习清单",
    "## 原始问答日志"
  ].every((section) => markdown.includes(section));
}

function preservesEntries(markdown: string, entries: StudyLogEntry[]) {
  const body = oneLine(markdown);
  return entries.every((entry) => (
    includesSnippet(body, pageRef(entry), 4)
    && includesSnippet(body, entry.question, 16)
    && includesSnippet(body, entry.selectedText, 24)
    && includesSnippet(body, entry.answer, 24)
  ));
}

function includesSnippet(body: string, input = "", minLength: number) {
  const snippet = oneLine(input).slice(0, minLength);
  return !snippet || body.includes(snippet);
}
