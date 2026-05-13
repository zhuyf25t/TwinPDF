import { useEffect, useMemo, useRef, useState } from "react";
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

const modeLabels: Record<AssistMode, string> = {
  explain: "解释",
  translate: "翻译",
  example: "举例",
  question: "追问"
};

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
  const [question, setQuestion] = useState("请用通俗语言解释这句话在本页中的作用。");
  const [answer, setAnswer] = useState("选中英文课件中的一句话或一段话后，这里会给出真正面向学习的解释。翻译区会随着选中内容自动更新，并且是普通网页文本，方便浏览器/翻译插件快速翻译。")
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [currentAnswerId, setCurrentAnswerId] = useState(() => crypto.randomUUID());
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const dragState = useRef<{ startY: number; startHeight: number } | null>(null);

  const selectedText = selected.selectedText || "在左侧英文 PDF 中选中一段文字，这里会自动更新。";
  const pageContext = selected.nearbyContext || selected.pageText || "";
  const translationSurface = selectedText;
  const addSuccess = lastAddedId === currentAnswerId;
  const height = collapsed ? 48 : settings.assistantHeight;

  useEffect(() => {
    setCurrentAnswerId(crypto.randomUUID());
    setLastAddedId(null);
  }, [selectedText]);

  const effectiveQuestion = useMemo(() => {
    if (question.trim()) return question.trim();
    if (mode === "translate") return "请解释这段英文的准确含义，并保留关键术语。";
    if (mode === "example") return "请给一个非常具体的小例子，让我能立刻理解。";
    return "请用通俗语言解释这句话在本页中的作用。";
  }, [mode, question]);

  function patchSettings(patch: Partial<AppSettings>) {
    onSettingsChange({ ...settings, ...patch });
  }

  async function submit(nextMode = mode) {
    if (!selectedText.trim() && !effectiveQuestion.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await requestAssist({
        selectedText,
        pageContext,
        rightNoteContext,
        question: effectiveQuestion,
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
      setAnswer(result.answer);
      const answerId = crypto.randomUUID();
      setCurrentAnswerId(answerId);
      setLastAddedId(null);
      if (settings.autoAddLocked) await addEntry(result.answer, answerId, nextMode);
      if (!settings.inputLocked) setQuestion("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function addEntry(answerOverride = answer, idOverride = currentAnswerId, modeOverride = mode) {
    const entry: StudyLogEntry = {
      id: idOverride,
      createdAt: new Date().toISOString(),
      courseTitle,
      workspaceName,
      pageLabel: selected.pageLabel,
      pageNumber: selected.pageNumber,
      mode: modeOverride,
      selectedText,
      translationSurface,
      question: effectiveQuestion,
      answer: answerOverride,
      rightNoteContext: rightNoteContext.slice(0, 1800),
      pageContext: pageContext.slice(0, 2400),
      source: selected.source,
      sentenceId: selected.sentenceId
    };
    await onAddEntry(entry);
    setLastAddedId(idOverride);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    dragState.current = { startY: event.clientY, startHeight: settings.assistantHeight };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragState.current) return;
    const delta = dragState.current.startY - event.clientY;
    const next = Math.max(190, Math.min(620, dragState.current.startHeight + delta));
    patchSettings({ assistantHeight: next });
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    dragState.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return (
    <aside className={`assistant-dock ${collapsed ? "collapsed" : ""}`} style={{ height }}>
      <div
        className="dock-resize-handle"
        title="拖动调整 AI Assist 高度"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
      <div className="assistant-header">
        <strong>✦ AI Assist</strong>
        <div className="assistant-locks">
          <button className={`tiny-lock ${settings.inputLocked ? "active" : ""}`} onClick={() => patchSettings({ inputLocked: !settings.inputLocked })} title="锁住输入框：适合用同一个问题反复问不同文本">
            {settings.inputLocked ? "🔒 输入" : "🔓 输入"}
          </button>
          <button className={`tiny-lock ${settings.autoAddLocked ? "active" : ""}`} onClick={() => patchSettings({ autoAddLocked: !settings.autoAddLocked })} title="锁住子讲义：AI 成功回答后自动加入个人子讲义">
            {settings.autoAddLocked ? "🔒 子讲义" : "🔓 子讲义"}
          </button>
          {addSuccess && <span className="success-pill">✓ 加入成功</span>}
          <button className="icon-button" onClick={() => setCollapsed((v) => !v)}>{collapsed ? "⌃" : "⌄"}</button>
          <button className="course-summary-mini" onClick={onFinalize}>结束课程总结</button>
        </div>
      </div>
      {!collapsed && (
        <>
          <div className="mode-row">
            {(Object.keys(modeLabels) as AssistMode[]).map((item) => (
              <button
                key={item}
                className={`mode-chip ${mode === item ? "active" : ""}`}
                onClick={() => { setMode(item); void submit(item); }}
                disabled={loading}
              >
                {modeLabels[item]}
              </button>
            ))}
            <button className="mode-chip" onClick={() => void addEntry()} disabled={loading}>加入个人子讲义</button>
          </div>
          <div className="assistant-grid">
            <section className="assistant-box selected-zone">
              <div className="box-title">已选原文 <span>{selected.pageLabel}</span></div>
              <div className="selected-text" lang="en">{selectedText}</div>
            </section>
            <section className="assistant-box translation-zone">
              <div className="box-title">浏览器翻译区 <span>普通 HTML · 可被浏览器/插件翻译</span></div>
              <div className="translation-surface" lang="en" translate="yes">{translationSurface}</div>
            </section>
            <section className="assistant-box answer-zone">
              <div className="box-title">AI 解释 {loading && <span>正在思考…</span>}</div>
              <div className="answer-text">{error ? <span className="error-text">{error}</span> : answer}</div>
            </section>
          </div>
          <div className="ask-row">
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="继续追问，例如：为什么这里要最大化 ELBO？"
              onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key === "Enter") void submit("question");
              }}
            />
            <button className="send-button" disabled={loading} onClick={() => void submit("question")}>{loading ? "…" : "↑"}</button>
          </div>
        </>
      )}
    </aside>
  );
}
