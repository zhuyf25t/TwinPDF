# Real File Smoke Test

Date: 2026-05-14

## Command

```bash
SMOKE_SCREENSHOT_DIR=docs/qa/screenshots/minimal-pass npm run smoke:real-pdf
```

## Test Files

```text
C:\Users\Laptop\Desktop\网络学堂\[11] 计算机系统概论\lec8
```

- Left PDF: `lec08-vm-malloc.pdf`
- Right handout PDF: `lec08_vm_malloc_super_detailed_guide.pdf`

## Result

Passed in mock AI mode at `http://localhost:9999`.

Smoke JSON:

```json
{
  "ok": true,
  "appUrl": "http://localhost:9999",
  "leftPdf": "lec08-vm-malloc.pdf",
  "rightPdf": "lec08_vm_malloc_super_detailed_guide.pdf",
  "workspaceFiles": 58,
  "selectedText": "Lecture 8 Virtual Memory & Memory Management Mingyu Gao gaomy@tsinghua.edu.cn"
}
```

## Verified Workflow

- Workspace gate opens and enters a local workspace flow.
- Left PDF loads and renders.
- Right PDF loads as a second PDF reader with its own canvas and text layer.
- Page text extraction and sentence segmentation run.
- Sentence cache and page-label cache files are written in the workspace stub.
- Selecting real PDF text updates `已选原文`.
- The selected-text surface is ordinary HTML with `lang="en"` and `translate="yes"`, so it also serves as the browser translation surface.
- Assistant fixed overlay positioning, compact, expanded, collapsed, and drag-resize states are exercised.
- Workspace height is checked to remain stable while the assistant expands, collapses, and is dragged.
- The assistant dock is checked not to overlap either PDF toolbar or the upper half of either PDF reading surface.
- The page has no horizontal document scroll.
- Mock AI answer returns through the backend route.
- Manual add and auto-add lock save entries.
- Green `加入成功` appears.
- Final summary modal renders required headings.
- Markdown export writes to `exports/`.

## Screenshot Evidence

- `docs/qa/screenshots/round-1.png`
- `docs/qa/screenshots/round-2.png`
- `docs/qa/screenshots/round-3.png`
- `docs/qa/screenshots/round-4.png`
- `docs/qa/screenshots/round-5.png`
- `docs/qa/screenshots/final.png`
- `docs/qa/screenshots/minimal-pass/01-workspace-loaded.png`
- `docs/qa/screenshots/minimal-pass/03-after-answer.png`
- `docs/qa/screenshots/round-fixed-overlay/03-after-answer.png`
- `docs/qa/screenshots/round-fixed-overlay/04-mobile-dock.png`
- `docs/qa/screenshots/round-fixed-overlay/05-summary-modal.png`

## Limitation

Headless Playwright uses an in-memory File System Access API stub because the browser directory picker cannot be granted reliably in automation. The application code path still uses real `showDirectoryPicker` in Chrome/Edge, and unit tests cover workspace read/write behavior.

## Latest Continuous Reader And Movable Assistant Smoke

Date: 2026-05-14

Command:

```bash
SMOKE_SCREENSHOT_DIR=docs/qa/screenshots/continuous-movable-final-3 npm run smoke:real-pdf
```

Result:

```json
{
  "ok": true,
  "appUrl": "http://localhost:9999",
  "leftPdf": "lec08-vm-malloc.pdf",
  "rightPdf": "lec08_vm_malloc_super_detailed_guide.pdf",
  "workspaceFiles": 59,
  "selectedText": "Lecture 8 Virtual Memory & Memory Management Mingyu Gao gaomy@tsinghua.edu.cn"
}
```

Additional checks added in this pass:

- Left and right PDF panes render continuous page stacks, not a single isolated page.
- Page selection no longer falls back to the old sample page number; the selected page context stayed on page 1 in the final smoke.
- The assistant header has a visible grip and can be dragged to move the fixed dock.
- The assistant remains `position: fixed` after moving.
- Workspace height remains stable while resizing, collapsing, expanding, and moving the assistant.
- Latest screenshots are in `docs/qa/screenshots/continuous-movable-final-3/`.

## Latest Selection-Only Helper Smoke

Date: 2026-05-14

Command:

```bash
SMOKE_SCREENSHOT_DIR=docs/qa/screenshots/selection-helper-pass npm run smoke:real-pdf
```

Result:

```json
{
  "ok": true,
  "appUrl": "http://localhost:9999",
  "leftPdf": "lec08-vm-malloc.pdf",
  "rightPdf": "lec08_vm_malloc_super_detailed_guide.pdf",
  "workspaceFiles": 58,
  "selectedText": "Lecture 8 Virtual Memory & Memory Management Mingyu Gao gaomy@tsinghua.edu.cn",
  "assistant": "selection-only"
}
```

Additional checks added in this pass:

- The global top bar is absent, so the two PDF panes use the full viewport height.
- The helper contains no AI answer, question input, mode chips, locks, or add-to-subhandout controls.
- The helper is a small movable fixed overlay.
- The helper body is a single selected-text surface; later term-label pass changes it away from browser translation.

## Latest Term Label Smoke

Date: 2026-05-14

Command:

```bash
SMOKE_SCREENSHOT_DIR=docs/qa/screenshots/term-label-pass npm run smoke:real-pdf
```

Result:

```json
{
  "ok": true,
  "appUrl": "http://localhost:9999",
  "leftPdf": "lec08-vm-malloc.pdf",
  "rightPdf": "lec08_vm_malloc_super_detailed_guide.pdf",
  "workspaceFiles": 59,
  "selectedText": "Lecture：课件词汇",
  "assistant": "selection-only"
}
```

Additional checks added in this pass:

- PDF text layers are marked `translate="no"` so browser translation does not rewrite the hidden PDF text used for selection/click lookup.
- Importing the English PDF builds a deduplicated term-label cache in `cache/term-labels/`.
- Clicking an English word in the left PDF shows a `term：中文` label in the small helper.
- The helper label surface is `lang="zh-CN"` and `translate="no"`; TwinPDF owns the translation/definition instead of relying on browser translation.
- The new DeepSeek prompt lives under `server/prompts/`.

## Latest Resizable Reader Smoke

Date: 2026-05-14

Command:

```bash
SMOKE_SCREENSHOT_DIR=docs/qa/screenshots/resizable-reader-pass npm run smoke:real-pdf
```

Result:

```json
{
  "ok": true,
  "appUrl": "http://localhost:9999",
  "leftPdf": "lec08-vm-malloc.pdf",
  "rightPdf": "lec08_vm_malloc_super_detailed_guide.pdf",
  "workspaceFiles": 59,
  "selectedText": "Lecture：课件词汇",
  "assistant": "selection-only"
}
```

Additional checks added in this pass:

- Both PDF panes expose compact zoom out / zoom in buttons.
- The toolbar no longer shows a zoom percentage.
- The center divider is visible, has `col-resize`, and can be dragged horizontally.
- Dragging the divider changes the left/right pane widths without changing workspace height.
- Latest screenshots are in `docs/qa/screenshots/resizable-reader-pass/`.

## Latest DeepSeek Term Label Smoke

Date: 2026-05-15

Command:

```bash
SMOKE_SCREENSHOT_DIR=docs/qa/screenshots/deepseek-term-label-pass npm run smoke:real-pdf
```

AI mode:

```json
{
  "mockAI": false,
  "model": "deepseek-v4-pro",
  "reasoning": true
}
```

Result:

```json
{
  "ok": true,
  "appUrl": "http://localhost:9999",
  "leftPdf": "lec08-vm-malloc.pdf",
  "rightPdf": "lec08_vm_malloc_super_detailed_guide.pdf",
  "workspaceFiles": 10,
  "selectedText": "Lecture：讲座",
  "assistant": "selection-only"
}
```

Additional checks added in this pass:

- `env.local` was switched to `MOCK_AI=false` locally; this file is not committed.
- `/api/ai/health` reported DeepSeek mode with `deepseek-v4-pro` and reasoning enabled.
- A direct `/api/ai/label-terms` request returned `mock:false` and `source:"deepseek"` labels.
- The app no longer reuses old mock term-label caches when the backend reports DeepSeek mode.
- Real PDF smoke passed with a DeepSeek-generated label (`Lecture：讲座`).
- The original lec8 folder was cleaned back to only the two source PDFs after testing.

## Latest DeepSeek Miss Update Smoke

Date: 2026-05-15

Command:

```bash
SMOKE_SCREENSHOT_DIR=docs/qa/screenshots/deepseek-miss-update-pass npm run smoke:real-pdf
```

Result:

```json
{
  "ok": true,
  "appUrl": "http://localhost:9999",
  "leftPdf": "lec08-vm-malloc.pdf",
  "rightPdf": "lec08_vm_malloc_super_detailed_guide.pdf",
  "workspaceFiles": 10,
  "selectedText": "Lecture：讲座",
  "assistant": "selection-only"
}
```

Additional checks added in this pass:

- A local fallback label no longer counts as a cache hit.
- Any clicked term missing from the persistent term-label cache triggers a one-term DeepSeek update.
- DeepSeek results overwrite the temporary/local display and are written back to `cache/term-labels/`.
