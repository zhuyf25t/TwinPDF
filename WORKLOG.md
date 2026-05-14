# WORKLOG

## Bootstrap v3
- Added comprehensive product docs and autopilot protocol.
- Added local workspace folder architecture.
- Added React/Express MVP scaffold.
- Added File System Access workspace helpers.
- Added PDF.js rendering/text extraction and sentence cache path.
- Added bottom resizable AI Assist with input lock, sublecture lock, and green success state.
- Added DeepSeek-compatible backend routes and mock mode.
- Added final summary modal and workspace export path.

Next Codex run must execute `docs/CODEX_GOAL_PROMPT.md`, install deps, run typecheck/build/test, then keep implementing/hardening until final checklist is complete.

## Bootstrap verification in artifact environment
- Ran `npm install --package-lock=false` for verification only.
- Ran `npm run typecheck`: passed.
- Ran `npm run test`: passed, 3 tests.
- Ran `npm run build`: passed. Vite emitted a normal PDF worker chunk-size warning.
- Removed `node_modules/` and `dist/` before packaging so the zip stays clean and does not contain cache/dependency folders.

## UX hardening QA pass
- Audited the current UI against `docs/UX_WORKFLOW.md`, `docs/TEST_PLAN.md`, and `docs/FINAL_DONE_CHECKLIST.md`.
- Fixed visible English import labels in the PDF and handout toolbars so the interface remains Chinese-first.
- Reworked `src/styles.css` toward a practical two-pane study surface: cooler neutral palette, clearer blue active states, green success state, red error surfaces, tighter 8px radii, and responsive wrapping/stacking below desktop widths.
- Did not mark final DONE; main-agent verification still needs the real PDF smoke test and final checklist pass.

## Final autopilot completion - 2026-05-14
- Initialized git, pushed the baseline to `origin/main`, then continued work on `codex/goal-autopilot`.
- Fixed Windows npm scripts so `npm run typecheck`, `npm run build`, `npm run test`, and `npm run dev` use local tools reliably.
- Completed workspace memory with required folders/files, IndexedDB handle-only storage, corrupt JSON backup, and unit coverage.
- Completed PDF text pipeline hardening: real PDF rendering, text extraction, sentence splitting, sentence matching for selection, bounded caches, and page label background calls.
- Added right-side PDF handout import by extracting a PDF into readable Markdown, so both user test PDFs can be loaded into the workflow.
- Completed backend mock/DeepSeek-compatible assist, label-page, and finalize routes with friendly errors and final Markdown assembly.
- Completed AI Assist lock semantics, manual/auto sublecture save, per-answer green `加入成功`, ordinary HTML translation surface, and final summary preview/save.
- Added `scripts/smoke-playwright.ts` and `npm run smoke:real-pdf` for repeatable browser smoke coverage.
- Verified real PDFs from `C:\Users\Laptop\Desktop\网络学堂\[11] 计算机系统概论\lec8`:
  - `lec08-vm-malloc.pdf`: 49 pages, 49 text pages, 1225 sentence units.
  - `lec08_vm_malloc_super_detailed_guide.pdf`: 102 pages, 102 text pages, 1702 sentence units.
- Browser smoke passed in mock mode at `http://localhost:9999`: chose workspace, loaded left PDF, loaded right PDF guide, selected PDF text, translation surface updated, AI answered, input lock worked, sublecture lock worked, manual add worked, `加入成功` appeared, final summary saved to workspace stub.
- Final verification passed: `npm run typecheck`, `npm run build`, `npm run test`, and `npm run smoke:real-pdf`.

## UI craft hardening completion - 2026-05-14
- Re-read `AGENTS.md`, the whitepaper, UX workflow, AI Assist spec, final checklist, and `docs/vision/` wireframes, then re-centered the product on the warm symmetric study craft direction.
- Replaced the old blue/white demo styling with layered warm design tokens and split style files under `src/styles/`: `tokens`, `global`, `workspace`, `pdf`, `handout`, `assistant`, and `summary`.
- Stabilized the desktop workspace as two equal independently scrolling reading panes, with compact headers, ivory surfaces, restrained warm-brown controls, ellipsized long file names, and no browser-level layout scroll.
- Refined the PDF pane into a calmer reader: narrow thumbnail rail with skeleton placeholders, 60% default fit for the real lecture slide, centered white page on warm desk background, and an explicit `选择文本` tool state.
- Refined the right handout pane into a Markdown-like Chinese reading surface and changed imported PDF handout output so long PDF file names no longer become huge overflowing H1 titles.
- Rebuilt the AI Assist dock structure around selected text, browser translation, AI answer, input locks, manual/auto add, green `加入成功`, collapsed state, and drag height persistence without clearing old answers on selection change.
- Hardened the Playwright smoke test with screenshot capture, realistic multi-span PDF selection, dock viewport/width/height assertions, internal non-overlap checks, mobile dock screenshot, required final-summary heading checks, and workspace artifact assertions.
- Final screenshots were written to `F:\tmp\twinpdf-final-ui`; real PDF smoke passed with the two lec8 PDFs and selected text `Lecture 8 Virtual Memory & Memory Management Mingyu Gao gaomy@tsinghua.edu.cn`.
- Final verification after this UI pass passed: `npm run typecheck`, `npm run test`, `npm run build`, and `SMOKE_SCREENSHOT_DIR=F:\tmp\twinpdf-final-ui npm run smoke:real-pdf`.

## Autopilot UI product loop - 2026-05-14
- Created `docs/qa/` evidence for the requested product loop: UI audits, fixes, self-review, product score, UX decision, real-file smoke report, screenshots, and final QA signoff.
- Round 1 declared the prior UI not DONE: functional but still too much like an overlay demo.
- Round 2 moved AI Assist into the AppShell bottom layout, persisted `collapsed` / `compact` / `expanded`, removed fake 360px pane padding, cleaned toolbar grouping, and made the assistant command row clearer.
- Round 3 tightened compact mode, added dock-mode smoke coverage for expand/drag/collapse, and confirmed the assistant supports the documents without covering them.
- Final product score: 9.04 average, all categories >= 8, with reading comfort and AI Assist non-obstruction at 9+.
- Final verification passed: `npm run typecheck`, `npm run test`, `npm run build`, and `SMOKE_SCREENSHOT_DIR=docs/qa/screenshots/round-3-final3 npm run smoke:real-pdf`.

## Fixed overlay correction - 2026-05-14
- Reproduced the rejected UI with the two real lec8 PDFs and saved `docs/qa/screenshots/before-current-broken.png`.
- Wrote `docs/qa/CURRENT_BROKEN_UI_AUDIT.md`, explicitly marking the prior assistant layout as a failure because it compressed the reading workspace.
- Removed `assistant-stage` from the app flow and changed AI Assist into a true `position: fixed` bottom dock.
- Split assistant and handout UI into smaller components and added PDF handout cleanup so the right pane reads more like a lecture note.
- Hardened smoke coverage to assert fixed positioning, `ns-resize` drag handle, no horizontal document scroll, unchanged workspace height during drag/collapse, and collapsed height under 60px.
- Real PDF smoke passed with `SMOKE_SCREENSHOT_DIR=docs/qa/screenshots/round-fixed-overlay npm run smoke:real-pdf`.
