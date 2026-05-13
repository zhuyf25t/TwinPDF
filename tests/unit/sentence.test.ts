import { describe, expect, it } from "vitest";
import {
  PDF_SENTENCE_LIMITS,
  buildNearbyContext,
  findSentenceForSelection,
  normalizePdfText,
  splitIntoSentences
} from "../../src/lib/pdf/sentence";

describe("splitIntoSentences", () => {
  it("splits English sentence-like text", () => {
    const result = splitIntoSentences("First sentence. Second sentence? Third!", 3);

    expect(result).toHaveLength(3);
    expect(result[0].id).toBe("p3-s0");
    expect(result[1].text).toBe("Second sentence?");
  });

  it("keeps abbreviations and decimals inside English sentences", () => {
    const text = "Dr. Smith introduced Fig. 2. The value is 3.14. It works, e.g. on CPUs. Next idea?";
    const result = splitIntoSentences(text, 1);

    expect(result.map((sentence) => sentence.text)).toEqual([
      "Dr. Smith introduced Fig. 2.",
      "The value is 3.14.",
      "It works, e.g. on CPUs.",
      "Next idea?"
    ]);
  });

  it("splits Chinese punctuation", () => {
    const text = "\u7b2c\u4e00\u53e5\u3002\u7b2c\u4e8c\u53e5\uff01\u7b2c\u4e09\u53e5\uff1f";
    const result = splitIntoSentences(text, 1);

    expect(result.map((sentence) => sentence.text)).toEqual([
      "\u7b2c\u4e00\u53e5\u3002",
      "\u7b2c\u4e8c\u53e5\uff01",
      "\u7b2c\u4e09\u53e5\uff1f"
    ]);
  });

  it("keeps bullets and standalone formulas as useful sentence-like units", () => {
    const text = [
      "- Exact inference is hard.",
      "- q(z) approximates p(z|x).",
      "",
      "log p(x) >= E_q[log p(x,z) - log q(z)] = L(q)",
      "A soft line",
      "break should stay together."
    ].join("\n");
    const result = splitIntoSentences(text, 4);

    expect(result.map((sentence) => sentence.text)).toEqual([
      "- Exact inference is hard.",
      "- q(z) approximates p(z|x).",
      "log p(x) >= E_q[log p(x,z) - log q(z)] = L(q)",
      "A soft line break should stay together."
    ]);
  });

  it("bounds very long page indexes", () => {
    const text = Array.from({ length: 400 }, (_, index) => `Sentence ${index + 1} is useful.`).join(" ");
    const result = splitIntoSentences(text, 2);

    expect(result.length).toBeLessThanOrEqual(PDF_SENTENCE_LIMITS.maxSentencesPerPage);
    expect(result.every((sentence) => sentence.text.length <= PDF_SENTENCE_LIMITS.maxSentenceChars)).toBe(true);
  });
});

describe("normalizePdfText", () => {
  it("joins soft hyphenated PDF line breaks", () => {
    expect(normalizePdfText("The computa-\ntional model works.")).toBe("The computational model works.");
  });
});

describe("buildNearbyContext", () => {
  it("returns context around selected text", () => {
    const text = "aaa ".repeat(100) + "important target sentence" + " bbb".repeat(100);
    const context = buildNearbyContext(text, "important target sentence", 30);

    expect(context).toContain("important target sentence");
    expect(context.length).toBeLessThan(text.length);
  });

  it("finds context despite PDF line-break artifacts", () => {
    const text = "This page explains a computa-\ntional model for caches and memory.";
    const context = buildNearbyContext(text, "computational model", 20);

    expect(context).toContain("computational model");
  });
});

describe("findSentenceForSelection", () => {
  it("matches a selection to its sentence record", () => {
    const sentences = splitIntoSentences("First idea. The selected target sentence is here. Last idea.", 9);
    const match = findSentenceForSelection(sentences, "selected target sentence");

    expect(match?.id).toBe("p9-s1");
  });
});
