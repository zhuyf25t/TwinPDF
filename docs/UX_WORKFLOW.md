# TwinPDF UX Workflow

## First launch

1. User opens `localhost:5173`.
2. App shows `选择学习工作区`.
3. User clicks `选择本地文件夹`.
4. Browser asks for folder permission.
5. TwinPDF creates workspace structure.
6. App enters main workspace.

## Main study session

1. User opens English PDF on the left.
2. User opens Chinese handout on the right.
3. PDF import begins background sentence extraction.
4. User reads normally.
5. User selects confusing English text.
6. Bottom assistant updates immediately.
7. Browser translation surface updates immediately.
8. User asks AI if needed.
9. User saves valuable answers or auto-saves through sublecture lock.
10. User repeats across pages.
11. User clicks `结束课程总结`.
12. Final Markdown preview appears and saves to `exports/`.

## AI Assist layout

Default state: bottom dock, about 300px high.

Resizable states:

- collapsed: 44px title row;
- half: 260–340px, default;
- expanded: 500–620px for deeper questions.

Mandatory zones:

```text
[drag handle]
AI Assist title | input lock | sublecture lock | 加入成功
Tabs: 解释 / 翻译 / 举例 / 提问 / 收进子讲义
已选原文
浏览器翻译区
AI解释
输入框
```

## Lock UX

### Input lock
Show as a small button:

```text
🔒 输入锁定
```

When ON, the question remains after send and across selection changes.

### Sublecture lock
Show as:

```text
🔒 子讲义自动加入
```

When ON, every successful AI response is saved. After save:

```text
✅ 加入成功
```

## What not to show
No side dashboards, no decorative transcript wall, no tags/bookmarks in the first product. The user is using this while actually studying; every control must pay rent.
