# FINAL DONE Checklist

Codex must not declare DONE until every item is checked.

## Build and tests
- [x] `npm install` completed in user environment.
- [x] `npm run typecheck` passes.
- [x] `npm run build` passes.
- [x] `npm run test` passes.

## Workspace memory
- [x] First launch asks user to select workspace folder.
- [x] Workspace structure is created.
- [x] Study logs save into `memory/study-log.json`.
- [x] Settings save into `memory/settings.json`.
- [x] Final summary saves into `exports/`.
- [x] Closing/reopening and continuing workspace restores history.
- [x] Browser storage contains no learning logs, only last-folder handle/label.

## PDF and handout
- [x] Left English PDF can load.
- [x] Right handout / Markdown can load.
- [x] Real PDFs from `C:\Users\Laptop\Desktop\网络学堂\[11] 计算机系统概论\lec8` have been tested.
- [x] Page text extraction works at least for text PDFs.
- [x] Sentence cache files are written.
- [x] Label API exists and can run in mock/real mode.

## AI Assist
- [x] Bottom dock is visible and resizable.
- [x] Selected text updates immediately.
- [x] Browser translation surface updates immediately.
- [x] AI answer uses selected text + context.
- [x] Input lock works.
- [x] Sublecture lock works.
- [x] Manual add works.
- [x] Green `加入成功` appears after successful add.
- [x] Errors are friendly.

## Final summary
- [x] `结束课程总结` generates Markdown.
- [x] Markdown contains saved questions and answers.
- [x] Markdown preview is readable.
- [x] Copy works.
- [x] Save/export works.

## Product quality
- [x] UI is Chinese by default.
- [x] Interface is minimal and practical.
- [x] No decorative dashboard/bookmark/tag bloat.
- [x] `WORKLOG.md` is updated.
- [x] `FINAL_DONE.md` exists.
