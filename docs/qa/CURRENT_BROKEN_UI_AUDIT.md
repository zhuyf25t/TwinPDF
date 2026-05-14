# Current Broken UI Audit

Screenshot: `docs/qa/screenshots/before-current-broken.png`

## Verdict

Current implementation is not acceptable. It is functional, but the product layout is wrong for TwinPDF. The bottom assistant is participating in the normal AppShell layout and compresses the reading workspace, which violates the target mental model: left English PDF, right Chinese handout, bottom floating随堂助手.

## Required Questions

### Is the main reading area compressed by AI Assist?

Yes. The left PDF and right handout panes only occupy the upper portion of the viewport because AI Assist is a normal bottom layout block. This makes the documents feel secondary.

### Is AI Assist a fixed overlay dock?

No. It is inside `assistant-stage` as part of flex layout. It behaves like a page section, not like a dock/workbench.

### Can AI Assist really be dragged?

Not adequately. There is a visible handle, but because the assistant is tied to normal layout reservation, dragging changes layout allocation rather than feeling like a floating dock being resized over the workspace. This does not meet the requirement.

### Are left and right panes independently scrollable?

Partly. They have internal scroll containers, but the available height is wrong because the assistant consumes layout height.

### Is there a horizontal page scrollbar?

No obvious full-page horizontal scrollbar in the screenshot, but the layout still feels cramped and fragile.

### Does the right handout look like a readable handout?

Not enough. It is cleaner than raw text, but still looks like a PDF text extraction dump: source line, page count, page heading, sparse extracted fragments. It does not yet feel like a polished Chinese markdown lecture note.

### Does it match left-English / right-Chinese / bottom assistant?

No. It has the pieces, but the hierarchy is wrong. The bottom assistant should float as a dock and not steal document height.

## Score

Overall product UI score: 5.8 / 10.

Breakdown:

- Reading comfort: 5.5
- AI Assist dock correctness: 3.5
- Drag/resize behavior: 4.0
- Right handout readability: 5.8
- Visual product feel: 6.0
- Real PDF workflow function: 8.2

## Blocking Fixes

1. Restore main workspace to full viewport height below the topbar.
2. Move AI Assist out of normal layout flow and make it `position: fixed`.
3. Implement real pointer drag height changes on the fixed dock.
4. Keep collapsed / compact / expanded states.
5. Clean imported PDF handout text before rendering so the right pane reads like a lecture handout, not extracted fragments.
