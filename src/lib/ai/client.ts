import type { AssistRequest, AssistResponse, FinalizeRequest, FinalizeResponse, LabelPageRequest, LabelPageResponse } from "../../shared/contracts";

async function postJson<TResponse>(url: string, payload: unknown): Promise<TResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json() as TResponse & { error?: string };
  if (!response.ok) throw new Error(data.error || `${url} failed`);
  return data;
}

export function requestAssist(payload: AssistRequest) {
  return postJson<AssistResponse>("/api/ai/assist", payload);
}

export function requestLabelPage(payload: LabelPageRequest) {
  return postJson<LabelPageResponse>("/api/ai/label-page", payload);
}

export function requestFinalSummary(payload: FinalizeRequest) {
  return postJson<FinalizeResponse>("/api/ai/finalize", payload);
}
