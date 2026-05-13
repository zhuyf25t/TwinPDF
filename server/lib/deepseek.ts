import { aiConfig } from "../env";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function callDeepSeek(messages: ChatMessage[], temperature = 0.2): Promise<string> {
  const config = aiConfig();
  if (config.mock) return mockAnswer(messages);

  const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DeepSeek request failed: ${response.status} ${text.slice(0, 500)}`);
  }
  const data = await response.json() as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content?.trim() || "AI 没有返回内容。";
}

function mockAnswer(messages: ChatMessage[]) {
  const last = messages[messages.length - 1]?.content || "";
  if (last.includes("label")) {
    return JSON.stringify({ labels: [] });
  }
  if (last.includes("最终个人子讲义") || last.includes("个人子讲义")) {
    return `# 个人子讲义（Mock）\n\n## 本节核心问题\n这节课的核心是把难以直接理解的英文课件内容转化为可复习的个人理解。\n\n## 我问过的问题\n- 这里会整理本次学习过程中保存的问题。\n\n## 考前复习清单\n- 回看所有加入子讲义的句子。\n- 对每个公式确认“它为什么出现、每一项是什么意思、考试可能怎么问”。\n`;
  }
  return "这句话其实是在说：我们把原来很难直接处理的目标，换成一个更容易优化的替代目标。先别被符号吓到，核心是：这个目标函数虽然不是原目标本身，但它足够接近，而且能被计算和优化。你可以把它理解成学习时先抓住一个可以下手的台阶，再一步步逼近真正想要的东西。";
}
