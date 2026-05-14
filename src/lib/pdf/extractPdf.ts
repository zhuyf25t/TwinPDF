import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.mjs?url";
import { cleanHandoutPageText } from "./cleanHandoutText";
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

  const lines = [
    "# 中文详细讲义",
    "",
    `> 来源：${file.name} · 共 ${pdf.numPages} 页。`,
    "",
    "这份讲义由 PDF 文本提取并阅读化清理：已去除孤立符号、页码噪声和过碎换行，保留按页结构，便于和左侧英文课件对照阅读。",
    ""
  ];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    onProgress?.({ pageNumber, pageCount: pdf.numPages });
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent({ includeMarkedContent: false });
    const pageText = boundPageText(textContent.items
      .map((item) => ("str" in item ? String(item.str) : ""))
      .join("\n"));
    const cleanedPageText = cleanHandoutPageText(normalizePdfText(pageText, true));

    lines.push(`## 第 ${pageNumber} 页`, "");
    lines.push(cleanedPageText || "本页文本较少，暂未提取到可读正文。可以切换页面，或使用右上角复制讲义继续整理。");
    lines.push("");
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  }

  await pdf.destroy();
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}
