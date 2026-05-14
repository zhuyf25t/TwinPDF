import type { PdfSentenceIndex, TermLabel, TermLabelIndex } from "../../shared/contracts";

const WORD_RE = /[A-Za-z][A-Za-z0-9]*(?:[-_/&][A-Za-z0-9]+)*/g;
const MAX_TERMS = 1400;
const LOCAL_FUNCTION_WORD_LABELS: Record<string, Pick<TermLabel, "chinese" | "definition">> = {
  a: { chinese: "一个", definition: "不定冠词，用来引出一个泛指对象。" },
  an: { chinese: "一个", definition: "元音音素前的不定冠词，用来引出一个泛指对象。" },
  the: { chinese: "这个；该", definition: "定冠词，指上下文里已经明确的对象。" },
  are: { chinese: "是；为", definition: "be 动词的复数或第二人称形式，用来连接主语和说明内容。" },
  is: { chinese: "是；为", definition: "be 动词的第三人称单数形式，用来连接主语和说明内容。" },
  was: { chinese: "曾是", definition: "be 动词过去式，用来描述过去状态。" },
  were: { chinese: "曾是", definition: "be 动词过去式复数或第二人称形式。" },
  be: { chinese: "是；成为", definition: "be 动词原形，用来表达状态或存在。" },
  been: { chinese: "曾经是", definition: "be 动词过去分词，常和完成时一起出现。" },
  being: { chinese: "正在是；作为", definition: "be 动词现在分词，也可表示“存在物/状态”。" },
  and: { chinese: "和；并且" },
  or: { chinese: "或者" },
  not: { chinese: "不；并非" },
  of: { chinese: "的；属于", definition: "介词，用来说明所属、组成或关系。" },
  to: { chinese: "到；为了", definition: "介词或不定式标记，表示方向、目的或动作对象。" },
  in: { chinese: "在……中", definition: "介词，表示位置、范围或上下文。" },
  on: { chinese: "在……上；关于", definition: "介词，表示位置、依赖关系或讨论主题。" },
  for: { chinese: "为了；对于", definition: "介词，表示目的、对象或持续时间。" },
  with: { chinese: "和；带有", definition: "介词，表示伴随、工具或具有某种属性。" },
  by: { chinese: "由；通过", definition: "介词，表示执行者、方式或依据。" },
  as: { chinese: "作为；当作", definition: "介词或连词，表示身份、方式或比较关系。" },
  at: { chinese: "在；以", definition: "介词，表示位置、时间点或具体状态。" },
  from: { chinese: "从；来自", definition: "介词，表示来源、起点或分离。" },
  this: { chinese: "这个" },
  that: { chinese: "那个；那件事" },
  these: { chinese: "这些" },
  those: { chinese: "那些" }
};

export function normalizeTermKey(term: string) {
  return term.trim().toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, "");
}

export function getLocalTermLabel(term: string): TermLabel | undefined {
  const key = normalizeTermKey(term);
  const label = LOCAL_FUNCTION_WORD_LABELS[key];
  if (!label) return undefined;
  return {
    term,
    normalized: key,
    chinese: label.chinese,
    definition: label.definition,
    source: "local",
    updatedAt: new Date().toISOString()
  };
}

export function extractTermsFromPdfIndex(index: PdfSentenceIndex) {
  const seen = new Set<string>();
  const terms: string[] = [];

  for (const page of index.pages) {
    const text = page.pageText || page.sentences.map((sentence) => sentence.text).join(" ");
    for (const match of text.matchAll(WORD_RE)) {
      const term = match[0].trim();
      const key = normalizeTermKey(term);
      if (!shouldKeepTerm(term, key) || seen.has(key)) continue;
      seen.add(key);
      terms.push(term);
      if (terms.length >= MAX_TERMS) return terms;
    }
  }

  return terms;
}

export function buildTermContext(index: PdfSentenceIndex, maxChars = 5200) {
  const chunks: string[] = [];
  let used = 0;
  for (const page of index.pages.slice(0, 18)) {
    const text = page.pageText.trim();
    if (!text) continue;
    const chunk = `Page ${page.pageNumber}: ${text.slice(0, 600)}`;
    if (used + chunk.length > maxChars) break;
    chunks.push(chunk);
    used += chunk.length;
  }
  return chunks.join("\n\n");
}

export function labelArrayToMap(labels: TermLabel[]) {
  const map = new Map<string, TermLabel>();
  for (const label of labels) {
    const key = normalizeTermKey(label.normalized || label.term);
    if (key) map.set(key, { ...label, normalized: key });
  }
  return map;
}

export function mergeTermLabels(existing: TermLabel[], incoming: TermLabel[]) {
  const byKey = labelArrayToMap(existing);
  for (const label of incoming) {
    const key = normalizeTermKey(label.normalized || label.term);
    if (key) byKey.set(key, { ...label, normalized: key });
  }
  return [...byKey.values()].sort((a, b) => a.normalized.localeCompare(b.normalized));
}

export function makeTermLabelIndex(pdfId: string, pdfName: string, labels: TermLabel[], model?: string): TermLabelIndex {
  const now = new Date().toISOString();
  return {
    pdfId,
    pdfName,
    model,
    labels: mergeTermLabels([], labels),
    createdAt: now,
    updatedAt: now
  };
}

function shouldKeepTerm(term: string, key: string) {
  if (!key) return false;
  if (LOCAL_FUNCTION_WORD_LABELS[key]) return false;
  if (key.length < 2 && term === term.toLowerCase()) return false;
  if (/^\d+$/.test(key)) return false;
  return true;
}
