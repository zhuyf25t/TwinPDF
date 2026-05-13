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
  onFinalize: () => void;
};

type AnswerSnapshot = {
  id: string;
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

const EMPTY_SELECTION = "在左侧英文 PDF 中选中一句话或一段文字，这里会立即更新。";
const EMPTY_TRANSLATION = "选中英文后，这里会变成可被浏览器翻译的普通网页文本。";
const EMPTY_ANSWER = "选中文本后，可以点“解释 / 翻译 / 举例”，也可以在下面直接追问。";

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
  return Math.max(260, Math.min(620, Number.isFinite(height) ? height : 320));
}

function friendlyError(error: unknown, action: string) {
  const message = error instanceof Error ? error.message : String(error);
  if (/Failed to fetch|NetworkError|fetch/i.test(message)) {
    return `${action}没有完成：本地服务暂时不可用，请确认 npm run dev 还在运行。`;
  }
  return `${action}没有完成：${message}`;
}

export function AssistantDock({
  courseTitle,
  workspaceName,
  selected,
  rightNoteContext,
  recentEntries,
  settings,
  onSettingsChange,
  onAddEntry,
  onFinalize
}: AssistantDockProps) {
  const [mode, setMode] = useState<AssistMode>("explain");
  const [question, setQuestion] = useState("");
  const [answerState, setAnswerState] = useState<AnswerSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const dragState = useRef<{ startY: number; startHeight: number } | null>(null);
  const questionRef = useRef(question);
  const editVersionRef = useRef(0);

  const rawSelectedText = selected.selectedText || "";
  const hasSelection = rawSelectedText.trim().length > 0;
  const selectedText = hasSelection ? rawSelectedText : EMPTY_SELECTION;
  const translationSurface = hasSelection ? rawSelectedText : "";
  const pageContext = selected.nearbyContext || selected.pageText || "";
  const addSuccess = Boolean(answerState && lastAddedId === answerState.id);
  const height = collapsed ? 52 : clampDockHeight(settings.assistantHeight);

  const selectionSignature = useMemo(() => [
    rawSelectedText,
    selected.pageLabel,
    selected.pageNumber ?? "",
    selected.sentenceId ?? "",
    selected.source
  ].join("\u001f"), [rawSelectedText, selected.pageLabel, selected.pageNumber, selected.sentenceId, selected.source]);

  useEffect(() => {
    setAnswerState(null);
    setLastAddedId(null);
    setError(null);
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
  }

  function buildSnapshot(id: string, text: string, submittedQuestion: string, submittedMode: AssistMode): AnswerSnapshot {
    return {
      id,
      text,
      question: submittedQuestion,
      mode: submittedMode,
      selectedText: hasSelection ? rawSelectedText : "",
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
    setLastAddedId(snapshot.id);
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
    setLastAddedId(null);

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
        <strong>AI Assist · 随堂助手</strong>
        <div className="assistant-locks">
          <button className={`tiny-lock ${settings.inputLocked ? "active" : ""}`} onClick={() => patchSettings({ inputLocked: !settings.inputLocked })} title="锁住输入：同一个问题可以连续问不同选区">
            {settings.inputLocked ? "🔒 输入锁定" : "🔓 输入不锁"}
          </button>
          <button className={`tiny-lock ${settings.autoAddLocked ? "active" : ""}`} onClick={() => patchSettings({ autoAddLocked: !settings.autoAddLocked })} title="锁住子讲义：成功回答后自动加入个人子讲义">
            {settings.autoAddLocked ? "🔒 自动加入" : "🔓 手动加入"}
          </button>
          {addSuccess && <span className="success-pill">加入成功</span>}
          <button className="icon-button" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? "展开 AI Assist" : "收起 AI Assist"}>
            {collapsed ? "⌃" : "⌄"}
          </button>
          <button className="course-summary-mini" onClick={onFinalize}>结束课程总结</button>
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
            <button className="mode-chip save-chip" onClick={() => void addCurrentAnswer()} disabled={!answerState || loading || saving || addSuccess}>
              {saving ? "正在加入..." : "收进子讲义"}
            </button>
          </div>

          <div className="assistant-grid">
            <section className="assistant-box selected-zone">
              <div className="box-title">已选原文 <span>{selected.pageLabel || "等待选择"}</span></div>
              <div className={`selected-text ${hasSelection ? "" : "empty-state"}`} lang="en">{selectedText}</div>
            </section>

            <section className="assistant-box translation-zone">
              <div className="box-title">浏览器翻译区 <span>可直接翻译</span></div>
              <div className={`translation-surface ${hasSelection ? "" : "empty-state"}`} lang="en" translate="yes">
                {hasSelection ? translationSurface : EMPTY_TRANSLATION}
              </div>
            </section>

            <section className="assistant-box answer-zone">
              <div className="box-title">
                AI 解释
                <span>{loading ? "正在思考..." : saving ? "正在保存..." : answerState ? "最新回答" : "等待提问"}</span>
              </div>
              <div className="answer-text" aria-live="polite">
                {answerState && <div>{answerState.text}</div>}
                {loading && <div className="loading-text">正在根据选区、本页上下文和右侧讲义整理解释...</div>}
                {error && <div className="error-text">{error}</div>}
                {!answerState && !loading && !error && <div className="empty-state">{EMPTY_ANSWER}</div>}
              </div>
            </section>
          </div>

          <div className="ask-row">
            <textarea
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
