# AI Assist Spec

## Role
AI Assist is the always-on learning companion. It should feel like a real person helping the user learn, not like a cold bullet-point bot.

## Panel placement
Default: bottom dock spanning the middle/right of the workspace.

Required:

- resizable by dragging top edge;
- collapsible;
- always available;
- does not force the user to switch pages/windows.

## Sections

### 1. 已选原文
Shows selected English text exactly as captured.

### 2. 浏览器翻译区
Shows selected English text as ordinary HTML with `lang="en"` and `translate="yes"`. The purpose is to let browser/translation extension translate it quickly.

Do not turn this into an AI translation-only box.

### 3. AI解释
Shows the latest AI answer.

### 4. 继续追问
Input box for the user’s question.

## Quick modes
- `解释`
- `翻译`
- `举例`
- `追问`
- `收进子讲义`

The modes should not create separate confusing windows. They should just guide the prompt.

## Prompt context
For `/api/ai/assist`, send:

- selected text;
- page number;
- nearby page context;
- page labels if available;
- right-handout excerpt;
- previous local Q&A context if relevant;
- locked question if any;
- mode.

## Answer style
System prompt must require:

- Chinese by default;
- preserve key English terms;
- simple, warm language;
- explain the intuition before formalism;
- avoid long cold bullet lists;
- if long, use short paragraphs and micro-headings;
- focus on what the selected text means in this page.

Example desired style:

```text
这句话其实是在说：我们不直接去算 log p(x)，因为它通常很难算；我们转而构造一个可以优化的下界 L(q)。你可以把它想成“先找一个够好、能算的替代目标”，然后不断把这个替代目标推高。
```

## Lock semantics

### Input lock
When ON, keep the exact question after sending. This supports repeating the same question across many selected passages.

### Sublecture lock
When ON, save every successful answer as a study-log entry.

## Success feedback
After a save succeeds, show green `加入成功`. The state belongs to the current answer and should reset when selected text or answer changes.
