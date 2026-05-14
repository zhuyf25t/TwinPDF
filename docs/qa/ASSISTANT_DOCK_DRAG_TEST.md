# Assistant Dock Drag Test

Date: 2026-05-14

## Command

```bash
SMOKE_SCREENSHOT_DIR=docs/qa/screenshots/round-fixed-overlay npm run smoke:real-pdf
```

## Result

Passed.

## Verified

- `.assistant-dock` is `position: fixed`.
- The dock bottom gap is 18px on desktop and 12px on the responsive viewport.
- The resize handle exists and its cursor is `ns-resize`.
- Dragging the handle changes the assistant height.
- The workspace height is unchanged after expand, drag, compact, collapse, and restore.
- Collapsed mode is under 60px tall.
- Compact/expanded mode stays within the 55vh height limit.
- Browser translation surface remains ordinary HTML with `lang="en"` and `translate="yes"`.

## Evidence

- `docs/qa/screenshots/round-fixed-overlay/01-workspace-loaded.png`
- `docs/qa/screenshots/round-fixed-overlay/02-dock-modes.png`
- `docs/qa/screenshots/round-fixed-overlay/03-after-answer.png`
- `docs/qa/screenshots/round-fixed-overlay/04-mobile-dock.png`
