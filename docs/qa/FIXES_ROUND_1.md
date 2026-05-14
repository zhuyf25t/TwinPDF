# Fixes Round 1

Input audit: `docs/qa/UI_AUDIT_ROUND_1.md`

## Fixed

- Converted AI Assist from a fixed overlay into a bottom AppShell dock stage, so it no longer covers the PDF and handout panes.
- Added persisted assistant mode to workspace settings: `collapsed`, `compact`, and `expanded`.
- Replaced hard-coded 360px/380px bottom padding in PDF and handout panes with normal layout flow.
- Reworked assistant controls into a command row: modes, input lock, sublecture lock, save, and green success state.
- Moved lock controls out of the input row so the question field feels like a study input, not a settings panel.
- Renamed visible assistant labels toward Chinese study language: `随堂助手`, `已选原文`, `AI 解释`.
- Split PDF and handout toolbar content into left/right groups and prevented primary toolbar labels from wrapping.
- Renamed summary preview title to `个人子讲义预览`.

## Verification

- `npm run typecheck`: passed.
- `npm run test`: passed.
- `npm run build`: passed.
- Real PDF smoke passed after adjusting the dock geometry assertion for the new AppShell dock.

## Result

Round 2 screenshot shows a materially better layout: the two reading panes remain fully visible above the assistant, and AI Assist reads more like a bottom study tray than an overlay form.
