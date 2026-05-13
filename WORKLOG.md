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
