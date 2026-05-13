import type { SentenceRecord } from "../../shared/contracts";

export function compactWhitespace(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

export function splitIntoSentences(pageText: string, pageNumber: number): SentenceRecord[] {
  const clean = compactWhitespace(pageText);
  if (!clean) return [];
  const regex = /[^.!?。！？；;]+(?:[.!?。！？；;]+|$)/g;
  const sentences: SentenceRecord[] = [];
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = regex.exec(clean)) !== null) {
    const text = match[0].trim();
    if (text.length < 3) continue;
    sentences.push({
      id: `p${pageNumber}-s${index}`,
      pageNumber,
      indexOnPage: index,
      text,
      startOffset: match.index,
      endOffset: match.index + match[0].length
    });
    index += 1;
  }
  if (!sentences.length && clean) {
    sentences.push({ id: `p${pageNumber}-s0`, pageNumber, indexOnPage: 0, text: clean, startOffset: 0, endOffset: clean.length });
  }
  return sentences;
}

export function buildNearbyContext(pageText: string, selectedText: string, radius = 900) {
  const cleanPage = compactWhitespace(pageText);
  const cleanSelected = compactWhitespace(selectedText);
  if (!cleanPage) return "";
  if (!cleanSelected) return cleanPage.slice(0, radius * 2);
  const needle = cleanSelected.toLowerCase().slice(0, Math.min(80, cleanSelected.length));
  const index = cleanPage.toLowerCase().indexOf(needle);
  if (index < 0) return cleanPage.slice(0, radius * 2);
  const start = Math.max(0, index - radius);
  const end = Math.min(cleanPage.length, index + cleanSelected.length + radius);
  return cleanPage.slice(start, end);
}

export function makePdfId(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`.replace(/[^a-zA-Z0-9._-]+/g, "_");
}
