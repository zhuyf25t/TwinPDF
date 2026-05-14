import type { AppSettings, AssistMode } from "../../shared/contracts";

type AssistantLocksProps = {
  mode: AssistMode;
  loading: boolean;
  saving: boolean;
  alreadyAdded: boolean;
  hasAnswer: boolean;
  settings: AppSettings;
  onSubmitMode: (mode: AssistMode) => void;
  onSettingsPatch: (patch: Partial<AppSettings>) => void;
  onAddCurrentAnswer: () => void;
};

export function AssistantLocks({
  mode,
  loading,
  saving,
  alreadyAdded,
  hasAnswer,
  settings,
  onSubmitMode,
  onSettingsPatch,
  onAddCurrentAnswer
}: AssistantLocksProps) {
  return (
    <div className="mode-row assistant-command-row">
      <div className="mode-group">
        <button
          className={`mode-chip ${mode === "explain" ? "active" : ""}`}
          onClick={() => onSubmitMode("explain")}
          disabled={loading}
        >
          解释
        </button>
      </div>
      <div className="lock-group">
        <button
          className={`tiny-lock ${settings.inputLocked ? "active" : ""}`}
          onClick={() => onSettingsPatch({ inputLocked: !settings.inputLocked })}
        >
          {settings.inputLocked ? "问锁" : "问不锁"}
        </button>
        <button
          className={`tiny-lock ${settings.autoAddLocked ? "active" : ""}`}
          onClick={() => onSettingsPatch({ autoAddLocked: !settings.autoAddLocked })}
        >
          {settings.autoAddLocked ? "自动存" : "手动存"}
        </button>
      </div>
      <button
        className="mode-chip save-chip"
        onClick={onAddCurrentAnswer}
        disabled={!hasAnswer || loading || saving || alreadyAdded}
      >
        {saving ? "..." : alreadyAdded ? "已加入" : "加入"}
      </button>
      {alreadyAdded && <span className="success-pill">加入成功</span>}
    </div>
  );
}
