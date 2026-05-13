import type { WorkspaceRef } from "../../shared/contracts";
import { chooseWorkspace, continueLastWorkspace } from "../../lib/workspace/fsAccess";
import { useState } from "react";

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
      if (!workspace) setError("没有找到上次工作区。请重新选择本地文件夹。");
      else onWorkspaceReady(workspace);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="workspace-gate">
      <section className="workspace-card">
        <div className="brand big"><span className="brand-mark">□</span><span className="brand-title">TwinPDF</span></div>
        <h1>选择学习工作区</h1>
        <p>
          TwinPDF 会把 PDF、讲义、句子切分、AI 问答、个人子讲义和最终总结保存在这个文件夹中，
          而不是藏在浏览器默认缓存里。
        </p>
        <div className="workspace-actions">
          <button className="primary-button" disabled={busy} onClick={() => run(chooseWorkspace)}>选择本地文件夹</button>
          <button className="secondary-button" disabled={busy} onClick={() => run(continueLastWorkspace)}>继续上次工作区</button>
        </div>
        {error && <div className="error-box">{error}</div>}
        <div className="folder-preview">
          <code>/sources</code><code>/handouts</code><code>/memory</code><code>/exports</code><code>/cache/sentences</code><code>/cache/page-labels</code>
        </div>
        <p className="quiet-note">API key 只在 <code>env.local</code> / 后端；学习历史保存在你选择的文件夹里。</p>
      </section>
    </main>
  );
}
