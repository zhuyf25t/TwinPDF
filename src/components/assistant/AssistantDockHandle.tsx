import type { PointerEventHandler } from "react";

type AssistantDockHandleProps = {
  onPointerDown: PointerEventHandler<HTMLDivElement>;
  onPointerMove: PointerEventHandler<HTMLDivElement>;
  onPointerUp: PointerEventHandler<HTMLDivElement>;
  onPointerCancel: PointerEventHandler<HTMLDivElement>;
};

export function AssistantDockHandle({
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel
}: AssistantDockHandleProps) {
  return (
    <div
      className="dock-resize-handle"
      title="拖动调整 AI Assist 高度"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    />
  );
}
