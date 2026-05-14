# UI Audit Round 1

Screenshot: `docs/qa/screenshots/round-1.png`

## Verdict

Round 1 is functional but not yet a product-quality TwinPDF study craft. The app can load the real PDFs and run the assist workflow, but the interface still feels like a styled demo instead of a tool someone would keep open for a two-hour study session.

## What Fails

1. AI Assist is too visually dominant.
   - The dock occupies the center-bottom of the page and covers both reading panes.
   - Its height and border weight make it feel like a modal form, not a quiet assistant.
   - The `收起` control is visually awkward and competes with the content.

2. Assistant hierarchy is unclear.
   - Mode buttons, save button, text panels, AI answer, locks, and send button all have similar weight.
   - The user does not immediately see the flow: selected text -> browser translation -> AI explanation -> follow-up/save.
   - Empty states take too much visual space inside compact mode.

3. Reading workspace is still compressed.
   - The PDF and handout panes are structurally symmetric, but the dock interrupts the lower reading area.
   - Bottom status text feels like a debug strip.
   - The PDF toolbar is better than before but still button-heavy.

4. Handout pane is readable but not yet refined.
   - The content is Markdown-like, but the first viewport still feels like extracted text rather than a polished Chinese study handout.
   - The source filename and page count are useful but need quieter treatment.

5. Visual system is warm but not yet precise.
   - Beige tokens exist, but too many controls still share the same rounded rectangle treatment.
   - Shadows, borders, and panel backgrounds need a clearer hierarchy.

## Required Fix Direction

- Make the assistant lighter and more dock-like: lower default height, softer shell, compact header, cleaner controls.
- Turn mode chips and locks into a single clear command strip.
- Reduce the visible footprint of empty assistant states.
- Make the reading panes feel primary: no debug-like bottom strip, quieter status, more stable page/handout breathing room.
- Keep the design narrow: no dashboard, no library, no bookmarks, no extra product surface.
