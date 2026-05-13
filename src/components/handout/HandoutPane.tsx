import { renderSimpleMarkdown } from "../../lib/markdown";

type HandoutPaneProps = {
  markdown: string;
  fileName?: string;
  onChange: (markdown: string) => void;
  onOpenFile: (file: File) => void;
};

export function HandoutPane({ markdown, fileName, onChange, onOpenFile }: HandoutPaneProps) {
  const html = renderSimpleMarkdown(markdown);

  return (
    <section className="pane handout-pane">
      <div className="pane-toolbar">
        <strong>中文讲义</strong>
        <label className="toolbar-button">
          打开讲义
          <input
            type="file"
            accept=".md,.txt,.pdf,text/markdown,text/plain,application/pdf"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onOpenFile(file);
              event.currentTarget.value = "";
            }}
          />
        </label>
        {fileName && <span className="handout-file-name" title={fileName}>{fileName}</span>}
        <span className="toolbar-spacer" />
        <button className="toolbar-button small" onClick={() => navigator.clipboard.writeText(markdown)}>复制讲义</button>
      </div>
      <div className="handout-split">
        <article className="handout-content" dangerouslySetInnerHTML={{ __html: html }} />
        <details className="handout-editor">
          <summary>编辑 Markdown</summary>
          <textarea value={markdown} onChange={(event) => onChange(event.target.value)} />
        </details>
      </div>
    </section>
  );
}
