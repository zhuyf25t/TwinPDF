# UX Decision: TwinPDF Product Hierarchy

TwinPDF is not a SaaS dashboard or a general PDF suite. The final product shape is a warm symmetric self-study craft:

1. Left: English original lecture PDF.
2. Right: Chinese handout.
3. Bottom: always-available 随堂助手.
4. End: saved Q&A becomes a personal sub-handout.

## Final Hierarchy

- First launch: `选择学习工作区`
- Main workspace:
  - quiet top header
  - symmetric left/right reading panes
  - bottom resizable assistant dock
- Final summary:
  - saved questions list
  - personal sub-handout preview
  - copy/save to workspace

## Decisions

- The assistant is the core study primitive, not a generic chat widget.
- Browser translation remains ordinary selectable/translatable HTML.
- Study history must feel local and visible, not hidden in browser storage.
- Chinese interface is the default.
- Avoid dashboards, tags, bookmarks, accounts, social features, and decorative sidebars.

## Final Polish Direction

- The assistant belongs to the AppShell bottom layout, not as a fixed overlay over reading content.
- Assistant states are explicit: collapsed, compact, expanded.
- The command strip should keep mode, locks, save, and success state visible without turning the dock into a form pile.
- The reading panes stay primary; AI Assist should support the study surface, not compete with it.
