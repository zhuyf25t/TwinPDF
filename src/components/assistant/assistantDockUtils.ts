import type { AssistMode, AssistantDockMode, SelectedContext } from "../../shared/contracts";

export type AnswerSnapshot = {
  id: string;
  fingerprint: string;
  selectionSignature: string;
  text: string;
  question: string;
  mode: AssistMode;
  selectedText: string;
  translationSurface: string;
  pageContext: string;
  rightNoteContext: string;
  pageLabel?: string;
  pageNumber?: number;
  source?: SelectedContext["source"];
  sentenceId?: string;
};

export const modeLabels: Record<AssistMode, string> = {
  explain: "解释",
  translate: "翻译",
  example: "举例",
  question: "追问"
};

export const emptySelection = "在左侧英文 PDF 中选中一句话或一段文字，这里会立即更新。";
export const emptyTranslation = "这里是普通网页文本，可直接被浏览器翻译。";
export const emptyAnswer = "点击解释，或在下方输入你的问题。";

export function defaultQuestionForMode(mode: AssistMode) {
  if (mode === "translate") return "请解释这段英文的准确含义，并保留关键术语。";
  if (mode === "example") return "请给一个非常具体的小例子，让我能立刻理解。";
  if (mode === "question") return "请结合这段原文和本页上下文回答我的问题。";
  return "请用通俗语言解释这句话在本页中的作用。";
}

export function makeQuestion(mode: AssistMode, question: string) {
  return question.trim() || defaultQuestionForMode(mode);
}

export function clampDockHeight(height: number) {
  const viewportMax = typeof window === "undefined" ? 540 : Math.floor(window.innerHeight * 0.55);
  return Math.max(260, Math.min(viewportMax, Number.isFinite(height) ? height : 316));
}

export function heightForDockMode(height: number, dockMode: AssistantDockMode) {
  if (dockMode === "collapsed") return 48;
  if (dockMode === "expanded") return Math.max(340, clampDockHeight(height));
  return Math.min(320, Math.max(260, Number.isFinite(height) ? height : 316));
}

export function friendlyError(error: unknown, action: string) {
  const message = error instanceof Error ? error.message : String(error);
  if (/Failed to fetch|NetworkError|fetch/i.test(message)) {
    return `${action}没有完成：本地服务暂时不可用，请确认 npm run dev 还在运行。`;
  }
  return `${action}没有完成：${message}`;
}

export function makeFingerprint(selectedText: string, question: string, answer: string) {
  return [selectedText.trim(), question.trim(), answer.trim()].join("\u001e");
}
