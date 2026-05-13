import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { requestAssist } from "../../lib/ai/client";
import type { AppSettings, AssistMode, SelectedContext, StudyLogEntry } from "../../shared/contracts";

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

type AnswerSnapshot = {
  id: string;
  fingerprint: string;
  selectionSignature: string;
  text: string;
  question: string;
  mode: AssistMode;
  selectedText: string;
  translationSurface: string;
  pageContext: string;
  rightNoteContext: string;
  pageLabel?: string;
  pageNumber?: number;
  source?: SelectedContext["source"];
  sentenceId?: string;
};

const modeLabels: Record<AssistMode, string> = {
  explain: "解释",
  translate: "翻译",
  example: "举例",
  question: "追问"
};

const emptySelection = "在左侧英文 PDF 中选中一句话或一段文字，这里会立即更新。";
const emptyTranslation = "这里是普通网页文本，可直接被浏览器翻译。";
const emptyAnswer = "点击解释，或在下方输入你的问题。";

function defaultQuestionForMode(mode: AssistMode) {
  if (mode === "translate") return "请解释这段英文的准确含义，并保留关键术语。";
  if (mode === "example") return "请给一个非常具体的小例子，让我能立刻理解。";
  if (mode === "question") return "请结合这段原文和本页上下文回答我的问题。";
  return "请用通俗语言解释这句话在本页中的作用。";
}

function makeQuestion(mode: AssistMode, question: string) {
  return question.trim() || defaultQuestionForMode(mode);
}

function clampDockHeight(height: number) {
  const viewportMax = typeof window === "undefined" ? 540 : Math.floor(window.innerHeight * 0.55);
  return Math.max(280, Math.min(viewportMax, Number.isFinite(height) ? height : 340));
}

function friendlyError(error: unknown, action: string) {
  const message = error instanceof Error ? error.message : String(error);
  if (/Failed to fetch|NetworkError|fetch/i.test(message)) {
    return `${action}没有完成：本地服务暂时不可用，请确认 npm run dev 还在运行。`;
  }
  return `${action}没有完成：${message}`;
}

function makeFingerprint(selectedText: string, question: string, answer: string) {
  return [selectedText.trim(), question.trim(), answer.trim()].join("\u001e");
}

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
  const [collapsed, setCollapsed] = useState(false);
  const [lastAddedFingerprint, setLastAddedFingerprint] = useState<string | null>(null);
  const dragState = useRef<{ startY: number; startHeight: number } | null>(null);
  const questionRef = useRef(question);
  const editVersionRef = useRef(0);

  const rawSelectedText = selected.selectedText || "";
  const hasSelection = rawSelectedText.trim().length > 0;
  const selectedText = hasSelection ? rawSelectedText : emptySelection;
  const translationSurface = hasSelection ? rawSelectedText : "";
  const pageContext = selected.nearbyContext || selected.pageText || "";
  const height = collapsed ? 44 : clampDockHeight(settings.assistantHeight);

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
    const nextHeight = patch.assistantHeight === undefined ? settings.assistantHeight : clampDockHeight(patch.assistantHeight);
    onSettingsChange({ ...settings, ...patch, assistantHeight: nextHeight });
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
    setCollapsed(false);
    dragState.current = { startY: event.clientY, startHeight: clampDockHeight(settings.assistantHeight) };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragState.current) return;
    const delta = dragState.current.startY - event.clientY;
    patchSettings({ assistantHeight: dragState.current.startHeight + delta });
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

  return (
    <aside className={`assistant-dock ${collapsed ? "collapsed" : ""}`} style={{ height }}>
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
          <strong>AI Assist</strong>
          <span>随堂助手</span>
          <em>{selectedStatus}</em>
        </div>
        <div className="assistant-header-actions">
          <button className="icon-button" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? "展开 AI Assist" : "收起 AI Assist"}>
            {collapsed ? "展开" : "收起"}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="assistant-body">
          <div className="mode-row">
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
            <button className="mode-chip save-chip" onClick={() => void addCurrentAnswer()} disabled={!answerState || loading || saving || alreadyAdded}>
              {saving ? "正在加入..." : alreadyAdded ? "已加入" : "加入个人子讲义"}
            </button>
            {alreadyAdded && <span className="success-pill">加入成功</span>}
          </div>

          <div className="assistant-grid">
            <section className="assistant-box selected-zone">
              <div className="box-title">
                <span>Selected Text</span>
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
                <span>AI Answer</span>
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
            <button className={`tiny-lock ${settings.inputLocked ? "active" : ""}`} onClick={() => patchSettings({ inputLocked: !settings.inputLocked })}>
              {settings.inputLocked ? "输入已锁" : "输入不锁"}
            </button>
            <button className={`tiny-lock ${settings.autoAddLocked ? "active" : ""}`} onClick={() => patchSettings({ autoAddLocked: !settings.autoAddLocked })}>
              {settings.autoAddLocked ? "自动加入已锁" : "手动加入"}
            </button>
            <button className="send-button" disabled={loading} onClick={() => void submit("question")}>
              {loading ? "..." : "发送"}
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
