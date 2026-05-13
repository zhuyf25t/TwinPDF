# Architecture

## High-level

TwinPDF is a local web app with a small backend.

```text
Browser UI (React/Vite)
  ├─ PDF rendering and text extraction
  ├─ local workspace folder via File System Access API
  ├─ selected-text assistant dock
  └─ ordinary HTML translation surface

Node backend (Express)
  ├─ /api/ai/assist
  ├─ /api/ai/label-page
  ├─ /api/ai/finalize
  └─ DeepSeek-compatible API client using env.local

Local workspace folder
  ├─ sources/
  ├─ handouts/
  ├─ memory/
  ├─ exports/
  └─ cache/
```

## Why backend is required
The DeepSeek API key must remain server-side. Browser code must never read `DEEPSEEK_API_KEY`. Therefore, AI calls go through Express.

## Why File System Access API is used
The user wants history saved in a selected local directory, not hidden in browser storage. Chromium/Edge support local directory handles on `localhost` through `showDirectoryPicker`.

## Frontend module map

```text
src/App.tsx
src/components/workspace/WorkspaceGate.tsx
src/components/pdf/PdfPane.tsx
src/components/handout/HandoutPane.tsx
src/components/assistant/AssistantDock.tsx
src/components/summary/FinalSummaryModal.tsx
src/lib/workspace/*
src/lib/pdf/*
src/lib/ai/*
src/shared/contracts.ts
```

## Backend module map

```text
server/index.ts
server/env.ts
server/lib/deepseek.ts
server/lib/prompts.ts
server/routes/ai.ts
```

## Shared contracts
Use `src/shared/contracts.ts` for request/response shapes. Keep frontend and backend aligned by importing the same types.

## Data flow: selection to answer

```text
User selects text in PDF
  ↓
PdfPane emits SelectedContext
  ↓
AssistantDock updates Selected Text + Browser Translation Surface
  ↓
User sends question / quick action
  ↓
Frontend calls /api/ai/assist
  ↓
Server builds DeepSeek prompt with selected text, page context, labels, right-handout excerpt, history
  ↓
Server returns answer
  ↓
Assistant shows answer
  ↓
Manual add or lock auto-add saves entry to workspace memory
```

## Data flow: final summary

```text
memory/study-log.json
  ↓
/api/ai/finalize
  ↓
Markdown personal sublecture
  ↓
exports/personal-sublecture-YYYYMMDD-HHMM.md
memory/personal-subhandout.md
```

## File-size guard
If any file grows above ~350 lines, split it before adding more features.
