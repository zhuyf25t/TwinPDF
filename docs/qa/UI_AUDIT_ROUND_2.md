# UI Audit Round 2

Screenshot: `docs/qa/screenshots/round-2.png`

## Verdict

Round 2 is a real improvement. The assistant no longer blocks the reading panes, and the left-English/right-Chinese/bottom-TA hierarchy is finally legible. The UI still needed compact polish before DONE.

## Improvements

- Reading panes are no longer hidden under AI Assist.
- The dock is visually lighter and belongs to the page layout.
- Toolbar wrapping was fixed by changing `打开 PDF` to `打开课件` and making toolbar buttons non-wrapping.
- Lock controls are easier to understand in the command row.
- Summary wording is more product-facing.

## Remaining Issues

- Compact assistant context rows were a little too short; selected text could look clipped.
- The answer area needed more breathing room above the input row.
- Smoke did not yet exercise collapsed, expanded, and drag-resize behavior.

## Required Next Fixes

- Increase compact dock breathing room while staying under the 260-320px target.
- Add automated smoke coverage for collapsed, compact, expanded, and drag-resize.
- Keep iterating screenshots until AI Answer and selected context both read cleanly in compact mode.
