import { useEffect, useMemo, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.mjs?url";
import type { PageSentenceIndex, PdfSentenceIndex, SelectedContext, SentenceRecord } from "../../shared/contracts";
import { boundPageText, buildNearbyContext, findSentenceForSelection, makePdfId, normalizePdfText, splitIntoSentences } from "../../lib/pdf/sentence";

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
  sentences: SentenceRecord[];
};

type IndexProgress = {
  pageNumber: number;
  pageCount: number;
  sentenceCount: number;
};

type PdfTextItem = {
  str: string;
  hasEOL?: boolean;
};

type PdfTextContentLike = {
  items: unknown[];
};

const sampleText = samplePageText();

export function PdfPane({ onSelectionChange, onPdfFileLoaded, onSentenceIndexReady }: PdfPaneProps) {
  const [pdf, setPdf] = useState<PdfDoc | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageState, setPageState] = useState<PageState>({
    pageText: sampleText,
    pageNumber: 7,
    sentences: splitIntoSentences(sampleText, 7)
  });
  const [fileName, setFileName] = useState("未打开 PDF");
  const [zoom, setZoom] = useState(0.6);
  const [indexStatus, setIndexStatus] = useState("等待导入 PDF");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textLayerRef = useRef<HTMLDivElement | null>(null);
  const pageCacheRef = useRef<Map<number, PageState>>(new Map());
  const renderRunRef = useRef(0);

  const pageCount = pdf?.numPages ?? 24;
  const displayPageNumber = pdf ? pageNumber : pageState.pageNumber;
  const thumbPages = useMemo(() => buildThumbPages(displayPageNumber, pageCount), [displayPageNumber, pageCount]);

  useEffect(() => {
    if (!pdf) return;

    const cached = pageCacheRef.current.get(pageNumber);
    if (cached) setPageState(cached);

    const renderRun = renderRunRef.current + 1;
    renderRunRef.current = renderRun;
    setIndexStatus(`正在渲染第 ${pageNumber} 页...`);

    renderPage(pdf, pageNumber, zoom, canvasRef.current, textLayerRef.current)
      .then((page) => {
        if (!page || renderRunRef.current !== renderRun) return;
        pageCacheRef.current.set(page.pageNumber, page);
        setPageState(page);
        setIndexStatus(page.pageText
          ? `第 ${page.pageNumber} 页文本已就绪，可选中提问`
          : `第 ${page.pageNumber} 页未提取到文字，可能是扫描版 PDF`);
      })
      .catch((err) => {
        if (renderRunRef.current !== renderRun) return;
        setIndexStatus(`PDF 渲染失败：${errorMessage(err)}`);
      });

    return () => {
      renderRunRef.current += 1;
    };
  }, [pdf, pageNumber, zoom]);

  async function loadFile(file: File) {
    setFileName(file.name);
    setIndexStatus(`正在读取 PDF：${file.name}`);
    pageCacheRef.current.clear();
    onPdfFileLoaded(file);

    try {
      const buffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(buffer),
        useSystemFonts: true
      });

      loadingTask.onProgress = ({ loaded, total }: { loaded: number; total: number }) => {
        if (!total) return;
        setIndexStatus(`正在加载 PDF：${Math.round((loaded / total) * 100)}%`);
      };

      const doc = await loadingTask.promise;
      setPdf(doc);
      setPageNumber(1);
      setIndexStatus(`PDF 已打开，共 ${doc.numPages} 页；正在提取全文句子...`);

      void buildSentenceIndex(doc, file, ({ pageNumber: currentPage, pageCount: totalPages, sentenceCount }) => {
        setIndexStatus(`正在提取句子：第 ${currentPage}/${totalPages} 页，已得到 ${sentenceCount} 句`);
      })
        .then((index) => {
          onSentenceIndexReady(index);
          const sentenceCount = index.pages.reduce((sum, page) => sum + page.sentences.length, 0);
          setIndexStatus(`句子切分完成：${index.pages.length} 页，${sentenceCount} 句；已准备写入工作区并后台标注`);
        })
        .catch((err) => setIndexStatus(`句子切分失败：${errorMessage(err)}`));
    } catch (err) {
      setIndexStatus(`PDF 加载失败：${errorMessage(err)}`);
    }
  }

  function captureSelection() {
    window.requestAnimationFrame(() => {
      const text = normalizePdfText(window.getSelection()?.toString() || "");
      if (!text) return;

      const sentence = findSentenceForSelection(pageState.sentences, text);
      onSelectionChange({
        selectedText: text,
        pageLabel: `第 ${pageState.pageNumber} 页`,
        pageNumber: pageState.pageNumber,
        pageText: pageState.pageText,
        nearbyContext: buildNearbyContext(pageState.pageText, text),
        source: "left-pdf",
        sentenceId: sentence?.id
      });
      setIndexStatus(`已选中第 ${pageState.pageNumber} 页文本，可直接提问`);
    });
  }

  return (
    <section className="pane pdf-pane">
      <div className="pane-toolbar">
        <div className="toolbar-group toolbar-left">
          <label className="toolbar-button">
            打开课件
            <input type="file" accept="application/pdf,.pdf" hidden onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void loadFile(file);
              event.currentTarget.value = "";
            }} />
          </label>
          <span className="file-name">{fileName}</span>
        </div>
        <div className="toolbar-group toolbar-right">
          <button className="icon-button" aria-label="上一页" title="上一页" disabled={!pdf || pageNumber <= 1} onClick={() => setPageNumber((p) => Math.max(1, p - 1))}>‹</button>
          <span className="page-pill">{displayPageNumber} / {pageCount}</span>
          <button className="icon-button" aria-label="下一页" title="下一页" disabled={!pdf || pageNumber >= pageCount} onClick={() => setPageNumber((p) => Math.min(pageCount, p + 1))}>›</button>
          <button className="icon-button" aria-label="缩小" title="缩小" onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.1).toFixed(1))))}>−</button>
          <span className="page-pill">{Math.round(zoom * 100)}%</span>
          <button className="icon-button" aria-label="放大" title="放大" onClick={() => setZoom((z) => Math.min(2, Number((z + 0.1).toFixed(1))))}>+</button>
          <span className="select-tool-pill">选择文本</span>
        </div>
      </div>
      <div className="pdf-body">
        <aside className="thumb-rail" aria-label="页面缩略图">
          {thumbPages.map((n) => (
            <div key={n} className={`thumb ${n === displayPageNumber ? "active" : ""}`}>
              <div className="thumb-box" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              {n}
            </div>
          ))}
        </aside>
        <div className="pdf-page-wrap" onMouseUp={captureSelection} onKeyUp={captureSelection}>
          {pdf ? (
            <div className="pdf-rendered-page">
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

async function renderPage(
  pdf: PdfDoc,
  pageNumber: number,
  zoom: number,
  canvas: HTMLCanvasElement | null,
  textLayer: HTMLDivElement | null
): Promise<PageState | null> {
  if (!canvas || !textLayer) return null;

  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 1.25 * zoom });
  const context = canvas.getContext("2d");
  if (!context) return null;

  const outputScale = window.devicePixelRatio || 1;
  canvas.width = Math.floor(viewport.width * outputScale);
  canvas.height = Math.floor(viewport.height * outputScale);
  canvas.style.width = `${Math.floor(viewport.width)}px`;
  canvas.style.height = `${Math.floor(viewport.height)}px`;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvas.width, canvas.height);

  textLayer.replaceChildren();
  textLayer.style.setProperty("--scale-factor", String(viewport.scale));

  const renderTask = page.render({
    canvasContext: context,
    viewport,
    transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0]
  });
  const textContent = await page.getTextContent({ includeMarkedContent: false });
  const renderedTextLayer = new pdfjsLib.TextLayer({
    textContentSource: textContent,
    container: textLayer,
    viewport
  });

  await Promise.all([renderTask.promise, renderedTextLayer.render()]);

  const pageText = boundPageText(textContentToPageText(textContent));
  return {
    pageNumber,
    pageText,
    sentences: splitIntoSentences(pageText, pageNumber)
  };
}

async function buildSentenceIndex(
  pdf: PdfDoc,
  file: File,
  onProgress?: (progress: IndexProgress) => void
): Promise<PdfSentenceIndex> {
  const pdfId = makePdfId(file);
  const pages: PageSentenceIndex[] = [];
  let sentenceCount = 0;

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent({ includeMarkedContent: false });
    const pageText = boundPageText(textContentToPageText(textContent));
    const sentences = splitIntoSentences(pageText, pageNumber);
    sentenceCount += sentences.length;
    pages.push({
      pdfId,
      pdfName: file.name,
      pageNumber,
      pageText,
      sentences,
      createdAt: new Date().toISOString()
    });
    onProgress?.({ pageNumber, pageCount: pdf.numPages, sentenceCount });
    await yieldToBrowser();
  }

  return { pdfId, pdfName: file.name, pages, createdAt: new Date().toISOString() };
}

function textContentToPageText(textContent: PdfTextContentLike) {
  const parts: string[] = [];

  for (const rawItem of textContent.items) {
    const item = rawItem as Partial<PdfTextItem>;
    if (typeof item.str !== "string") continue;

    const str = item.str.replace(/\s+/g, " ").trim();
    if (str) parts.push(str);
    parts.push(item.hasEOL ? "\n" : " ");
  }

  return normalizePdfText(parts.join(""), true);
}

function buildThumbPages(currentPage: number, pageCount: number) {
  const start = Math.max(1, Math.min(currentPage - 2, Math.max(1, pageCount - 4)));
  return Array.from({ length: Math.min(5, pageCount) }, (_, index) => start + index);
}

function yieldToBrowser() {
  return new Promise<void>((resolve) => window.setTimeout(resolve, 0));
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
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
      <div className="formula">{"log p(x) >= E"}<sub>q(z)</sub>{"[log p(x,z) - log q(z)] = L(q)"}</div>
      <ul>
        <li>Maximizing L(q) brings q(z) closer to p(z|x).</li>
        <li>{"The gap log p(x) - L(q) = KL(q(z)||p(z|x)) >= 0."}</li>
      </ul>
      <footer>Machine Learning Foundations <span>7</span></footer>
    </article>
  );
}

function samplePageText() {
  return "Variational inference turns inference into an optimization problem by introducing an approximate distribution q(z) to the true posterior p(z|x). The Evidence Lower Bound (ELBO) provides a tractable objective that we can maximize with respect to q(z). For any distribution q(z), log p(x) >= E_q[log p(x,z) - log q(z)] = L(q). Maximizing L(q) brings q(z) closer to p(z|x).";
}
