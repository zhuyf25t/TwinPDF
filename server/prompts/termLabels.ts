import type { TermLabelRequest } from "../../src/shared/contracts";
import type { ChatMessage } from "../lib/deepseek";

export function buildTermLabelMessages(payload: TermLabelRequest): ChatMessage[] {
  const terms = [...new Set(payload.terms.map((term) => term.trim()).filter(Boolean))];
  return [
    {
      role: "system",
      content: [
        "你是 TwinPDF 的英文课件词义标注器。",
        "目标：给大一学生看英文计算机系统课件时，点击英文单词即可看到简洁中文解释。",
        "只输出合法 JSON，不输出 Markdown，不输出推理过程。",
        "请在内部推理：结合课程上下文判断词义；普通词给中文义，专有名词/术语额外给一句定义。",
        "输出格式必须是：",
        "{\"labels\":[{\"term\":\"...\",\"normalized\":\"lowercase-key\",\"chinese\":\"中文义\",\"definition\":\"可选，一句定义\",\"isProperNoun\":true}]}",
        "normalized 必须是小写英文 key。definition 控制在 60 个中文字以内。"
      ].join("\n")
    },
    {
      role: "user",
      content: [
        `课程：${payload.courseTitle || "计算机系统英文课件"}`,
        `PDF：${payload.pdfName || "unknown.pdf"}`,
        "",
        "【课程上下文摘录】",
        clip(payload.contextText || "", 5200),
        "",
        "【需要标注的去重英文词表】",
        JSON.stringify(terms, null, 2),
        "",
        "请为每个词返回一条 label。普通词也要返回；计算机系统术语要更具体。"
      ].join("\n")
    }
  ];
}

function clip(input: string, max: number) {
  const text = input.trim();
  if (!text) return "（无）";
  return text.length <= max ? text : `${text.slice(0, max)}...`;
}
