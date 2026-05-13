# Workspace Storage Spec

## Goal
All meaningful learning data must live in the user-selected local folder. Browser storage should not contain study logs, PDF text, or AI answers.

## Workspace structure

```text
TwinPDF-Workspace/
  twinpdf.workspace.json
  sources/
    <imported-pdfs>.pdf
  handouts/
    current-handout.md
    imported-handouts/
  memory/
    settings.json
    study-log.json
    session-log.jsonl
    personal-subhandout.md
  exports/
    personal-sublecture-YYYYMMDD-HHMM.md
  cache/
    sentences/
      <pdf-id>.json
    page-labels/
      <pdf-id>/page-0001.json
    pdf-index/
      <pdf-id>.json
```

## Browser storage policy
Allowed:

- last workspace directory handle in IndexedDB;
- workspace display name;
- UI-only ephemeral state if absolutely necessary.

Not allowed:

- question logs;
- AI answers;
- full PDF text;
- final summaries;
- generated handouts.

## Manifest
`twinpdf.workspace.json`:

```json
{
  "schemaVersion": 1,
  "app": "TwinPDF",
  "workspaceName": "Physics_Final_Review",
  "createdAt": "2026-05-13T00:00:00.000Z",
  "updatedAt": "2026-05-13T00:00:00.000Z"
}
```

## Settings
`memory/settings.json`:

```json
{
  "assistantHeight": 320,
  "inputLocked": false,
  "autoAddLocked": false,
  "lastLeftPdfName": "lecture8.pdf",
  "lastRightHandoutName": "lecture8-handout.md"
}
```

## Study log
`memory/study-log.json` stores an array of saved entries. Use JSON for easy rewrite in MVP. Later, append-only `session-log.jsonl` can support better resilience.

## Cache policy
Cache files are allowed only inside `cache/` and must be human-explainable:

- sentence indexes;
- page labels;
- PDF text indexes.

No random Vite/browser caches inside the workspace.

## Resilience
If a workspace file is corrupt:

1. show a friendly warning;
2. keep the corrupt file as `.broken.<timestamp>`;
3. recreate a clean default;
4. do not silently delete user data.
