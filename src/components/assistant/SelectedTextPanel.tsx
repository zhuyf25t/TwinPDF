type SelectedTextPanelProps = {
  hasSelection: boolean;
  selectedText: string;
  onCopy: () => void;
};

export function SelectedTextPanel({ hasSelection, selectedText, onCopy }: SelectedTextPanelProps) {
  return (
    <section className="assistant-box selected-zone">
      <div className="box-title">
        <span>Selected Text 原文</span>
        <button className="text-tool-button" onClick={onCopy}>复制</button>
      </div>
      <div className={`selected-text ${hasSelection ? "" : "empty-state"}`} lang="en">
        {selectedText}
      </div>
    </section>
  );
}
