import type { AppSettings, AssistMode } from "../../shared/contracts";
import { modeLabels } from "./assistantDockUtils";

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
        {(Object.keys(modeLabels) as AssistMode[]).map((item) => (
          <button
            key={item}
            className={`mode-chip ${mode === item ? "active" : ""}`}
            onClick={() => onSubmitMode(item)}
            disabled={loading}
          >
            {modeLabels[item]}
          </button>
        ))}
      </div>
      <div className="lock-group">
        <button
          className={`tiny-lock ${settings.inputLocked ? "active" : ""}`}
          onClick={() => onSettingsPatch({ inputLocked: !settings.inputLocked })}
        >
          {settings.inputLocked ? "输入已锁" : "输入不锁"}
        </button>
        <button
          className={`tiny-lock ${settings.autoAddLocked ? "active" : ""}`}
          onClick={() => onSettingsPatch({ autoAddLocked: !settings.autoAddLocked })}
        >
          {settings.autoAddLocked ? "自动加入" : "手动加入"}
        </button>
      </div>
      <button
        className="mode-chip save-chip"
        onClick={onAddCurrentAnswer}
        disabled={!hasAnswer || loading || saving || alreadyAdded}
      >
        {saving ? "加入中..." : alreadyAdded ? "已加入" : "加入个人子讲义"}
      </button>
      {alreadyAdded && <span className="success-pill">加入成功</span>}
    </div>
  );
}
