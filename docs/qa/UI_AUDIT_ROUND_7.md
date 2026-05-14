# UI Audit Round 7 - Continuous PDF And Movable Assistant

Date: 2026-05-14

Screenshots:

- `docs/qa/screenshots/continuous-movable-final-3/01-workspace-loaded.png`
- `docs/qa/screenshots/continuous-movable-final-3/03-after-answer.png`

## Findings

- The left English PDF no longer behaves like a one-page-at-a-time viewer. The viewport shows page 1, page 2, and the start of page 3 in one continuous vertical reading flow.
- The right Chinese PDF also renders as a continuous page stack. It is a real lecture PDF surface, not extracted text dumped into the page.
- The AI Assist dock is still a fixed bottom overlay and does not participate in the main workspace layout.
- The assistant now has a visible header grip. Dragging the header moves the whole dock; the thin top handle remains dedicated to height resize.
- Page context is corrected: selecting the first-page text now reports page 1 in the assistant instead of falling back to the old sample page 7.
- The workspace remains stable during dock resize, collapse, expand, and move.

## Product Judgment

This round directly addresses the latest user objections. The product now supports normal continuous PDF reading and a movable assistant. The assistant still intentionally stays compact by default so it does not dominate the reading panes.

Score: 9.23 / 10.
