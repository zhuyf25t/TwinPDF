# Sentence Pipeline Spec

## Why sentence splitting exists
The user often wants instant explanation of a selected sentence. PDF text selection can be messy, so TwinPDF should extract a per-page sentence index on import.

## Import pipeline

```text
PDF loaded
  ↓
extract page text with PDF.js
  ↓
normalize whitespace
  ↓
split into sentence-like units
  ↓
save cache/sentences/<pdf-id>.json
  ↓
background label pages through /api/ai/label-page
  ↓
save cache/page-labels/<pdf-id>/page-XXXX.json
```

## Sentence record

```ts
type SentenceRecord = {
  id: string;
  pageNumber: number;
  indexOnPage: number;
  text: string;
  startOffset?: number;
  endOffset?: number;
};
```

## Label record

```ts
type SentenceLabel = {
  sentenceId: string;
  kind: "definition" | "formula" | "intuition" | "procedure" | "warning" | "example" | "other";
  difficulty: "low" | "medium" | "high";
  shortGloss: string;
  likelyQuestion: string;
  examHint?: string;
};
```

## Label prompt intent
For each page, send:

- course title;
- page number;
- page text;
- sentence list.

Ask AI to label what each sentence is doing, not to produce long explanations. This makes later explanation prompts faster and richer.

## Speed principle
Do not block reading. Sentence extraction can run immediately; AI labels should run in the background with small concurrency and skip cached pages.

## Minimum MVP
MVP must at least:

- extract current page text;
- split page text into sentences;
- save sentence cache in workspace;
- expose `/api/ai/label-page` and one background call path.

Hardening should label all pages and show progress.
