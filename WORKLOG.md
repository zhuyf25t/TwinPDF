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
