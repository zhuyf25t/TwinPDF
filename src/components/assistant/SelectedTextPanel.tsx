type SelectedTextPanelProps = {
  hasSelection: boolean;
  selectedText: string;
};

export function SelectedTextPanel({ hasSelection, selectedText }: SelectedTextPanelProps) {
  return (
    <section className="assistant-box selected-zone">
      <div className={`selected-text translation-surface ${hasSelection ? "" : "empty-state"}`} lang="en" translate="yes">
        <p>{selectedText}</p>
      </div>
    </section>
  );
}
