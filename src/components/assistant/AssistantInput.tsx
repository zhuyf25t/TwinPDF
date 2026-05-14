type AssistantInputProps = {
  question: string;
  loading: boolean;
  onQuestionChange: (value: string) => void;
  onSubmit: () => void;
};

export function AssistantInput({ question, loading, onQuestionChange, onSubmit }: AssistantInputProps) {
  return (
    <div className="ask-row">
      <textarea
        rows={1}
        value={question}
        onChange={(event) => onQuestionChange(event.target.value)}
        placeholder="继续追问，例如：为什么这里要最大化 ELBO？"
        aria-label="继续追问"
        onKeyDown={(event) => {
          if ((event.ctrlKey || event.metaKey) && event.key === "Enter") onSubmit();
        }}
      />
      <button className="send-button" disabled={loading} onClick={onSubmit}>
        {loading ? "..." : "↑"}
      </button>
    </div>
  );
}
