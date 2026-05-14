import { describe, expect, it } from "vitest";
import { extractTermsFromPdfIndex, labelArrayToMap, mergeTermLabels, normalizeTermKey } from "../../src/lib/pdf/terms";
import type { PdfSentenceIndex } from "../../src/shared/contracts";

describe("term extraction and cache helpers", () => {
  it("deduplicates PDF words by normalized key", () => {
    const index: PdfSentenceIndex = {
      pdfId: "demo",
      pdfName: "demo.pdf",
      createdAt: "now",
      pages: [{
        pdfId: "demo",
        pdfName: "demo.pdf",
        pageNumber: 1,
        pageText: "Virtual memory maps Memory and malloc. Virtual-memory appears twice.",
        sentences: [],
        createdAt: "now"
      }]
    };

    const terms = extractTermsFromPdfIndex(index);

    expect(terms).toContain("Virtual");
    expect(terms).toContain("memory");
    expect(terms).toContain("malloc");
    expect(terms.filter((term) => normalizeTermKey(term) === "memory")).toHaveLength(1);
  });

  it("merges labels without duplicating repeated terms", () => {
    const labels = mergeTermLabels(
      [{ term: "Memory", normalized: "memory", chinese: "记忆" }],
      [{ term: "memory", normalized: "memory", chinese: "内存", definition: "计算机系统中的存储资源。" }]
    );

    expect(labels).toHaveLength(1);
    expect(labelArrayToMap(labels).get("memory")?.chinese).toBe("内存");
  });
});
