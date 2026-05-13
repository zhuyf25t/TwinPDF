import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.mjs?url";
import type { PageSentenceIndex, PdfSentenceIndex, SelectedContext } from "../../shared/contracts";
import { buildNearbyContext, makePdfId, splitIntoSentences } from "../../lib/pdf/sentence";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

type PdfPaneProps = {
  onSelectionChange: (selection: SelectedContext) => void;
  onPdfFileLoaded: (file: File) => void;
  onSentenceIndexReady: (index: PdfSentenceIndex) => void;
};

type PdfDoc = Awaited<ReturnType<typeof pdfjsLib.getDocument>["promise"]>;

type PageState = {
  pageText: string;
  pageNumber: number;
};

export function PdfPane({ onSelectionChange, onPdfFileLoaded, onSentenceIndexReady }: PdfPaneProps) {
  const [pdf, setPdf] = useState<PdfDoc | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageState, setPageState] = useState<PageState>({ pageText: samplePageText(), pageNumber: 7 });
  const [fileName, setFileName] = useState("未打开 PDF");
  const [zoom, setZoom] = useState(1.0);
  const [indexStatus, setIndexStatus] = useState("等待导入 PDF");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textLayerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!pdf) return;
    renderPage(pdf, pageNumber, zoom, canvasRef.current, textLayerRef.current).then((page) => {
      if (page) setPageState(page);
    }).catch((err) => setIndexStatus(err instanceof Error ? err.message : String(err)));
  }, [pdf, pageNumber, zoom]);

  async function loadFile(file: File) {
    setFileName(file.name);
    onPdfFileLoaded(file);
    const buffer = await file.arrayBuffer();
    const doc = await pdfjsLib.getDocument({ data: buffer.slice(0) }).promise;
    setPdf(doc);
    setPageNumber(1);
    void buildSentenceIndex(doc, file).then(onSentenceIndexReady).then(() => setIndexStatus("句子切分完成，已写入工作区缓存")).catch((err) => setIndexStatus(`句子切分失败：${err instanceof Error ? err.message : String(err)}`));
  }

  function captureSelection() {
    const text = window.getSelection()?.toString().trim() || "";
    if (!text) return;
    onSelectionChange({
      selectedText: text,
      pageLabel: `Page ${pageState.pageNumber}`,
      pageNumber: pageState.pageNumber,
      pageText: pageState.pageText,
      nearbyContext: buildNearbyContext(pageState.pageText, text),
      source: "left-pdf"
    });
  }

  return (
    <section className="pane pdf-pane">
      <div className="pane-toolbar">
        <label className="toolbar-button">
          Open File
          <input type="file" accept="application/pdf,.pdf" hidden onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void loadFile(file);
            event.currentTarget.value = "";
          }} />
        </label>
        <span className="file-name">{fileName}</span>
        <span className="toolbar-spacer" />
        <button className="icon-button" onClick={() => setPageNumber((p) => Math.max(1, p - 1))}>‹</button>
        <span className="page-pill">{pageNumber} / {pdf?.numPages ?? 24}</span>
        <button className="icon-button" onClick={() => setPageNumber((p) => Math.min(pdf?.numPages ?? p + 1, p + 1))}>›</button>
        <button className="icon-button" onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.1).toFixed(1))))}>−</button>
        <span className="page-pill">{Math.round(zoom * 100)}%</span>
        <button className="icon-button" onClick={() => setZoom((z) => Math.min(2, Number((z + 0.1).toFixed(1))))}>+</button>
      </div>
      <div className="pdf-body">
        <aside className="thumb-rail" aria-label="page thumbnails">
          {[5, 6, 7, 8, 9].map((n) => <div key={n} className={`thumb ${n === pageNumber ? "active" : ""}`}><div className="thumb-box" />{n}</div>)}
        </aside>
        <div className="pdf-page-wrap" onMouseUp={captureSelection}>
          {pdf ? (
            <div className="pdf-rendered-page" style={{ width: 820 * zoom }}>
              <canvas ref={canvasRef} />
              <div ref={textLayerRef} className="pdf-text-layer" />
            </div>
          ) : (
            <SamplePdfPage onMouseUp={captureSelection} />
          )}
        </div>
      </div>
      <div className="status-strip">{indexStatus}</div>
    </section>
  );
}

async function renderPage(pdf: PdfDoc, pageNumber: number, zoom: number, canvas: HTMLCanvasElement | null, textLayer: HTMLDivElement | null): Promise<PageState | null> {
  if (!canvas || !textLayer) return null;
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1.25 * zoom });
  const context = canvas.getContext("2d");
  if (!context) return null;
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;
  textLayer.innerHTML = "";
  textLayer.style.width = `${viewport.width}px`;
  textLayer.style.height = `${viewport.height}px`;
  await page.render({ canvasContext: context, viewport }).promise;
  const textContent = await page.getTextContent();
  const strings: string[] = [];
  for (const item of textContent.items) {
    if (!("str" in item)) continue;
    const textItem = item as any;
    const str = String(textItem.str || "");
    if (!str.trim()) continue;
    strings.push(str);
    const tx = (pdfjsLib as any).Util.transform(viewport.transform, textItem.transform);
    const fontHeight = Math.max(8, Math.hypot(tx[2], tx[3]));
    const span = document.createElement("span");
    span.textContent = str + " ";
    span.style.left = `${tx[4]}px`;
    span.style.top = `${tx[5] - fontHeight}px`;
    span.style.fontSize = `${fontHeight}px`;
    span.style.transform = `rotate(${Math.atan2(tx[1], tx[0])}rad)`;
    textLayer.appendChild(span);
  }
  return { pageNumber, pageText: strings.join(" ") };
}

async function buildSentenceIndex(pdf: PdfDoc, file: File): Promise<PdfSentenceIndex> {
  const pdfId = makePdfId(file);
  const pages: PageSentenceIndex[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => "str" in item ? item.str : "").join(" ").replace(/\s+/g, " ").trim();
    pages.push({ pdfId, pdfName: file.name, pageNumber, pageText, sentences: splitIntoSentences(pageText, pageNumber), createdAt: new Date().toISOString() });
  }
  return { pdfId, pdfName: file.name, pages, createdAt: new Date().toISOString() };
}

function SamplePdfPage({ onMouseUp }: { onMouseUp: () => void }) {
  return (
    <article className="sample-pdf-page" onMouseUp={onMouseUp}>
      <h1>Variational Inference and<br />the Evidence Lower Bound</h1>
      <hr />
      <h2>Key Idea</h2>
      <p>Exact inference in complex models is intractable.</p>
      <p>Variational inference turns inference into an optimization problem by introducing an approximate distribution <em>q(z)</em> to the true posterior <em>p(z|x)</em>.</p>
      <p className="highlight">The Evidence Lower Bound (ELBO) provides a tractable objective that we can maximize with respect to q(z).</p>
      <h2>The Evidence Lower Bound (ELBO)</h2>
      <p>For any distribution <em>q(z)</em>,</p>
      <div className="formula">log p(x) ≥ E<sub>q(z)</sub>[log p(x,z) − log q(z)] ≜ L(q)</div>
      <ul>
        <li>Maximizing L(q) brings q(z) closer to p(z|x).</li>
        <li>The gap log p(x) − L(q) = KL(q(z)||p(z|x)) ≥ 0.</li>
      </ul>
      <footer>Machine Learning Foundations <span>7</span></footer>
    </article>
  );
}

function samplePageText() {
  return "Variational inference turns inference into an optimization problem by introducing an approximate distribution q(z) to the true posterior p(z|x). The Evidence Lower Bound (ELBO) provides a tractable objective that we can maximize with respect to q(z). For any distribution q(z), log p(x) is greater than or equal to the expected log joint minus log q(z). Maximizing L(q) brings q(z) closer to p(z|x).";
}
