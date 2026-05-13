import { describe, expect, it } from "vitest";
import { buildFinalSummaryMarkdown, buildPersonalSubhandoutMarkdown, ensureFinalSummaryMarkdown, renderSimpleMarkdown } from "../../src/lib/markdown";
import type { StudyLogEntry } from "../../src/shared/contracts";

const entry: StudyLogEntry = {
  id: "entry-1",
  createdAt: "2026-05-13T15:30:00.000Z",
  courseTitle: "计算机系统概论",
  workspaceName: "lec8",
  pageLabel: "Page 8",
  pageNumber: 8,
  mode: "explain",
  selectedText: "A trap is a controlled transfer of control to the operating system.",
  translationSurface: "trap 是向操作系统的受控控制转移。",
  question: "trap 和普通函数调用有什么区别？",
  answer: "核心区别是权限和入口都受硬件约束。trap 会切到内核态，并从受控入口继续执行。",
  rightNoteContext: "异常控制流是系统调用和中断的基础。",
  pageContext: "The processor changes mode and jumps to a predefined handler.",
  source: "left-pdf",
  sentenceId: "p8-s2"
};

describe("buildFinalSummaryMarkdown", () => {
  it("keeps saved Q&A source references in the final export", () => {
    const markdown = buildFinalSummaryMarkdown({
      courseTitle: "计算机系统概论 Lec8",
      workspaceName: "lec8",
      entries: [entry],
      generatedReviewMarkdown: "# 个人子讲义\n\n这节课要抓住 trap 的受控入口。",
      createdAt: new Date("2026-05-13T15:40:00.000Z")
    });

    expect(markdown).toContain("# 本节个人子讲义");
    expect(markdown).toContain("## 课程与文件信息");
    expect(markdown).toContain("- 课程：计算机系统概论 Lec8");
    expect(markdown).toContain("## 本节核心问题");
    expect(markdown).toContain("## 我问过的问题");
    expect(markdown).toContain("## 句子级解释");
    expect(markdown).toContain("## 易错点");
    expect(markdown).toContain("## 公式与定义");
    expect(markdown).toContain("## 考前复习清单");
    expect(markdown).toContain("## 仍需回看页码");
    expect(markdown).toContain("## 原始问答日志");
    expect(markdown).toContain("Page 8");
    expect(markdown).toContain(entry.question);
    expect(markdown).toContain(entry.answer);
    expect(markdown).toContain(`> ${entry.selectedText}`);
    expect(markdown).toContain("句子 ID：p8-s2");
    expect(markdown).toContain("这节课要抓住 trap 的受控入口。");
  });
});

describe("ensureFinalSummaryMarkdown", () => {
  it("does not wrap an already complete final summary again", () => {
    const existing = buildFinalSummaryMarkdown({
      courseTitle: "计算机系统概论 Lec8",
      entries: [entry],
      createdAt: new Date("2026-05-13T15:40:00.000Z")
    });
    const ensured = ensureFinalSummaryMarkdown({
      courseTitle: "计算机系统概论 Lec8",
      entries: [entry],
      generatedReviewMarkdown: existing,
      createdAt: new Date("2026-05-13T15:41:00.000Z")
    });

    expect(ensured).toBe(existing);
    expect(ensured.match(/# 本节个人子讲义/g)).toHaveLength(1);
  });
});

describe("buildPersonalSubhandoutMarkdown", () => {
  it("creates a meaningful empty personal subhandout", () => {
    const markdown = buildPersonalSubhandoutMarkdown([], {
      workspaceName: "lec8",
      createdAt: new Date("2026-05-13T15:40:00.000Z")
    });

    expect(markdown).toContain("# 个人子讲义");
    expect(markdown).toContain("还没有保存的问答");
    expect(markdown).toContain("## 原始问答日志");
  });
});

describe("renderSimpleMarkdown", () => {
  it("renders readable safe HTML", () => {
    const html = renderSimpleMarkdown("# 标题\n\n- **重点**\n\n> <script>alert(1)</script>");

    expect(html).toContain("<h1>标题</h1>");
    expect(html).toContain("<li><strong>重点</strong></li>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>");
  });
});
