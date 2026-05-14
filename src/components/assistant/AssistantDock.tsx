import { useEffect, useMemo, useRef, type CSSProperties, type PointerEvent } from "react";
import type { AppSettings, AssistantDockMode, SelectedContext, StudyLogEntry } from "../../shared/contracts";
import { AssistantHeader } from "./AssistantHeader";
import {
  assistantModeStorageKey,
  assistantXStorageKey,
  assistantYStorageKey,
  emptySelection
} from "./assistantDockUtils";
import { SelectedTextPanel } from "./SelectedTextPanel";

type AssistantDockProps = {
  courseTitle: string;
  workspaceName?: string;
  selected: SelectedContext;
  rightNoteContext: string;
  recentEntries: StudyLogEntry[];
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  onAddEntry: (entry: StudyLogEntry) => Promise<void> | void;
};

export function AssistantDock({
  selected,
  settings,
  onSettingsChange
}: AssistantDockProps) {
  const moveState = useRef<{ startX: number; startY: number; dockX: number; dockY: number; width: number; height: number } | null>(null);
  const dockRef = useRef<HTMLElement | null>(null);

  const rawSelectedText = selected.selectedText || "";
  const hasSelection = rawSelectedText.trim().length > 0;
  const selectedText = selected.termLabel
    ? selected.termLabel.term
    : hasSelection
    ? rawSelectedText
    : "在英文课件中点击一个英文词，这里会显示中文 label 和必要定义。";
  const dockMode = settings.assistantMode === "collapsed" ? "collapsed" : "compact";
  const selectionSignature = useMemo(() => [
    rawSelectedText,
    selected.pageLabel,
    selected.pageNumber ?? "",
    selected.sentenceId ?? "",
    selected.source
  ].join("\u001f"), [rawSelectedText, selected.pageLabel, selected.pageNumber, selected.sentenceId, selected.source]);

  useEffect(() => {
    if (hasSelection && settings.assistantMode === "collapsed") {
      patchSettings({ assistantMode: "compact", assistantHeight: 176 });
    }
  }, [hasSelection, selectionSignature]);

  function patchSettings(patch: Partial<AppSettings>) {
    const nextMode = (patch.assistantMode ?? settings.assistantMode ?? "compact") as AssistantDockMode;
    try {
      window.localStorage.setItem(assistantModeStorageKey, nextMode);
      if (typeof patch.assistantX === "number") window.localStorage.setItem(assistantXStorageKey, String(patch.assistantX));
      if (typeof patch.assistantY === "number") window.localStorage.setItem(assistantYStorageKey, String(patch.assistantY));
    } catch {
      // Local storage only mirrors small UI preferences; workspace settings remain the source of truth.
    }
    onSettingsChange({ ...settings, ...patch, assistantMode: nextMode, assistantHeight: 176 });
  }

  function setDockMode(nextMode: AssistantDockMode) {
    patchSettings({ assistantMode: nextMode, assistantHeight: 176 });
  }

  function handleMovePointerDown(event: PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("button")) return;
    const box = dockRef.current?.getBoundingClientRect();
    if (!box) return;
    moveState.current = {
      startX: event.clientX,
      startY: event.clientY,
      dockX: box.left,
      dockY: box.top,
      width: box.width,
      height: box.height
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleMovePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!moveState.current) return;
    const state = moveState.current;
    const nextX = clamp(state.dockX + event.clientX - state.startX, 10, window.innerWidth - state.width - 10);
    const nextY = clamp(state.dockY + event.clientY - state.startY, 10, window.innerHeight - state.height - 10);
    patchSettings({ assistantX: nextX, assistantY: nextY });
  }

  function handleMovePointerEnd(event: PointerEvent<HTMLDivElement>) {
    moveState.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  const selectedStatus = hasSelection ? `${selected.pageLabel || "当前页"} · 已选中` : "等待选中英文";
  const hasCustomPosition = Number.isFinite(settings.assistantX) && Number.isFinite(settings.assistantY);
  const dockStyle = {
    height: dockMode === "collapsed" ? 44 : 176,
    ...(hasCustomPosition ? { left: settings.assistantX, top: settings.assistantY, right: "auto", bottom: "auto" } : {})
  } as CSSProperties;

  return (
    <aside
      ref={dockRef}
      className={`assistant-dock selection-only-dock dock-${dockMode}`}
      style={dockStyle}
      data-selection-signature={selectionSignature}
    >
      <AssistantHeader
        dockMode={dockMode}
        selectedStatus={selectedStatus}
        onToggleCollapse={() => setDockMode(dockMode === "collapsed" ? "compact" : "collapsed")}
        onMovePointerDown={handleMovePointerDown}
        onMovePointerMove={handleMovePointerMove}
        onMovePointerUp={handleMovePointerEnd}
        onMovePointerCancel={handleMovePointerEnd}
      />

      {dockMode !== "collapsed" && (
        <div className="assistant-body assistant-selection-only">
          <SelectedTextPanel hasSelection={hasSelection} selectedText={selectedText || emptySelection} termLabel={selected.termLabel} />
        </div>
      )}
    </aside>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
