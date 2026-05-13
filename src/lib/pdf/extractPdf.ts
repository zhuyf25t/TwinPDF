import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.mjs?url";
import { boundPageText, normalizePdfText } from "./sentence";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

type ExtractProgress = {
  pageNumber: number;
  pageCount: number;
};

export async function extractPdfTextAsMarkdown(
  file: File,
  onProgress?: (progress: ExtractProgress) => void
) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true
  }).promise;

  const lines = [`# ${file.name}`, "", `共 ${pdf.numPages} 页。`, ""];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    onProgress?.({ pageNumber, pageCount: pdf.numPages });
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent({ includeMarkedContent: false });
    const pageText = boundPageText(textContent.items
      .map((item) => ("str" in item ? String(item.str) : ""))
      .join("\n"));

    lines.push(`## 第 ${pageNumber} 页`, "");
    lines.push(normalizePdfText(pageText, true) || "（本页未提取到可复制文本）");
    lines.push("");
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  }

  await pdf.destroy();
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}
