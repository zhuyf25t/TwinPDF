/goal Build TwinPDF into the completed personal bilingual study product described in this repository. Read AGENTS.md, docs/WHITEPAPER.md, docs/ARCHITECTURE.md, docs/WORKSPACE_STORAGE_SPEC.md, docs/AI_ASSIST_SPEC.md, docs/SENTENCE_PIPELINE_SPEC.md, docs/UX_WORKFLOW.md, docs/API_CONTRACTS.md, docs/DATA_SCHEMA.md, docs/TEST_PLAN.md, and docs/FINAL_DONE_CHECKLIST.md before making changes.

You are allowed and encouraged to use sub-agents. The main agent should act as chief product engineer, planner, reviewer, and tester; delegate implementation slices to child agents when available. If actual child-agent tooling is unavailable, emulate the roles sequentially.

Final target: TwinPDF is a 简洁实用的对称自学上课 Craft. Left side opens the original English PDF; right side opens a Chinese GPT-generated handout / Markdown; bottom AI Assist is always available, resizable, and fast. Selecting English text updates Selected Text and the browser translation surface immediately. AI Assist can explain, answer follow-up questions with selected text plus page context, lock the repeated input question, lock auto-add-to-personal-sublecture, show a green 加入成功 state after successful add, persist all history into the chosen local workspace folder, and generate a final Markdown personal sub-lecture with 结束课程总结.

Implement local workspace memory: when the app opens, the user chooses a local folder. Store all history, question logs, personal sub-handouts, final summaries, sentence indexes, and page labels inside that folder, not hidden browser storage. Browser IndexedDB may store only the last directory handle and a tiny label. Keep cache files explainable and bounded inside cache/.

Implement PDF import behavior: when a PDF is loaded, extract text, split it into sentences, save sentence indexes, and background-label page/sentence content through the backend API where feasible. Labels should make AI answers faster and more contextual. Use browser-native translation by exposing selected text as ordinary HTML in the Translation/浏览器翻译区.

Use DeepSeek from env.local through the backend only. API key must never be exposed to the frontend. If the key is missing, use MOCK_AI=true and continue; do not stop.

The interface language should be Chinese. The product should be minimal, practical, and calm. Do not add bookmarks/tags/dashboards/accounts/cloud/library bloat. Add only small features that reduce actual study friction.

Use the real user test folder for smoke testing when available:
C:\Users\Laptop\Desktop\网络学堂\[11] 计算机系统概论\lec8
It contains two PDFs. Use them to verify TwinPDF can load real course PDFs and support the full selected-text → translation surface → AI assist → sublecture → final summary workflow.

Do not stop after a rough MVP. Continue autonomously through implementation, typecheck, build, tests, real-PDF smoke testing, UX hardening, persistence testing, export testing, and documentation updates until every item in docs/FINAL_DONE_CHECKLIST.md passes. If a true external hard blocker or session limit prevents completion, write STATE_FOR_RESUME.md with exact status, next command, next task, known failures, and verification results before stopping.
