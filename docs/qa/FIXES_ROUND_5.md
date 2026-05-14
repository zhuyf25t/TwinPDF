# Fixes Round 5: Minimal Dual-PDF Product Pass

## Right Pane

- Replaced the right Markdown handout surface with a second `PdfPane`.
- Right PDF now loads `lec08_vm_malloc_super_detailed_guide.pdf` directly as a PDF canvas/text-layer reader.
- Removed unused Markdown handout components and the PDF-to-Markdown extraction path from the active UI code.
- Right-side AI context now comes from the current right PDF page text, not stale `handoutMarkdown` fallback.

## Minimal Reading UI

- Hid thumbnail rails by default.
- Hid zoom controls by default.
- Hid visual status strips while preserving status text for automation.
- Reduced pane toolbar height and visual weight.
- Set separate default zooms for the left lecture PDF and right guide PDF so both are readable in the split workspace.

## AI Assist

- Default assistant mode is now collapsed.
- Assistant width is reduced to a small bottom-right helper card.
- Removed the separate browser-translation box; selected text is now the ordinary HTML translation surface.
- Reduced mode controls from four chips to one primary `解释` action.
- Shortened lock/save labels and send button.

## QA

- Updated smoke selectors to `.left-pdf-pane` and `.right-pdf-pane`.
- Added right PDF canvas/text-layer assertions.
- Added obstruction checks so the dock cannot cover toolbars or the upper half of either PDF reading area.
- Re-ran `typecheck`, `test`, `build`, and real PDF smoke successfully.
