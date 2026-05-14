# UI Audit Round 5: Minimal Dual-PDF Pass

Screenshot: `docs/qa/screenshots/round-5.png`

## Objective Restated

The latest product target is not “more features.” It is a minimal human-feeling study product:

- left pane is the English PDF;
- right pane is another PDF, not a Markdown rendering;
- normal state must be quiet, with very few buttons and no big assistant panel blocking reading;
- AI Assist should be a small helper, not a pile of controls;
- the interface should feel like a product someone can keep open while studying.

## Findings

- The right pane is now a real `PdfPane` with its own canvas/text layer and page controls. It no longer renders `HandoutPane` or `MarkdownHandout`.
- Both PDF panes default to no thumbnail rail and no zoom controls, leaving only open/filename/page navigation.
- The assistant defaults to collapsed and occupies only a small bottom-right strip.
- Expanded assistant is narrower and lighter; mode controls are reduced to one primary `解释` action plus locks, join, answer, and input.
- The selected-text area doubles as the ordinary browser translation surface with `lang="en"` and `translate="yes"`, removing the duplicate translation box.
- The smoke test now scopes left/right PDF selectors separately and verifies the right PDF canvas/text layer.

## Remaining Judgment

This is now meaningfully closer to the provided minimal reference. The assistant still overlays the lower-right PDF while expanded, but it stays below the top half of the reading surface, can collapse instantly, and no longer compresses or dominates the workspace.

Score: 9.2/10 for the current objective.
