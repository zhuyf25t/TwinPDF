import type {
  AiHealthResponse,
  AssistRequest,
  AssistResponse,
  FinalizeRequest,
  FinalizeResponse,
  LabelPageRequest,
  LabelPageResponse,
  TermLabelRequest,
  TermLabelResponse
} from "../../shared/contracts";

export async function requestAiHealth() {
  const response = await fetch("/api/ai/health");
  const data = parseJson<AiHealthResponse & { error?: string }>(await response.text());
  if (!response.ok) throw new Error(data?.error || "无法读取 AI 后端状态。");
  if (!data) throw new Error("AI 后端状态为空。");
  return data;
}

async function postJson<TResponse>(url: string, payload: unknown): Promise<TResponse> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch {
    throw new Error("无法连接 TwinPDF AI 后端，请确认 npm run dev 仍在运行。");
  }

  const text = await response.text();
  const data = parseJson<TResponse & { error?: string }>(text);
  if (!response.ok) {
    throw new Error(data?.error || "AI 服务暂时不可用，请稍后再试。");
  }
  if (!data) throw new Error("AI 后端返回了空响应，请稍后再试。");
  return data;
}

export function requestAssist(payload: AssistRequest) {
  return postJson<AssistResponse>("/api/ai/assist", payload);
}

export function requestLabelPage(payload: LabelPageRequest) {
  return postJson<LabelPageResponse>("/api/ai/label-page", payload);
}

export function requestTermLabels(payload: TermLabelRequest) {
  return postJson<TermLabelResponse>("/api/ai/label-terms", payload);
}

export function requestFinalSummary(payload: FinalizeRequest) {
  return postJson<FinalizeResponse>("/api/ai/finalize", payload);
}

function parseJson<T>(text: string): T | null {
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
