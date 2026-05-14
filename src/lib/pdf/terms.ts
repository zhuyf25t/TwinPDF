import type { PdfSentenceIndex, TermLabel, TermLabelIndex } from "../../shared/contracts";

const WORD_RE = /[A-Za-z][A-Za-z0-9]*(?:[-_/&][A-Za-z0-9]+)*/g;
const MAX_TERMS = 1400;

export function normalizeTermKey(term: string) {
  return term.trim().toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, "");
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
  if (key.length < 2 && term === term.toLowerCase()) return false;
  if (/^\d+$/.test(key)) return false;
  return true;
}
