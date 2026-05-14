# Fixes Round 7 - Continuous PDF And Movable Assistant

Date: 2026-05-14

## Implemented

- Replaced the single rendered PDF page with a continuous rendered page stack.
- Added incremental page rendering so the viewer starts fast and loads more pages as the user scrolls.
- Added direct internal-container scrolling for previous/next page controls.
- Added per-page DOM refs and page markers so selections resolve to the correct page.
- Fixed the selected-page fallback that could report the old sample page number.
- Added movable assistant dock state with persisted `assistantX` and `assistantY` settings.
- Added a visible grip to the assistant header and Playwright coverage that drags the dock.
- Tightened the compact assistant layout so action buttons stay on one row and selected text does not create nested scrollbars.
- Updated real-PDF smoke coverage to assert continuous pages and movable fixed assistant behavior.

## Verification

Commands run:

```bash
npm run typecheck
npm run test
npm run build
SMOKE_SCREENSHOT_DIR=docs/qa/screenshots/continuous-movable-final-3 npm run smoke:real-pdf
```

All passed.
