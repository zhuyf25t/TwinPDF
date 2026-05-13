import { useEffect, useMemo, useState } from "react";
import { renderSimpleMarkdown } from "../../lib/markdown";
import type { StudyLogEntry } from "../../shared/contracts";

type FinalSummaryModalProps = {
  open: boolean;
  markdown: string;
  loading: boolean;
  error: string | null;
  entries: StudyLogEntry[];
  savedPath?: string | null;
  onClose: () => void;
  onCopy: () => Promise<void> | void;
  onSave: () => Promise<void> | void;
};

export function FinalSummaryModal({ open, markdown, loading, error, entries, savedPath, onClose, onCopy, onSave }: FinalSummaryModalProps) {
  const [copyStatus, setCopyStatus] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const previewHtml = useMemo(() => renderSimpleMarkdown(markdown), [markdown]);
  const canUseMarkdown = !loading && markdown.trim().length > 0;

  useEffect(() => {
    if (!open) return;
    setCopyStatus("");
    setSaveStatus("");
  }, [open, markdown]);

  async function handleCopy() {
    if (!canUseMarkdown) return;
    setCopyStatus("正在复制…");
    try {
      await onCopy();
      setCopyStatus("已复制");
    } catch {
      setCopyStatus("复制失败，请稍后再试");
    }
  }

  async function handleSave() {
    if (!canUseMarkdown) return;
    setSaveStatus("正在保存…");
    try {
      await onSave();
      setSaveStatus("已保存到工作区");
    } catch {
      setSaveStatus("保存失败，请检查工作区权限");
    }
  }

  if (!open) return null;
  return (
    <div className="modal-backdrop">
      <section className="summary-modal">
        <header className="summary-header">
          <div>
            <h2>结束课程总结</h2>
            <p>将本次保存的 {entries.length} 条问答整理成个人子讲义。</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="关闭">×</button>
        </header>
        <div className="summary-body">
          <aside className="summary-list">
            <h3>本次保存的问题</h3>
            {entries.length === 0 && <p className="muted">还没有加入个人子讲义的问答。</p>}
            {entries.map((entry, index) => (
              <article key={entry.id} className="summary-entry-card">
                <strong>{index + 1}. {entry.pageLabel || "未知页"}</strong>
                <p>{entry.question || "请解释这段内容"}</p>
                <small>{entry.selectedText.slice(0, 110) || "未记录原文"}</small>
              </article>
            ))}
          </aside>
          <main className="summary-preview">
            <div className="summary-preview-title">Markdown 预览</div>
            {loading && <p>正在生成个人子讲义……</p>}
            {error && <p className="error-text">{error}</p>}
            {canUseMarkdown && <article className="markdown-preview summary-markdown" dangerouslySetInnerHTML={{ __html: previewHtml }} />}
            {!loading && !markdown.trim() && !error && <p className="muted">暂无可预览内容。</p>}
          </main>
        </div>
        <footer className="summary-footer">
          <div className="summary-status" aria-live="polite">
            {copyStatus && <span className={copyStatus.includes("失败") ? "error-text" : "success-pill"}>{copyStatus}</span>}
            {saveStatus && <span className={saveStatus.includes("失败") ? "error-text" : "success-pill"}>{saveStatus}</span>}
            {savedPath && <span className="success-pill">已保存到 {savedPath}</span>}
          </div>
          <button className="secondary-button" onClick={() => void handleCopy()} disabled={!canUseMarkdown}>复制全文</button>
          <button className="primary-button" onClick={() => void handleSave()} disabled={!canUseMarkdown}>保存到工作区</button>
        </footer>
      </section>
    </div>
  );
}
