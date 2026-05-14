import { aiConfig } from "../env";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type DeepSeekOptions = {
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  reasoning?: boolean;
};

export class AIProviderError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 502) {
    super(message);
    this.name = "AIProviderError";
    this.statusCode = statusCode;
  }
}

export async function callDeepSeek(
  messages: ChatMessage[],
  options: DeepSeekOptions | number = {}
): Promise<string> {
  const config = aiConfig();
  if (config.mock) {
    throw new AIProviderError("当前处于 Mock AI 模式，没有调用外部模型。", 503);
  }

  const resolvedOptions = typeof options === "number" ? { temperature: options } : options;
  const controller = new AbortController();
  const timeout = windowlessTimeout(() => controller.abort(), resolvedOptions.timeoutMs ?? 30_000);

  try {
    const body: Record<string, unknown> = {
      model: config.model,
      messages,
      temperature: resolvedOptions.temperature ?? 0.2
    };
    if (resolvedOptions.maxTokens) body.max_tokens = resolvedOptions.maxTokens;
    if (resolvedOptions.reasoning ?? config.reasoning) {
      body.reasoning = { enabled: true };
      body.reasoning_effort = "medium";
    }

    const response = await fetch(`${config.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    const text = await response.text();
    if (!response.ok) throw providerError(response.status, text);

    let data: { choices?: { message?: { content?: string } }[] };
    try {
      data = JSON.parse(text) as { choices?: { message?: { content?: string } }[] };
    } catch {
      throw new AIProviderError("AI 返回格式异常，请稍后重试。");
    }

    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new AIProviderError("AI 暂时没有返回内容，请换个问题再试。");
    return content;
  } catch (error) {
    if (error instanceof AIProviderError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new AIProviderError("AI 响应超时了，请稍后再试或缩短选中文本。", 504);
    }
    throw new AIProviderError("AI 服务暂时不可用，请稍后重试。");
  } finally {
    clearTimeout(timeout);
  }
}

function providerError(status: number, rawBody: string) {
  if (status === 401 || status === 403) {
    return new AIProviderError("AI 服务认证失败，请检查服务端 env.local 里的 DeepSeek key。", 502);
  }
  if (status === 429) {
    return new AIProviderError("AI 服务现在比较忙或额度受限，请稍后再试。", 429);
  }
  if (status >= 500) {
    return new AIProviderError("AI 服务端暂时不可用，请稍后重试。", 502);
  }

  if (status === 400) {
    return new AIProviderError("AI 请求内容太长或格式不被服务接受，请缩短选中文本后重试。", 502);
  }

  return new AIProviderError("AI 请求没有成功，请稍后再试。", 502);
}

function windowlessTimeout(callback: () => void, delay: number) {
  return setTimeout(callback, delay);
}
