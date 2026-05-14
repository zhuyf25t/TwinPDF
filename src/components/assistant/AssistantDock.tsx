import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { requestAssist } from "../../lib/ai/client";
import type { AppSettings, AssistMode, AssistantDockMode, SelectedContext, StudyLogEntry } from "../../shared/contracts";
import {
  emptyAnswer,
  emptySelection,
  emptyTranslation,
  friendlyError,
  heightForDockMode,
  makeFingerprint,
  makeQuestion,
  modeLabels,
  type AnswerSnapshot
} from "./assistantDockUtils";

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
    onSettingsChange({ ...settings, ...patch, assistantMode: nextMode, assistantHeight: nextHeight });
  }

  function setDockMode(nextMode: AssistantDockMode) {
    const nextHeight = nextMode === "expanded"
      ? Math.max(settings.assistantHeight, 420)
      : nextMode === "compact"
        ? Math.min(Math.max(settings.assistantHeight, 300), 316)
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

  function copyText(text: string) {
    if (!text.trim()) return;
    void navigator.clipboard.writeText(text);
  }

  const selectedStatus = hasSelection ? `${selected.pageLabel || "当前页"} · 已选中` : "等待选中英文";
  const modeText = dockMode === "expanded" ? "紧凑" : "展开";

  return (
    <aside className={`assistant-dock dock-${dockMode}`} style={{ height }}>
      <div
        className="dock-resize-handle"
        title="拖动调整 AI Assist 高度"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      />
      <div className="assistant-header">
        <div className="assistant-title">
          <strong>随堂助手</strong>
          <span>AI Assist</span>
          <em>{selectedStatus}</em>
        </div>
        <div className="assistant-header-actions">
          {dockMode !== "collapsed" && (
            <button className="dock-toggle-button" onClick={() => setDockMode(dockMode === "expanded" ? "compact" : "expanded")}>
              {modeText}
            </button>
          )}
          <button className="dock-icon-button" onClick={() => setDockMode(dockMode === "collapsed" ? "compact" : "collapsed")} aria-label={dockMode === "collapsed" ? "展开随堂助手" : "收起随堂助手"}>
            {dockMode === "collapsed" ? "↑" : "−"}
          </button>
        </div>
      </div>

      {dockMode !== "collapsed" && (
        <div className="assistant-body">
          <div className="mode-row assistant-command-row">
            <div className="mode-group">
              {(Object.keys(modeLabels) as AssistMode[]).map((item) => (
                <button
                  key={item}
                  className={`mode-chip ${mode === item ? "active" : ""}`}
                  onClick={() => void submit(item)}
                  disabled={loading}
                >
                  {modeLabels[item]}
                </button>
              ))}
            </div>
            <div className="lock-group">
              <button className={`tiny-lock ${settings.inputLocked ? "active" : ""}`} onClick={() => patchSettings({ inputLocked: !settings.inputLocked })}>
                {settings.inputLocked ? "输入已锁" : "锁定输入"}
              </button>
              <button className={`tiny-lock ${settings.autoAddLocked ? "active" : ""}`} onClick={() => patchSettings({ autoAddLocked: !settings.autoAddLocked })}>
                {settings.autoAddLocked ? "自动加入" : "锁定子讲义"}
              </button>
            </div>
            <button className="mode-chip save-chip" onClick={() => void addCurrentAnswer()} disabled={!answerState || loading || saving || alreadyAdded}>
              {saving ? "加入中..." : alreadyAdded ? "已加入" : "加入子讲义"}
            </button>
            {alreadyAdded && <span className="success-pill">加入成功</span>}
          </div>

          <div className="assistant-grid">
            <section className="assistant-box selected-zone">
              <div className="box-title">
                <span>已选原文</span>
                <button className="text-tool-button" onClick={() => copyText(hasSelection ? rawSelectedText : "")}>复制</button>
              </div>
              <div className={`selected-text ${hasSelection ? "" : "empty-state"}`} lang="en">{selectedText}</div>
            </section>

            <section className="assistant-box translation-zone">
              <div className="box-title">
                <span>浏览器翻译区</span>
                <small>这里是普通网页文本，可直接被浏览器翻译。</small>
              </div>
              <div className={`translation-surface ${hasSelection ? "" : "empty-state"}`} lang="en" translate="yes">
                {hasSelection ? translationSurface : emptyTranslation}
              </div>
            </section>

            <section className="assistant-box answer-zone">
              <div className="box-title">
                <span>AI 解释</span>
                <small>{loading ? "正在思考..." : saving ? "正在保存..." : answerState ? "最新回答" : "等待提问"}</small>
              </div>
              <div className="answer-text" aria-live="polite">
                {answerState && !currentAnswerIsFresh && <div className="stale-answer-note">已检测到新的选中文本。旧回答保留在这里，点击解释可更新。</div>}
                {answerState && <div>{answerState.text}</div>}
                {loading && <div className="loading-text">正在根据选区、本页上下文和右侧讲义整理解释...</div>}
                {error && <div className="error-text">{error}</div>}
                {!answerState && !loading && !error && <div className="empty-state">{emptyAnswer}</div>}
              </div>
            </section>
          </div>

          <div className="ask-row">
            <textarea
              rows={1}
              value={question}
              onChange={(event) => updateQuestion(event.target.value)}
              placeholder="继续追问，例如：为什么这里要最大化 ELBO？"
              aria-label="继续追问"
              onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key === "Enter") void submit("question");
              }}
            />
            <button className="send-button" disabled={loading} onClick={() => void submit("question")}>
              {loading ? "..." : "发送"}
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
