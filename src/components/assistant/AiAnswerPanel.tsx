import type { AnswerSnapshot } from "./assistantDockUtils";

type AiAnswerPanelProps = {
  answerState: AnswerSnapshot | null;
  currentAnswerIsFresh: boolean;
  loading: boolean;
  saving: boolean;
  error: string | null;
  emptyAnswer: string;
};

export function AiAnswerPanel({
  answerState,
  currentAnswerIsFresh,
  loading,
  saving,
  error,
  emptyAnswer
}: AiAnswerPanelProps) {
  return (
    <section className="assistant-box answer-zone">
      <div className="box-title">
        <span>AI 解释</span>
        <small>{loading ? "正在思考..." : saving ? "正在保存..." : answerState ? "最新回答" : "等待提问"}</small>
      </div>
      <div className="answer-text" aria-live="polite">
        {answerState && !currentAnswerIsFresh && (
          <div className="stale-answer-note">已检测到新的选中文本。旧回答保留在这里，点击解释可更新。</div>
        )}
        {answerState && <div>{answerState.text}</div>}
        {loading && <div className="loading-text">正在根据选区、本页上下文和右侧讲义整理解释...</div>}
        {error && <div className="error-text">{error}</div>}
        {!answerState && !loading && !error && <div className="empty-state">{emptyAnswer}</div>}
      </div>
    </section>
  );
}
