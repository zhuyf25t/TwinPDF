import type { SentenceRecord } from "../../shared/contracts";

export const PDF_SENTENCE_LIMITS = {
  maxPageTextChars: 20_000,
  maxSentenceChars: 900,
  maxSentencesPerPage: 180
} as const;

const ABBREVIATION_PATTERN =
  /\b(?:e\.g|i\.e|etc|vs|fig|eq|sec|ch|no|dr|mr|mrs|ms|prof|inc|ltd|al|cf|ref|approx)\.$/i;
const INITIALISM_PATTERN = /\b(?:[A-Z]\.){2,}$/;
const CLOSING_PUNCTUATION = new Set([")", "]", "}", '"', "'", "\u201d", "\u2019", "\u300d", "\u300f", "\uff09", "\u3011"]);
const SENTENCE_TERMINATORS = new Set([".", "?", "!", ";", "\u3002", "\uff1f", "\uff01", "\uff1b"]);
const CJK_PATTERN = /[\u3400-\u9fff\uf900-\ufaff]/;
const BULLET_PATTERN = /^(?:[-*\u2022\u00b7\u25aa\u25ab\u25e6\u203e\u2043]|\(?[0-9]{1,3}[.)]|\(?[A-Za-z][.)])\s+/;
const FORMULA_PATTERN = /(?:[=<>*/^]|\s[+\-]\s|\u2260|\u2248|\u2264|\u2265|\u00b1|\u00d7|\u00f7|\u2211|\u220f|\u222b|\u221a|\u221e|\u2202|\u2207|\u2192|\u2190|\u2194|\u2200|\u2203|\u2208|\u222a|\u2229|\\[A-Za-z]+|\b(?:log|exp|argmax|argmin|Pr)\b)/;

export function compactWhitespace(input: string) {
  return normalizePdfText(input).replace(/\s+/g, " ").trim();
}

export function normalizePdfText(input: string, preserveLineBreaks = false) {
  const normalized = safeNormalize(input)
    .replace(/\u00ad/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/([A-Za-z])-\s*\n\s*([a-z])/g, "$1$2")
    .replace(/[\t\f\v\u00a0]+/g, " ");

  if (!preserveLineBreaks) return normalized.replace(/\s+/g, " ").trim();

  return normalized
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function boundPageText(pageText: string) {
  const clean = normalizePdfText(pageText, true);
  return clean.length > PDF_SENTENCE_LIMITS.maxPageTextChars
    ? clean.slice(0, PDF_SENTENCE_LIMITS.maxPageTextChars).trim()
    : clean;
}

export function splitIntoSentences(pageText: string, pageNumber: number): SentenceRecord[] {
  const boundedText = boundPageText(pageText);
  const cleanForOffsets = compactWhitespace(boundedText);
  if (!cleanForOffsets) return [];

  const candidates = buildTextBlocks(boundedText).flatMap(splitBlockIntoSentences);
  const sentences: SentenceRecord[] = [];
  let offsetCursor = 0;

  for (const candidate of candidates) {
    for (const text of chunkLongSentence(compactWhitespace(candidate))) {
      if (text.length < 2 || sentences.length >= PDF_SENTENCE_LIMITS.maxSentencesPerPage) break;
      const startOffset = findOffset(cleanForOffsets, text, offsetCursor);
      const endOffset = startOffset >= 0 ? startOffset + text.length : undefined;
      sentences.push({
        id: `p${pageNumber}-s${sentences.length}`,
        pageNumber,
        indexOnPage: sentences.length,
        text,
        startOffset: startOffset >= 0 ? startOffset : undefined,
        endOffset
      });
      if (startOffset >= 0) offsetCursor = startOffset + text.length;
    }
    if (sentences.length >= PDF_SENTENCE_LIMITS.maxSentencesPerPage) break;
  }

  if (!sentences.length) {
    const fallback = chunkLongSentence(cleanForOffsets)[0] || cleanForOffsets;
    sentences.push({
      id: `p${pageNumber}-s0`,
      pageNumber,
      indexOnPage: 0,
      text: fallback,
      startOffset: 0,
      endOffset: fallback.length
    });
  }

  return sentences;
}

export function buildNearbyContext(pageText: string, selectedText: string, radius = 900) {
  const cleanPage = compactWhitespace(pageText);
  const cleanSelected = compactWhitespace(selectedText);
  if (!cleanPage) return "";
  if (!cleanSelected) return cleanPage.slice(0, radius * 2);

  const index = locateText(cleanPage, cleanSelected);
  if (index < 0) return cleanPage.slice(0, radius * 2);

  const start = Math.max(0, index - radius);
  const end = Math.min(cleanPage.length, index + cleanSelected.length + radius);
  return cleanPage.slice(start, end);
}

export function findSentenceForSelection(sentences: SentenceRecord[], selectedText: string) {
  const cleanSelected = compactWhitespace(selectedText);
  if (!cleanSelected) return undefined;

  const selectedKey = searchKey(cleanSelected);
  let best: { sentence: SentenceRecord; score: number } | undefined;

  for (const sentence of sentences) {
    const cleanSentence = compactWhitespace(sentence.text);
    const sentenceKey = searchKey(cleanSentence);
    if (!sentenceKey) continue;

    if (sentenceKey.includes(selectedKey) || selectedKey.includes(sentenceKey)) {
      return sentence;
    }

    const score = overlapScore(sentenceKey, selectedKey);
    if (!best || score > best.score) best = { sentence, score };
  }

  return best && best.score >= 0.45 ? best.sentence : undefined;
}

export function makePdfId(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

function buildTextBlocks(pageText: string) {
  const lines = normalizePdfText(pageText, true).split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const blocks: string[] = [];
  let current = "";

  for (const line of lines) {
    if (!current) {
      current = line;
      continue;
    }

    if (shouldStartNewBlock(current, line)) {
      blocks.push(current);
      current = line;
      continue;
    }

    current = joinFragments(current, line);
  }

  if (current) blocks.push(current);
  return blocks;
}

function shouldStartNewBlock(previous: string, next: string) {
  if (BULLET_PATTERN.test(next)) return true;
  if (looksLikeFormula(previous) || looksLikeFormula(next)) return true;
  if (endsWithSentenceTerminator(previous)) return true;
  if (looksLikeHeading(previous) || looksLikeHeading(next)) return true;
  return false;
}

function splitBlockIntoSentences(block: string) {
  const clean = compactWhitespace(block);
  if (!clean) return [];
  if (BULLET_PATTERN.test(clean) || looksLikeFormula(clean)) return [clean];

  const result: string[] = [];
  let start = 0;

  for (let index = 0; index < clean.length; index += 1) {
    const char = clean[index];
    if (!SENTENCE_TERMINATORS.has(char) || !shouldBreakAt(clean, index)) continue;

    const end = consumeClosingPunctuation(clean, index + 1);
    const sentence = clean.slice(start, end).trim();
    if (sentence) result.push(sentence);
    start = skipSpaces(clean, end);
    index = start - 1;
  }

  const tail = clean.slice(start).trim();
  if (tail) result.push(tail);
  return result.length ? result : [clean];
}

function shouldBreakAt(text: string, index: number) {
  const char = text[index];
  const previous = text[index - 1] || "";
  const next = text[index + 1] || "";

  if (char === "." && /\d/.test(previous) && /\d/.test(next)) return false;
  if (char === "." && isProtectedAbbreviation(text, index)) return false;
  if (char === "." && /[a-z]/.test(nextNonSpace(text, index + 1))) return false;
  if ((char === ";" || char === "\uff1b") && looksLikeFormula(text)) return false;
  return true;
}

function isProtectedAbbreviation(text: string, periodIndex: number) {
  const prefix = text.slice(Math.max(0, periodIndex - 24), periodIndex + 1);
  if (ABBREVIATION_PATTERN.test(prefix)) return true;
  if (INITIALISM_PATTERN.test(prefix)) return true;
  return /\b[A-Z]\.$/.test(prefix) && /[A-Z]/.test(nextNonSpace(text, periodIndex + 1));
}

function consumeClosingPunctuation(text: string, start: number) {
  let index = start;
  while (index < text.length) {
    const char = text[index];
    if (SENTENCE_TERMINATORS.has(char) || CLOSING_PUNCTUATION.has(char) || char === "\u2026") {
      index += 1;
      continue;
    }
    break;
  }
  return index;
}

function skipSpaces(text: string, start: number) {
  let index = start;
  while (index < text.length && /\s/.test(text[index])) index += 1;
  return index;
}

function nextNonSpace(text: string, start: number) {
  for (let index = start; index < text.length; index += 1) {
    if (!/\s/.test(text[index])) return text[index];
  }
  return "";
}

function endsWithSentenceTerminator(text: string) {
  const trimmed = text.trim().replace(/[\])}"'\u201d\u2019\u300d\u300f\uff09\u3011]+$/u, "");
  if (!trimmed) return false;
  return SENTENCE_TERMINATORS.has(trimmed[trimmed.length - 1]);
}

function looksLikeHeading(text: string) {
  const clean = compactWhitespace(text);
  if (clean.length > 90 || endsWithSentenceTerminator(clean) || looksLikeFormula(clean)) return false;
  const words = clean.match(/[A-Za-z]{2,}/g) || [];
  return words.length > 0 && words.length <= 8 && words.every((word) => /^[A-Z0-9]/.test(word));
}

function looksLikeFormula(text: string) {
  const clean = compactWhitespace(text);
  if (!FORMULA_PATTERN.test(clean)) return false;

  const words = clean.match(/[A-Za-z]{3,}/g) || [];
  const hasMathKeyword = /\\[A-Za-z]+|\b(?:log|exp|argmax|argmin|Pr)\b/.test(clean);
  const mathSymbolCount = (clean.match(/[=<>*/^]|[\u2260\u2248\u2264\u2265\u00b1\u00d7\u00f7\u2211\u220f\u222b\u221a\u221e\u2202\u2207\u2192\u2190\u2194\u2200\u2203\u2208\u222a\u2229]|\s[+\-]\s/g) || []).length;
  return clean.length <= 240 && (mathSymbolCount >= 2 || hasMathKeyword) && words.length <= 18;
}

function joinFragments(left: string, right: string) {
  if (!left) return right;
  if (!right) return left;
  const last = left[left.length - 1];
  const first = right[0];
  return CJK_PATTERN.test(last) && CJK_PATTERN.test(first) ? `${left}${right}` : `${left} ${right}`;
}

function chunkLongSentence(text: string) {
  const chunks: string[] = [];
  let rest = text.trim();
  const limit = PDF_SENTENCE_LIMITS.maxSentenceChars;

  while (rest.length > limit) {
    const breakAt = findChunkBreak(rest, limit);
    chunks.push(rest.slice(0, breakAt).trim());
    rest = rest.slice(breakAt).trim();
  }

  if (rest) chunks.push(rest);
  return chunks;
}

function findChunkBreak(text: string, limit: number) {
  const windowStart = Math.max(220, Math.floor(limit * 0.55));
  const slice = text.slice(windowStart, limit);
  const punctuation = Math.max(slice.lastIndexOf(","), slice.lastIndexOf("\uff0c"), slice.lastIndexOf(":"), slice.lastIndexOf("\uff1a"));
  if (punctuation >= 0) return windowStart + punctuation + 1;
  const space = slice.lastIndexOf(" ");
  if (space >= 0) return windowStart + space + 1;
  return limit;
}

function findOffset(haystack: string, needle: string, from: number) {
  const direct = haystack.indexOf(needle, from);
  if (direct >= 0) return direct;
  return haystack.indexOf(needle);
}

function locateText(pageText: string, selectedText: string) {
  const direct = pageText.toLowerCase().indexOf(selectedText.toLowerCase());
  if (direct >= 0) return direct;

  const selectedPrefix = selectedText.slice(0, Math.min(120, selectedText.length));
  const prefix = pageText.toLowerCase().indexOf(selectedPrefix.toLowerCase());
  if (prefix >= 0) return prefix;

  const pageKey = searchKey(pageText);
  const selectedKey = searchKey(selectedText).slice(0, 120);
  if (!pageKey || !selectedKey) return -1;

  const keyIndex = pageKey.indexOf(selectedKey);
  if (keyIndex < 0) return -1;
  return Math.max(0, Math.floor((keyIndex / pageKey.length) * pageText.length) - 20);
}

function searchKey(input: string) {
  return compactWhitespace(input).toLowerCase().replace(/[^\p{L}\p{N}\u3400-\u9fff]+/gu, "");
}

function overlapScore(leftKey: string, rightKey: string) {
  const shorter = leftKey.length <= rightKey.length ? leftKey : rightKey;
  const longer = leftKey.length > rightKey.length ? leftKey : rightKey;
  if (!shorter || !longer) return 0;

  const probeLength = Math.min(80, Math.max(12, Math.floor(shorter.length * 0.65)));
  const probe = shorter.slice(0, probeLength);
  return longer.includes(probe) ? probe.length / Math.max(shorter.length, 1) : 0;
}

function safeNormalize(input: string) {
  try {
    return input.normalize("NFC");
  } catch {
    return input;
  }
}
