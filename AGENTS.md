# AGENTS.md — TwinPDF Autopilot Build Protocol

## Mission
Build **TwinPDF** into a completed, practical personal study product:

> **简洁实用的对称自学上课 Craft** — 左侧英文原课件，右侧中文讲义，底部随时可用的 AI Assist；选中即翻译，选中即可问，问完可沉淀，课程结束生成个人子讲义。

The user does not want a decorative PDF suite. The user wants a tool that can stay beside them during real study sessions and respond quickly, warmly, and usefully.

## Autopilot contract: do not stop until DONE
The user explicitly wants Codex to keep going until the product is genuinely complete. Do **not** stop after one ticket, one component, one mock screen, or one successful build.

Use `/goal` from `docs/CODEX_GOAL_PROMPT.md`. Work continuously until all of these are true:

1. `npm run typecheck` passes.
2. `npm run build` passes.
3. `npm run test` passes or every failing test has been fixed.
4. App runs with `npm run dev`.
5. The real test folder below has been used for manual smoke testing:

```text
C:\Users\Laptop\Desktop\网络学堂\[11] 计算机系统概论\lec8
```

6. The two PDFs in that folder can be loaded and used in the workflow.
7. Every item in `docs/FINAL_DONE_CHECKLIST.md` is satisfied.
8. `FINAL_DONE.md` exists and honestly records completion, verification, remaining limitations, and exact run commands.

If you hit session/context/time limits, write `STATE_FOR_RESUME.md` before stopping. The next Codex session must resume from it.

## Main-agent and sub-agent model
The main agent is the product owner, planner, reviewer, and QA lead. It should use child agents/sub-agents whenever available. If actual child-agent tooling is unavailable, emulate them sequentially.

### Main Agent — Chief Product Engineer
Responsibilities:
- read the entire docs set before coding;
- preserve the vision and minimalism;
- split work into safe tickets;
- review diffs and avoid huge files;
- run typecheck/build/tests repeatedly;
- coordinate sub-agent outputs;
- keep `WORKLOG.md` and checklists updated;
- keep going until DONE.

### Sub-agent A — UX / Product
Owns:
- `docs/WHITEPAPER.md`
- `docs/UX_WORKFLOW.md`
- `docs/AI_ASSIST_SPEC.md`
- actual UI friction.

Must enforce:
- Chinese interface by default;
- no dashboard bloat;
- no bookmarks/tags/account system unless it directly reduces study friction;
- bottom AI Assist is the central product primitive.

### Sub-agent B — PDF / Text Pipeline
Owns:
- PDF rendering;
- reliable selection capture;
- page text extraction;
- sentence segmentation;
- per-page context;
- sentence labels cache.

Must ensure:
- selection updates Assistant instantly;
- importing a PDF begins sentence extraction;
- sentence splitting and labels are saved in workspace cache files;
- cache files are meaningful and bounded, not random hidden garbage.

### Sub-agent C — Workspace Memory / Persistence
Owns:
- `showDirectoryPicker` local folder workflow;
- workspace manifest;
- `memory/`, `cache/`, `exports/` file writes;
- reloading history after closing/reopening;
- no learning content hidden in browser storage.

Allowed browser storage:
- only an IndexedDB handle to the last chosen directory, plus a small workspace label.
- no question logs, handouts, PDF text, or generated summaries in localStorage.

### Sub-agent D — AI / Backend
Owns:
- Node/Express API;
- DeepSeek-compatible calls;
- `env.local` loading;
- shared request/response contracts;
- prompt quality;
- mock mode;
- page label API;
- final summary API.

Must ensure:
- API key never reaches the frontend;
- AI responses are fast enough and useful;
- missing key does not stop product development;
- answer tone is warm, clear, and human, not a cold bullet machine.

### Sub-agent E — Assistant Dock
Owns:
- resizable bottom panel;
- collapse/expand;
- selected text zone;
- browser translation zone;
- AI answer zone;
- input lock;
- sublecture lock;
- green `加入成功` success state;
- repeated-question flow.

### Sub-agent F — Export / Personal Sub-lecture
Owns:
- saved Q&A entries;
- Markdown generation;
- `memory/personal-subhandout.md`;
- `exports/*.md`;
- final summary modal/preview;
- copy/download/save-to-workspace.

### Sub-agent G — QA / Hardening
Owns:
- all tests;
- real PDF smoke tests;
- UX regression checklist;
- memory persistence verification;
- `FINAL_DONE.md`.

## Non-negotiable product constraints

### Product vision
TwinPDF must remain a simple personal study craft tool:

- symmetric left/right reading;
- immediate selected-text feedback;
- browser translation surface;
- fast AI explanation;
- personal memory and export.

### Explicitly avoid before DONE
Do not build:
- account system;
- cloud sync;
- generic PDF annotation suite;
- bookmarks/tags/social/dashboard/library management;
- decorative sidebars;
- too many layout modes.

### Allowed reasonable additions
Allowed if they reduce friction:
- copy buttons;
- clear selection;
- keyboard shortcut for ask/send;
- saved assistant height;
- open last workspace;
- export Markdown;
- reset corrupt workspace;
- API retry with friendly error;
- simple page label status.

## Required behavior

### Workspace memory
On app launch:
1. show `选择学习工作区` if no active workspace;
2. user selects a local folder;
3. create/read:

```text
twinpdf.workspace.json
sources/
handouts/
memory/
exports/
cache/sentences/
cache/page-labels/
cache/pdf-index/
```

All learning history must be saved there.

### PDF import and sentence labels
When a PDF is imported:
1. render it for reading;
2. extract page text;
3. split page text into sentence-like units;
4. save sentence index under `cache/sentences/`;
5. send page text + sentences to `/api/ai/label-page` in background;
6. save labels under `cache/page-labels/`;
7. use cached labels to make explanations faster and more contextual.

### Browser translation surface
The translation zone is intentionally ordinary HTML text with `lang="en"` and no canvas. Its job is to let the browser / translation extension quickly translate selected text. Do not replace it with an expensive AI-only translation path.

### AI Assist tone
AI should be a real learning companion:
- explain like a patient strong TA;
- use simple language;
- adapt to the selected text and surrounding page;
- avoid robotic bullet-only responses;
- when long, structure gently with short headings and examples;
- help the user feel synced with the material.

### Lock semantics
Input lock:
- ON: keep the question after send and after selection changes.
- OFF: clear the question after successful send unless user is editing.

Sublecture lock:
- ON: after a successful AI answer, automatically add it to personal sub-lecture.
- OFF: user manually clicks `加入个人子讲义`.

Success state:
- show green `加入成功` in/near the sublecture area after successful add.
- it should be per-current-answer, not a permanent global lie.

## File-size safety
Avoid giant files. Split code by domain:

```text
src/components/assistant/
src/components/pdf/
src/components/handout/
src/components/workspace/
src/components/summary/
src/lib/workspace/
src/lib/pdf/
src/lib/ai/
src/shared/
server/routes/
server/lib/
```

If a file exceeds ~350 lines, consider splitting before continuing unless there is a strong reason.

## Verification loop
After each material change:

```bash
npm run typecheck
npm run build
npm run test
```

Manual smoke loop:
1. start with `npm run dev`;
2. choose a workspace folder;
3. load the two PDFs from the user test folder;
4. select text in the English PDF;
5. confirm bottom assist updates;
6. ask AI in mock mode or real DeepSeek mode;
7. test input lock;
8. test sublecture lock;
9. test green success state;
10. close/reopen page and restore workspace history;
11. generate final summary and save Markdown into workspace.

Keep going until all pass.
