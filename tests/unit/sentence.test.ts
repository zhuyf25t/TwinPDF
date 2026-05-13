import { describe, expect, it } from "vitest";
import { buildNearbyContext, splitIntoSentences } from "../../src/lib/pdf/sentence";

describe("splitIntoSentences", () => {
  it("splits English sentence-like text", () => {
    const result = splitIntoSentences("First sentence. Second sentence? Third!", 3);
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe("p3-s0");
  });

  it("splits Chinese punctuation", () => {
    const result = splitIntoSentences("第一句。第二句！第三句？", 1);
    expect(result).toHaveLength(3);
  });
});

describe("buildNearbyContext", () => {
  it("returns context around selected text", () => {
    const text = "aaa ".repeat(100) + "important target sentence" + " bbb".repeat(100);
    const context = buildNearbyContext(text, "important target sentence", 30);
    expect(context).toContain("important target sentence");
    expect(context.length).toBeLessThan(text.length);
  });
});
