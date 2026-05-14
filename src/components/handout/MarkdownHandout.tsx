import { renderSimpleMarkdown } from "../../lib/markdown";

type MarkdownHandoutProps = {
  markdown: string;
};

export function MarkdownHandout({ markdown }: MarkdownHandoutProps) {
  const html = renderSimpleMarkdown(markdown || emptyHandoutMarkdown);
  return <article className="handout-content" dangerouslySetInnerHTML={{ __html: html }} />;
}

const emptyHandoutMarkdown = [
  "# 中文讲义",
  "",
  "打开右侧讲义文件后，这里会以适合长时间阅读的 Markdown 版式展示内容。",
  "",
  "如果导入的是 PDF，TwinPDF 会先做阅读化清理，再按页展示。"
].join("\n");
