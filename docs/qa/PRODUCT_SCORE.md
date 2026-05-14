# Product Score

Scores are intentionally strict. DONE is not allowed while any item is below 8, while reading comfort / AI Assist non-obstruction / visual simplicity / real PDF usability are below 8.5, or while average is below 8.8.

| Round | 阅读舒适度 | AI Assist 不打扰 | 选中即翻译 | 选中即解释 | 视觉简洁度 | 工作区记忆 | 子讲义闭环 | 真实 PDF 可用性 | Average | Verdict |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1 baseline | 7.4 | 6.6 | 9.0 | 8.4 | 7.0 | 8.8 | 8.6 | 9.0 | 8.10 | Not DONE |
| 2 after dock layout | 8.7 | 8.6 | 9.1 | 8.8 | 8.5 | 8.9 | 8.8 | 9.1 | 8.81 | Continue |
| 3 bottom layout pass | 8.6 | 7.8 | 9.2 | 9.0 | 8.4 | 8.9 | 8.9 | 9.2 | 8.75 | Rejected by latest review |
| 4 fixed overlay pass | 9.1 | 9.0 | 9.2 | 9.0 | 9.0 | 8.9 | 8.9 | 9.2 | 9.04 | DONE allowed |
| 5 minimal dual-PDF pass | 9.3 | 9.2 | 9.2 | 9.0 | 9.4 | 8.9 | 8.8 | 9.4 | 9.15 | DONE allowed |
| 6 self-repair visual balance | 9.4 | 9.2 | 9.2 | 9.0 | 9.5 | 8.9 | 8.8 | 9.4 | 9.18 | DONE allowed |
| 7 continuous PDF + movable assistant | 9.5 | 9.3 | 9.2 | 9.0 | 9.5 | 8.9 | 8.8 | 9.6 | 9.23 | DONE allowed |

## Round 1 Notes

- Strongest areas: real PDF loading, selected text plumbing, browser translation surface, workspace persistence, summary/export loop.
- Weakest areas: assistant obstruction, crowded control hierarchy, demo-like status strips, and insufficient product polish.
- Required before DONE: assistant and reading comfort must reach 9-level product quality.

## Round 4 Notes

- Round 3 was demoted after the latest user review because the assistant still participated in the page layout and compressed the reading panes.
- Reading comfort reaches 9.1 in Round 4 because AI Assist is now a fixed bottom dock; the left/right workspace height is stable and verified by smoke.
- AI Assist non-obstruction reaches 9 because collapsed/compact/expanded states are tested, drag does not re-layout the workspace, and collapsed mode leaves only a slim strip.
- Workspace memory remains 8.9 rather than 9+ because automated browser smoke still uses a File System Access API stub; the app code and unit tests cover the real API path.
- Average is above 8.8 and all categories are above 8, so DONE is allowed by the rubric.

## Round 5 Notes

- The latest user correction rejected visual clutter and clarified that the right pane is a second PDF, not Markdown.
- Reading comfort improves because both panes are now PDF readers with no default thumbnail rails and only essential page controls.
- AI Assist non-obstruction improves because collapsed is now the default and the expanded helper is a small bottom-right card.
- Visual simplicity improves because duplicate translation panels, extra mode chips, visible status strips, thumbnails, and zoom buttons are removed from the default view.

## Round 6 Notes

- The self-repair pass focused on the actual screenshot composition, not feature count.
- The left landscape PDF now sits more intentionally in the reading pane instead of sticking to the top and leaving accidental dead space.
- The product remains dual-PDF and minimal; this was a visual balance correction, not a feature addition.

## Round 7 Notes

- This round fixes the newest user objection directly: PDF panes now render as a continuous vertical page stack instead of feeling like a one-page-at-a-time viewer.
- The AI Assist dock can now be moved by dragging the header grip, while the existing top handle still resizes height.
- The Playwright real-PDF smoke now verifies the right pane renders multiple pages, the assistant remains fixed after moving, and the workspace height stays stable.
- Screenshot evidence: `docs/qa/screenshots/continuous-movable-final-3/01-workspace-loaded.png` and `docs/qa/screenshots/continuous-movable-final-3/03-after-answer.png`.
