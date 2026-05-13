# Test Plan

## Automated

```bash
npm run typecheck
npm run build
npm run test
```

Unit tests should cover:

- sentence splitting;
- Markdown filename sanitization;
- workspace path helpers;
- buildNearbyContext;
- study-log serialization.

## Manual smoke with user PDFs
Use:

```text
C:\Users\Laptop\Desktop\网络学堂\[11] 计算机系统概论\lec8
```

Expected steps:

1. `npm run dev`.
2. Open localhost.
3. Choose a fresh workspace folder.
4. Load first PDF as English PDF.
5. Load second PDF or an `.md` handout on the right if available.
6. Confirm PDF renders.
7. Select English text.
8. Confirm Selected Text updates.
9. Confirm Browser Translation Surface updates.
10. Ask AI in mock mode.
11. Turn input lock ON, ask again, confirm input remains.
12. Turn sublecture lock ON, ask again, confirm auto-add and green `加入成功`.
13. Refresh the browser, continue workspace, confirm logs remain.
14. Click `结束课程总结`.
15. Confirm Markdown preview and file saved to workspace `exports/`.
16. Switch to real DeepSeek key and repeat one ask.

## Performance check
- Selecting text should update UI immediately.
- AI answer can be slower but must show loading state.
- Background page labeling must not freeze reading.

## Privacy check
- Search built files for `DEEPSEEK_API_KEY`; it must not appear in frontend bundle.
- Study logs must appear in workspace files.
- localStorage must not contain study logs.
