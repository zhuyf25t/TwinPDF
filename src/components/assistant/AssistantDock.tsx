import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { requestAssist } from "../../lib/ai/client";
import type { AppSettings, AssistMode, AssistantDockMode, SelectedContext, StudyLogEntry } from "../../shared/contracts";
import { AiAnswerPanel } from "./AiAnswerPanel";
import { AssistantDockHandle } from "./AssistantDockHandle";
import { AssistantHeader } from "./AssistantHeader";
import { AssistantInput } from "./AssistantInput";
import { AssistantLocks } from "./AssistantLocks";
import {
  assistantHeightStorageKey,
  assistantModeStorageKey,
  assistantXStorageKey,
  assistantYStorageKey,
  emptyAnswer,
  emptySelection,
  friendlyError,
  heightForDockMode,
  makeFingerprint,
  makeQuestion,
  type AnswerSnapshot
} from "./assistantDockUtils";
import { SelectedTextPanel } from "./SelectedTextPanel";

type AssistantDockProps = {
  courseTitle: string;
  workspaceName?: string;
  selected: SelectedContext;
  rightNoteContext: string;
  recentEntries: StudyLogEntry[];
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  onAddEntry: (entry: StudyLogEntry) => Promise<void> | void;
};

export function AssistantDock({
  courseTitle,
  workspaceName,
  selected,
  rightNoteContext,
  recentEntries,
  settings,
  onSettingsChange,
  onAddEntry
}: AssistantDockProps) {
  const [mode, setMode] = useState<AssistMode>("explain");
  const [question, setQuestion] = useState("");
  const [answerState, setAnswerState] = useState<AnswerSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAddedFingerprint, setLastAddedFingerprint] = useState<string | null>(null);
  const dragState = useRef<{ startY: number; startHeight: number } | null>(null);
  const moveState = useRef<{ startX: number; startY: number; dockX: number; dockY: number; width: number; height: number } | null>(null);
  const dockRef = useRef<HTMLElement | null>(null);
  const questionRef = useRef(question);
  const editVersionRef = useRef(0);

  const rawSelectedText = selected.selectedText || "";
  const hasSelection = rawSelectedText.trim().length > 0;
  const selectedText = hasSelection ? rawSelectedText : emptySelection;
  const translationSurface = hasSelection ? rawSelectedText : "";
  const pageContext = selected.nearbyContext || selected.pageText || "";
  const dockMode = settings.assistantMode ?? "compact";
  const height = heightForDockMode(settings.assistantHeight, dockMode);

  const selectionSignature = useMemo(() => [
    rawSelectedText,
    selected.pageLabel,
    selected.pageNumber ?? "",
    selected.sentenceId ?? "",
    selected.source
  ].join("\u001f"), [rawSelectedText, selected.pageLabel, selected.pageNumber, selected.sentenceId, selected.source]);

  const currentAnswerIsFresh = Boolean(answerState && answerState.selectionSignature === selectionSignature);
  const alreadyAdded = Boolean(answerState && (
    lastAddedFingerprint === answerState.fingerprint
    || recentEntries.some((entry) => makeFingerprint(entry.selectedText, entry.question, entry.answer) === answerState.fingerprint)
  ));

  useEffect(() => {
    setError(null);
    setLastAddedFingerprint(null);
  }, [selectionSignature]);

  useEffect(() => {
    questionRef.current = question;
  }, [question]);

  function patchSettings(patch: Partial<AppSettings>) {
    const nextMode = patch.assistantMode ?? settings.assistantMode ?? "compact";
    const rawHeight = patch.assistantHeight === undefined ? settings.assistantHeight : patch.assistantHeight;
    const nextHeight = heightForDockMode(rawHeight, nextMode);
    try {
      window.localStorage.setItem(assistantHeightStorageKey, String(nextHeight));
      window.localStorage.setItem(assistantModeStorageKey, nextMode);
      if (typeof patch.assistantX === "number") window.localStorage.setItem(assistantXStorageKey, String(patch.assistantX));
      if (typeof patch.assistantY === "number") window.localStorage.setItem(assistantYStorageKey, String(patch.assistantY));
    } catch {
      // Workspace settings remain the source of truth; localStorage is only a small fallback preference.
    }
    onSettingsChange({ ...settings, ...patch, assistantMode: nextMode, assistantHeight: nextHeight });
  }

  function setDockMode(nextMode: AssistantDockMode) {
    const nextHeight = nextMode === "expanded"
      ? Math.min(Math.max(settings.assistantHeight, 360), 380)
      : nextMode === "compact"
        ? Math.min(Math.max(settings.assistantHeight, 300), 320)
        : settings.assistantHeight;
    patchSettings({ assistantMode: nextMode, assistantHeight: nextHeight });
  }

  function updateQuestion(value: string) {
    editVersionRef.current += 1;
    questionRef.current = value;
    setQuestion(value);
    setLastAddedFingerprint(null);
  }

  function buildSnapshot(id: string, text: string, submittedQuestion: string, submittedMode: AssistMode): AnswerSnapshot {
    const selectedForEntry = hasSelection ? rawSelectedText : "";
    return {
      id,
      fingerprint: makeFingerprint(selectedForEntry, submittedQuestion, text),
      selectionSignature,
      text,
      question: submittedQuestion,
      mode: submittedMode,
      selectedText: selectedForEntry,
      translationSurface,
      pageContext,
      rightNoteContext,
      pageLabel: selected.pageLabel,
      pageNumber: selected.pageNumber,
      source: selected.source,
      sentenceId: selected.sentenceId
    };
  }

  async function persistEntry(snapshot: AnswerSnapshot) {
    if (recentEntries.some((entry) => makeFingerprint(entry.selectedText, entry.question, entry.answer) === snapshot.fingerprint)) {
      setLastAddedFingerprint(snapshot.fingerprint);
      return;
    }

    const entry: StudyLogEntry = {
      id: snapshot.id,
      createdAt: new Date().toISOString(),
      courseTitle,
      workspaceName,
      pageLabel: snapshot.pageLabel,
      pageNumber: snapshot.pageNumber,
      mode: snapshot.mode,
      selectedText: snapshot.selectedText,
      translationSurface: snapshot.translationSurface,
      question: snapshot.question,
      answer: snapshot.text,
      rightNoteContext: snapshot.rightNoteContext.slice(0, 1800),
      pageContext: snapshot.pageContext.slice(0, 2400),
      source: snapshot.source,
      sentenceId: snapshot.sentenceId
    };
    await onAddEntry(entry);
    setLastAddedFingerprint(snapshot.fingerprint);
  }

  function clearQuestionAfterSuccess(inputAtSubmit: string, editVersionAtSubmit: number) {
    if (settings.inputLocked) return;
    if (editVersionRef.current !== editVersionAtSubmit) return;
    if (questionRef.current !== inputAtSubmit) return;
    updateQuestion("");
  }

  async function submit(nextMode = mode) {
    const inputAtSubmit = questionRef.current;
    const submittedQuestion = makeQuestion(nextMode, inputAtSubmit);
    const editVersionAtSubmit = editVersionRef.current;

    setMode(nextMode);
    setLoading(true);
    setError(null);
    setLastAddedFingerprint(null);

    try {
      const result = await requestAssist({
        selectedText: hasSelection ? rawSelectedText : "",
        pageContext,
        rightNoteContext,
        question: submittedQuestion,
        mode: nextMode,
        pageLabel: selected.pageLabel,
        pageNumber: selected.pageNumber,
        courseTitle,
        workspaceName,
        sentenceLabels: selected.labels,
        recentEntries: recentEntries.slice(0, 4).map((entry) => ({
          question: entry.question,
          answer: entry.answer,
          selectedText: entry.selectedText,
          pageLabel: entry.pageLabel
        }))
      });

      const snapshot = buildSnapshot(crypto.randomUUID(), result.answer, submittedQuestion, nextMode);
      setAnswerState(snapshot);

      if (settings.autoAddLocked) {
        setSaving(true);
        try {
          await persistEntry(snapshot);
        } catch (saveError) {
          setError(friendlyError(saveError, "回答已生成，但自动加入子讲义"));
        } finally {
          setSaving(false);
        }
      }

      clearQuestionAfterSuccess(inputAtSubmit, editVersionAtSubmit);
    } catch (assistError) {
      setError(friendlyError(assistError, "AI 解释"));
    } finally {
      setLoading(false);
    }
  }

  async function addCurrentAnswer() {
    if (!answerState) {
      setError("先得到一次 AI 回答，再加入个人子讲义。");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await persistEntry(answerState);
    } catch (saveError) {
      setError(friendlyError(saveError, "加入个人子讲义"));
    } finally {
      setSaving(false);
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (dockMode === "collapsed") setDockMode("compact");
    dragState.current = { startY: event.clientY, startHeight: heightForDockMode(settings.assistantHeight, dockMode === "collapsed" ? "compact" : dockMode) };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragState.current) return;
    const delta = dragState.current.startY - event.clientY;
    const nextHeight = dragState.current.startHeight + delta;
    patchSettings({ assistantHeight: nextHeight, assistantMode: nextHeight > 330 ? "expanded" : "compact" });
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    dragState.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleMovePointerDown(event: PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("button")) return;
    const box = dockRef.current?.getBoundingClientRect();
    if (!box) return;
    moveState.current = {
      startX: event.clientX,
      startY: event.clientY,
      dockX: box.left,
      dockY: box.top,
      width: box.width,
      height: box.height
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleMovePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!moveState.current) return;
    const state = moveState.current;
    const nextX = clamp(state.dockX + event.clientX - state.startX, 10, window.innerWidth - state.width - 10);
    const nextY = clamp(state.dockY + event.clientY - state.startY, 10, window.innerHeight - state.height - 10);
    patchSettings({ assistantX: nextX, assistantY: nextY });
  }

  function handleMovePointerEnd(event: PointerEvent<HTMLDivElement>) {
    moveState.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function copyText(text: string) {
    if (!text.trim()) return;
    void navigator.clipboard.writeText(text);
  }

  const selectedStatus = hasSelection ? `${selected.pageLabel || "当前页"} · 已选中` : "等待选中英文";
  const modeText = dockMode === "expanded" ? "紧凑" : "展开";
  const hasCustomPosition = Number.isFinite(settings.assistantX) && Number.isFinite(settings.assistantY);
  const dockStyle = {
    height,
    ...(hasCustomPosition ? { left: settings.assistantX, top: settings.assistantY, right: "auto", bottom: "auto" } : {})
  } as CSSProperties;

  return (
    <aside ref={dockRef} className={`assistant-dock dock-${dockMode}`} style={dockStyle}>
      <AssistantDockHandle
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      />
      <AssistantHeader
        dockMode={dockMode}
        selectedStatus={selectedStatus}
        modeText={modeText}
        onToggleSize={() => setDockMode(dockMode === "expanded" ? "compact" : "expanded")}
        onToggleCollapse={() => setDockMode(dockMode === "collapsed" ? "compact" : "collapsed")}
        onMovePointerDown={handleMovePointerDown}
        onMovePointerMove={handleMovePointerMove}
        onMovePointerUp={handleMovePointerEnd}
        onMovePointerCancel={handleMovePointerEnd}
      />

      {dockMode !== "collapsed" && (
        <div className="assistant-body">
          <AssistantLocks
            mode={mode}
            loading={loading}
            saving={saving}
            alreadyAdded={alreadyAdded}
            hasAnswer={Boolean(answerState)}
            settings={settings}
            onSubmitMode={(nextMode) => void submit(nextMode)}
            onSettingsPatch={patchSettings}
            onAddCurrentAnswer={() => void addCurrentAnswer()}
          />

          <div className="assistant-grid">
            <SelectedTextPanel
              hasSelection={hasSelection}
              selectedText={selectedText}
              onCopy={() => copyText(hasSelection ? rawSelectedText : "")}
            />
            <AiAnswerPanel
              answerState={answerState}
              currentAnswerIsFresh={currentAnswerIsFresh}
              loading={loading}
              saving={saving}
              error={error}
              emptyAnswer={emptyAnswer}
            />
          </div>

          <AssistantInput
            question={question}
            loading={loading}
            onQuestionChange={updateQuestion}
            onSubmit={() => void submit("question")}
          />
        </div>
      )}
    </aside>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
