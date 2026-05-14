import type { TermLabel } from "../../shared/contracts";

type SelectedTextPanelProps = {
  hasSelection: boolean;
  selectedText: string;
  termLabel?: TermLabel;
};

export function SelectedTextPanel({ hasSelection, selectedText, termLabel }: SelectedTextPanelProps) {
  const content = termLabel
    ? `${termLabel.term}：${termLabel.chinese}${termLabel.definition ? `。${termLabel.definition}` : ""}`
    : selectedText;

  return (
    <section className="assistant-box selected-zone">
      <div className={`selected-text term-label-surface ${hasSelection ? "" : "empty-state"}`} lang="zh-CN" translate="no">
        <p>{content}</p>
      </div>
    </section>
  );
}
