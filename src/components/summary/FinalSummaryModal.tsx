import type { StudyLogEntry } from "../../shared/contracts";

type FinalSummaryModalProps = {
  open: boolean;
  markdown: string;
  loading: boolean;
  error: string | null;
  entries: StudyLogEntry[];
  savedPath?: string | null;
  onClose: () => void;
  onCopy: () => void;
  onSave: () => void;
};

export function FinalSummaryModal({ open, markdown, loading, error, entries, savedPath, onClose, onCopy, onSave }: FinalSummaryModalProps) {
  if (!open) return null;
  return (
    <div className="modal-backdrop">
      <section className="summary-modal">
        <header className="summary-header">
          <div>
            <h2>结束课程总结</h2>
            <p>将本次保存的 {entries.length} 条问答整理成个人子讲义。</p>
          </div>
          <button className="icon-button" onClick={onClose}>×</button>
        </header>
        <div className="summary-body">
          <aside className="summary-list">
            <h3>本次保存的问题</h3>
            {entries.length === 0 && <p className="muted">还没有加入个人子讲义的问答。</p>}
            {entries.map((entry, index) => (
              <article key={entry.id} className="summary-entry-card">
                <strong>{index + 1}. {entry.pageLabel || "未知页"}</strong>
                <p>{entry.question}</p>
                <small>{entry.selectedText.slice(0, 110)}</small>
              </article>
            ))}
          </aside>
          <main className="summary-preview">
            {loading && <p>正在生成个人子讲义……</p>}
            {error && <p className="error-text">{error}</p>}
            {!loading && !error && <textarea readOnly value={markdown} />}
          </main>
        </div>
        <footer className="summary-footer">
          {savedPath && <span className="success-pill">已保存到 {savedPath}</span>}
          <button className="secondary-button" onClick={onCopy}>复制全文</button>
          <button className="primary-button" onClick={onSave}>保存到工作区</button>
        </footer>
      </section>
    </div>
  );
}
