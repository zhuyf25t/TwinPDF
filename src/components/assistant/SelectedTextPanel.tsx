type SelectedTextPanelProps = {
  hasSelection: boolean;
  selectedText: string;
  onCopy: () => void;
};

export function SelectedTextPanel({ hasSelection, selectedText, onCopy }: SelectedTextPanelProps) {
  return (
    <section className="assistant-box selected-zone">
      <div className="box-title">
        <span>选中内容</span>
        <small>普通网页文本，可直接被浏览器翻译</small>
        <button className="text-tool-button" onClick={onCopy}>复制</button>
      </div>
      <div className={`selected-text translation-surface ${hasSelection ? "" : "empty-state"}`} lang="en" translate="yes">
        <p>{selectedText}</p>
      </div>
    </section>
  );
}
