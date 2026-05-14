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
  "workspaceFiles": 59,
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
