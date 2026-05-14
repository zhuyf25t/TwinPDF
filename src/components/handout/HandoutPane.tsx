import { HandoutToolbar } from "./HandoutToolbar";
import { MarkdownHandout } from "./MarkdownHandout";

type HandoutPaneProps = {
  markdown: string;
  fileName?: string;
  onChange: (markdown: string) => void;
  onOpenFile: (file: File) => void;
};

export function HandoutPane({ markdown, fileName, onChange, onOpenFile }: HandoutPaneProps) {
  return (
    <section className="pane handout-pane">
      <HandoutToolbar
        fileName={fileName}
        onOpenFile={onOpenFile}
        onCopy={() => navigator.clipboard.writeText(markdown)}
      />
      <div className="handout-split">
        <MarkdownHandout markdown={markdown} />
        <details className="handout-editor">
          <summary>编辑 Markdown</summary>
          <textarea value={markdown} onChange={(event) => onChange(event.target.value)} />
        </details>
      </div>
    </section>
  );
}
