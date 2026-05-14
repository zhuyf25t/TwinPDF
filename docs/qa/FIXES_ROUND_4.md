# Fixes Round 4

## Layout Architecture

- Removed the `assistant-stage` normal document-flow container from `src/App.tsx`.
- Rendered `AssistantDock` directly under the app shell so the workspace grid no longer reserves height for it.
- Changed `.assistant-dock` to `position: fixed`, centered at the bottom with `z-index: 50`, `bottom: 18px`, and a max width bound to the viewport.
- Removed mobile `.assistant-stage` responsive rules.

## Assistant Dock

- Split the assistant into focused components: handle, header, locks, selected text, browser translation surface, answer panel, and input row.
- Kept pointer drag behavior on the handle and persisted height/mode to workspace settings plus a small localStorage fallback preference.
- Updated dock height constants to `collapsed: 52px`, `compact: 260-320px`, and `expanded: max 55vh / 560px`.
- Hardened smoke tests to assert fixed positioning, `ns-resize` cursor, collapsed height, and unchanged workspace height after drag.

## Handout Reader

- Added PDF handout cleanup before markdown rendering.
- Removed isolated punctuation/page-number noise, merged fragmented lines, preserved page sections, and rendered sparse pages with a soft fallback.
- Split the handout toolbar and markdown reader out of `HandoutPane`.

## Verification

- `npm run typecheck` passed.
- `npm run smoke:real-pdf` passed with the two real lec8 PDFs and new fixed-overlay assertions.
