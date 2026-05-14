import { describe, expect, it } from "vitest";
import { buildTermInventory, extractTermsFromPdfIndex, getLocalTermLabel, labelArrayToMap, mergeTermLabels, normalizeTermKey } from "../../src/lib/pdf/terms";
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
    expect(terms).not.toContain("and");
    expect(terms.filter((term) => normalizeTermKey(term) === "memory")).toHaveLength(1);
  });

  it("labels common function words locally without waiting for AI", () => {
    const label = getLocalTermLabel("Are");

    expect(label?.normalized).toBe("are");
    expect(label?.source).toBe("local");
    expect(label?.chinese).toContain("是");
  });

  it("builds a complete upload-time term inventory with counts and pages", () => {
    const index: PdfSentenceIndex = {
      pdfId: "demo",
      pdfName: "demo.pdf",
      createdAt: "now",
      pages: [
        {
          pdfId: "demo",
          pdfName: "demo.pdf",
          pageNumber: 7,
          pageText: "Are contiguous pages contiguous in virtual memory?",
          sentences: [],
          createdAt: "now"
        },
        {
          pdfId: "demo",
          pdfName: "demo.pdf",
          pageNumber: 8,
          pageText: "Contiguous memory is not always physically contiguous.",
          sentences: [],
          createdAt: "now"
        }
      ]
    };

    const inventory = buildTermInventory(index);
    const contiguous = inventory.terms.find((entry) => entry.normalized === "contiguous");
    const are = inventory.terms.find((entry) => entry.normalized === "are");

    expect(inventory.totalUniqueTerms).toBeGreaterThan(0);
    expect(contiguous?.count).toBe(4);
    expect(contiguous?.pages).toEqual([7, 8]);
    expect(are?.firstPage).toBe(7);
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
