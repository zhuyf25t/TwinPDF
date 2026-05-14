import type { PointerEventHandler } from "react";
import type { AssistantDockMode } from "../../shared/contracts";

type AssistantHeaderProps = {
  dockMode: AssistantDockMode;
  selectedStatus: string;
  modeText: string;
  onToggleSize: () => void;
  onToggleCollapse: () => void;
  onMovePointerDown: PointerEventHandler<HTMLDivElement>;
  onMovePointerMove: PointerEventHandler<HTMLDivElement>;
  onMovePointerUp: PointerEventHandler<HTMLDivElement>;
  onMovePointerCancel: PointerEventHandler<HTMLDivElement>;
};

export function AssistantHeader({
  dockMode,
  selectedStatus,
  modeText,
  onToggleSize,
  onToggleCollapse,
  onMovePointerDown,
  onMovePointerMove,
  onMovePointerUp,
  onMovePointerCancel
}: AssistantHeaderProps) {
  return (
    <div
      className="assistant-header"
      title="拖动移动随堂助手"
      onPointerDown={onMovePointerDown}
      onPointerMove={onMovePointerMove}
      onPointerUp={onMovePointerUp}
      onPointerCancel={onMovePointerCancel}
    >
      <div className="assistant-title">
        <span className="assistant-move-grip" aria-hidden="true" />
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
