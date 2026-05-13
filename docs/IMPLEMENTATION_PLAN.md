# Implementation Plan

## Phase 0 — Read and align
Read all docs. Do not code until the vision is clear.

## Phase 1 — Workspace memory
Implement folder selection, workspace creation, settings/log load/save, last workspace handle.

## Phase 2 — Main layout
Implement two-pane workspace and bottom assistant dock.

## Phase 3 — PDF and handout loading
Implement left PDF loading, text extraction, right Markdown loading.

## Phase 4 — Sentence pipeline
Implement page sentence extraction and cache. Add `/api/ai/label-page` and background queue.

## Phase 5 — AI Assist
Implement assist API, warm prompts, locks, success badge, auto/manual add.

## Phase 6 — Final summary
Implement final summary generation, Markdown preview, save to workspace.

## Phase 7 — Real PDF smoke test
Use the user's path and write results to `WORKLOG.md`.

## Phase 8 — Hardening loop
Keep improving until `FINAL_DONE_CHECKLIST.md` is complete.
