# Prompt-to-Artifact Completion Audit

Date: 2026-05-14

## Objective

Respond to the latest product correction: make TwinPDF a truly minimal product, remove visual clutter, stop treating the right pane as Markdown, and verify that the result is a dual-PDF study workspace with a small non-dominating AI assistant.

## Checklist

| Requirement | Evidence | Status |
| --- | --- | --- |
| UI must be significantly more minimal, not a toy full of buttons | `docs/qa/screenshots/round-5.png`; `src/styles/workspace.css`; `src/styles/pdf.css`; `src/styles/assistant.css` | Pass |
| Right side must be another PDF, not Markdown | `src/App.tsx` renders two `PdfPane` instances; `scripts/smoke-playwright.ts` loads `.right-pdf-pane input[type=file]` | Pass |
| Remove stale Markdown handout UI from active product path | Deleted `src/components/handout/*`; deleted `src/lib/pdf/extractPdf.ts`; no `HandoutPane` references under `src/` | Pass |
| Right PDF must actually render as PDF | Smoke asserts `.right-pdf-pane canvas` has non-zero dimensions and `.right-pdf-pane .pdf-text-layer span` exists | Pass |
| Left PDF selection must still feed AI | Smoke selects from `.left-pdf-pane .pdf-text-layer span` and checks selected text appears in assistant | Pass |
| Browser translation surface must remain ordinary HTML | `src/components/assistant/SelectedTextPanel.tsx` uses `lang="en"` and `translate="yes"`; smoke asserts those attributes | Pass |
| AI Assist must be visually quieter | `defaultSettings.assistantMode = "collapsed"`; assistant width reduced to `min(430px, calc(100vw - 28px))`; screenshot `round-5.png` | Pass |
| Assistant expanded state must not block primary reading area | Smoke `assertDockDoesNotBlockPrimaryReading` checks no toolbar overlap and no overlap with upper half of either PDF page wrap | Pass |
| Tests must verify dual-PDF selectors, not old handout selectors | `scripts/smoke-playwright.ts` uses `.left-pdf-pane` and `.right-pdf-pane`; no `.handout-pane` smoke dependency | Pass |
| Required commands pass | `npm run typecheck`; `npm run test`; `npm run build`; `SMOKE_SCREENSHOT_DIR=docs/qa/screenshots/minimal-pass npm run smoke:real-pdf` | Pass |
| Real files are used | `docs/qa/REAL_FILE_SMOKE_TEST.md`; smoke JSON names both lec8 PDFs | Pass |

## Weaknesses Checked

- Unit tests still cover Markdown export because final summaries are Markdown. That is not the same as the right reading pane being Markdown.
- Workspace persistence still contains legacy `current-handout.md` support for backward compatibility, but the active UI no longer renders it as the right pane.
- The assistant still overlays the lower-right content when opened; this is intentional and bounded, with collapsed default and obstruction checks.

## Verdict

The current artifacts satisfy the latest objective. The product is now a minimal dual-PDF study workspace with a small assistant rather than a feature-heavy demo surface.
