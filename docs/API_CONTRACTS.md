# API Contracts

All contracts live in `src/shared/contracts.ts` and are imported by frontend and backend.

## POST /api/ai/assist
Explains selected text using page context.

Request:

```ts
AssistRequest
```

Response:

```ts
AssistResponse
```

## POST /api/ai/label-page
Labels sentence records for one page.

Request:

```ts
LabelPageRequest
```

Response:

```ts
LabelPageResponse
```

## POST /api/ai/finalize
Generates final personal Markdown sub-lecture.

Request:

```ts
FinalizeRequest
```

Response:

```ts
FinalizeResponse
```

## Security
- `DEEPSEEK_API_KEY` is read only by server code.
- Never return env values to the browser.
- Frontend uses relative `/api/ai/*` routes only.
