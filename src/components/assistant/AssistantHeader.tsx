import type { AssistantDockMode } from "../../shared/contracts";

type AssistantHeaderProps = {
  dockMode: AssistantDockMode;
  selectedStatus: string;
  modeText: string;
  onToggleSize: () => void;
  onToggleCollapse: () => void;
};

export function AssistantHeader({
  dockMode,
  selectedStatus,
  modeText,
  onToggleSize,
  onToggleCollapse
}: AssistantHeaderProps) {
  return (
    <div className="assistant-header">
      <div className="assistant-title">
        <strong>随堂助手</strong>
        <span>AI Assist</span>
        <em>{selectedStatus}</em>
      </div>
      <div className="assistant-header-actions">
        {dockMode !== "collapsed" && (
          <button className="dock-toggle-button" onClick={onToggleSize}>
            {modeText}
          </button>
        )}
        <button
          className="dock-icon-button"
          onClick={onToggleCollapse}
          aria-label={dockMode === "collapsed" ? "展开随堂助手" : "收起随堂助手"}
        >
          {dockMode === "collapsed" ? "↑" : "−"}
        </button>
      </div>
    </div>
  );
}
