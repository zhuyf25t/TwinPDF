# UI Audit Round 4

Screenshot: `docs/qa/screenshots/round-4.png`

## Verdict

Round 4 fixes the failure called out in the latest review: AI Assist is now a true fixed bottom dock, not a normal page block. The left English PDF and right Chinese handout keep the full workspace height while the assistant floats above the bottom edge and can collapse when the user wants uninterrupted reading.

## Required Questions

- AI Assist 是否还在挤压主阅读区？No. `AssistantDock` is no longer wrapped in `assistant-stage`, and smoke verifies workspace height is unchanged after expand, drag, and collapse.
- AI Assist 是否真的 fixed overlay？Yes. Playwright checks `getComputedStyle(.assistant-dock).position === "fixed"`.
- 左右 pane 是否占满剩余高度？Yes. Desktop smoke checks the app shell fills viewport height and pane heights align to the padded workspace.
- 是否还能同时看清英文课件和中文讲义？Yes. Both panes remain visible behind the dock; compact height is about 300px and collapsed mode leaves a 52px strip.
- 右侧讲义是否像讲义？Improved. Imported PDF text is cleaned, page-structured, and rendered as markdown-like prose instead of raw extraction noise.
- 是否有横向滚动条？No. Smoke checks document width against viewport width.
- 是否愿意连续使用 2 小时？Yes, with the caveat that long AI answers are best read in expanded mode.

## Product Score This Round

9.1/10. The layout architecture now matches the intended mental model: left English, right Chinese, fixed bottom随堂助手.
