# TwinPDF Final Done

Date: 2026-05-14
Branch: `codex/goal-autopilot`

## Completion

TwinPDF now satisfies the repository `/goal` standard as a practical personal bilingual study product:

- left side loads and renders the English course PDF;
- right side loads Markdown/text handouts and can import the second user PDF as a Markdown-like handout;
- the UI now follows the warm ivory symmetric reading-craft direction rather than the earlier blue/white demo style;
- the desktop workspace uses two stable independently scrolling reading panes with compact headers and ellipsized long file names;
- bottom AI Assist is now a fixed dock overlay instead of a normal page block, so it no longer compresses the reading panes;
- bottom AI Assist is visible, collapsible, resizable, has persisted `collapsed` / `compact` / `expanded` state, is Chinese-first, warm-styled, and centered on selected text;
- selected text updates the raw text zone and ordinary browser-translation HTML zone immediately;
- AI Assist uses selected text, page context, right-handout context, recent entries, and sentence labels;
- input lock, sublecture lock, manual add, and green `加入成功` are implemented;
- study logs, settings, sentence caches, page labels, personal subhandout, and exports write to the chosen workspace folder;
- final course summary generates readable Markdown with the required `# 本节个人子讲义` structure and saves to `exports/`.

## Verification

Commands run successfully:

```bash
npm install
npm run typecheck
npm run build
npm run test
npm run smoke:real-pdf
```

`npm run build` passes with Vite's expected PDF worker chunk-size warning.

Additional UI smoke command used for final screenshot verification:

```bash
SMOKE_SCREENSHOT_DIR=docs/qa/screenshots/round-fixed-overlay npm run smoke:real-pdf
```

Product QA evidence:

```text
docs/qa/UI_AUDIT_ROUND_1.md
docs/qa/UI_AUDIT_ROUND_2.md
docs/qa/UI_AUDIT_ROUND_3.md
docs/qa/UI_AUDIT_ROUND_4.md
docs/qa/FIXES_ROUND_1.md
docs/qa/FIXES_ROUND_2.md
docs/qa/FIXES_ROUND_3.md
docs/qa/FIXES_ROUND_4.md
docs/qa/PRODUCT_SELF_REVIEW.md
docs/qa/PRODUCT_SCORE.md
docs/qa/ASSISTANT_DOCK_DRAG_TEST.md
docs/qa/REAL_FILE_SMOKE_TEST.md
docs/qa/FINAL_QA_SIGNOFF.md
```

Dev server:

```bash
npm run dev
```

In this environment, `env.local` sets the app URL to:

```text
http://localhost:9999
```

## Real PDF Smoke Test

Test folder:

```text
C:\Users\Laptop\Desktop\网络学堂\[11] 计算机系统概论\lec8
```

Files verified:

- `lec08-vm-malloc.pdf`: 49 pages, 49 pages with extracted text, 1225 sentence units.
- `lec08_vm_malloc_super_detailed_guide.pdf`: 102 pages, 102 pages with extracted text, 1702 sentence units.

Browser smoke with `npm run smoke:real-pdf` verified:

- workspace selection flow;
- left PDF loading;
- right PDF handout loading through PDF-to-Markdown extraction;
- selected text capture from rendered PDF;
- warm symmetric two-pane layout without overflow;
- fixed bottom AI Assist dock width, height, bottom gap, containment, internal non-overlap, and unchanged workspace height during drag/collapse;
- assistant expanded, compact, collapsed, and drag-resize behavior;
- mobile dock layout with visible selected text, browser translation, AI answer, locks, and send action;
- browser translation surface uses `lang="en"` and `translate="yes"`;
- mock AI answer;
- input lock;
- sublecture auto-add lock;
- manual add;
- green `加入成功`;
- final summary preview includes required headings and export write.

## Remaining Limitations

- Automated smoke uses a File System Access API stub for the directory picker because headless browser automation cannot reliably grant a real OS directory picker. Workspace behavior is separately covered by unit tests and app code uses the real browser File System Access API in normal use.
- Page labeling runs in the background and is intentionally bounded per page so reading is not blocked.
- DeepSeek real mode depends on a valid server-side `env.local`; mock mode is used when `MOCK_AI=true` or no key exists.
