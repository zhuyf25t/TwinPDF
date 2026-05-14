type HandoutToolbarProps = {
  fileName?: string;
  onOpenFile: (file: File) => void;
  onCopy: () => void;
};

export function HandoutToolbar({ fileName, onOpenFile, onCopy }: HandoutToolbarProps) {
  return (
    <div className="pane-toolbar">
      <div className="toolbar-group toolbar-left">
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
      </div>
      <div className="toolbar-group toolbar-right">
        <button className="toolbar-button small" onClick={onCopy}>复制讲义</button>
      </div>
    </div>
  );
}
