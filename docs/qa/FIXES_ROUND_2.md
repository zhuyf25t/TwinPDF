# Fixes Round 2

Input audit: `docs/qa/UI_AUDIT_ROUND_2.md`

## Fixed

- Raised compact assistant default height to 308px, still within the required 260-320px compact band.
- Increased the selected/translation row minimum height so selected text and browser translation are visibly readable.
- Added smoke coverage for assistant mode transitions:
  - compact to expanded
  - drag resize
  - expanded back to compact
  - collapsed
  - collapsed back to compact
- Added screenshot capture for dock-mode verification in the real PDF smoke flow.
- Added small bottom padding to AI Answer so long mock answers do not visually collide with the input row.

## Verification

- `npm run smoke:real-pdf`: passed with the real lec8 PDFs.
- The smoke flow selected real PDF text: `Lecture 8 Virtual Memory & Memory Management Mingyu Gao gaomy@tsinghua.edu.cn`.

## Result

Round 3 shows a stable bottom study tray. The assistant is still immediately available, but it no longer steals the document surface.
