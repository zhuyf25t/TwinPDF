# Data Schema

Core types are in `src/shared/contracts.ts`.

## WorkspaceManifest
Tracks workspace identity.

## AppSettings
UI and behavior settings saved in `memory/settings.json`.

## SelectedContext
The current selected passage plus page context.

## StudyLogEntry
The persistent learning event used to build personal sub-handouts.

## SentenceIndex
Page-level extracted sentences.

## SentenceLabel
AI-generated metadata that makes later explanations faster.
