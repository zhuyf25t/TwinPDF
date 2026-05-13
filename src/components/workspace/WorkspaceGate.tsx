import { useState } from "react";
import { chooseWorkspace, continueLastWorkspace } from "../../lib/workspace/fsAccess";
import type { WorkspaceRef } from "../../shared/contracts";

type WorkspaceGateProps = {
  onWorkspaceReady: (workspace: WorkspaceRef) => void;
};

export function WorkspaceGate({ onWorkspaceReady }: WorkspaceGateProps) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<WorkspaceRef | null>) {
    setBusy(true);
    setError(null);
    try {
      const workspace = await action();
      if (!workspace) {
        setError("没有找到上次的工作区。请重新选择一个本地文件夹。");
        return;
      }
      onWorkspaceReady(workspace);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="workspace-gate">
      <section className="workspace-card" aria-labelledby="workspace-title">
        <div className="brand big">
          <span className="brand-mark">T</span>
          <span className="brand-title">TwinPDF</span>
        </div>

        <h1 id="workspace-title">选择学习工作区</h1>
        <p>
          选择一个本地文件夹。TwinPDF 会把课件、讲义、问答记录和导出内容都保存在这里，
          浏览器里只记住这个文件夹的授权。
        </p>

        <div className="workspace-actions">
          <button className="primary-button" disabled={busy} onClick={() => run(chooseWorkspace)}>
            选择文件夹
          </button>
          <button className="secondary-button" disabled={busy} onClick={() => run(continueLastWorkspace)}>
            继续上次工作区
          </button>
        </div>

        {error && <div className="error-box">{error}</div>}

        <div className="folder-preview" aria-label="TwinPDF workspace folders">
          <code>/sources</code>
          <code>/handouts</code>
          <code>/memory</code>
          <code>/exports</code>
          <code>/cache/sentences</code>
          <code>/cache/page-labels</code>
          <code>/cache/pdf-index</code>
        </div>

        <p className="quiet-note">建议为每门课单独建一个文件夹。</p>
      </section>
    </main>
  );
}
