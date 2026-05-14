import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import * as pdfjsLib from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.mjs?url";
import type { ClickedTermContext, PageSentenceIndex, PdfSentenceIndex, SelectedContext, SentenceRecord } from "../../shared/contracts";
import { boundPageText, buildNearbyContext, findSentenceForSelection, makePdfId, normalizePdfText, splitIntoSentences } from "../../lib/pdf/sentence";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

type PdfPaneProps = {
  title?: string;
  openLabel?: string;
  emptyFileName?: string;
  paneClassName?: string;
  selectionSource?: SelectedContext["source"];
  enableSentenceIndex?: boolean;
  showStatus?: boolean;
  showSelectTool?: boolean;
  showThumbnails?: boolean;
  showZoomControls?: boolean;
  initialZoom?: number;
  onSelectionChange?: (selection: SelectedContext) => void;
  onWordClick?: (word: ClickedTermContext) => void;
  onPdfFileLoaded?: (file: File) => void;
  onSentenceIndexReady?: (index: PdfSentenceIndex) => void;
  onPageTextReady?: (payload: { fileName: string; pageNumber: number; pageText: string }) => void;
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

export function PdfPane({
  title = "英文课件",
  openLabel = "打开",
  emptyFileName = "未打开 PDF",
  paneClassName = "",
  selectionSource = "left-pdf",
  enableSentenceIndex = true,
  showStatus = false,
  showSelectTool = false,
  showThumbnails = false,
  showZoomControls = true,
  initialZoom = 0.6,
  onSelectionChange,
  onWordClick,
  onPdfFileLoaded,
  onSentenceIndexReady,
  onPageTextReady
}: PdfPaneProps) {
  const [pdf, setPdf] = useState<PdfDoc | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageState, setPageState] = useState<PageState>({
    pageText: sampleText,
    pageNumber: 1,
    sentences: splitIntoSentences(sampleText, 1)
  });
  const [fileName, setFileName] = useState(emptyFileName);
  const [zoom, setZoom] = useState(initialZoom);
  const [visiblePageCount, setVisiblePageCount] = useState(3);
  const [pendingScrollPage, setPendingScrollPage] = useState<number | null>(null);
  const [indexStatus, setIndexStatus] = useState("等待导入 PDF");
  const pageWrapRef = useRef<HTMLDivElement | null>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const pageCacheRef = useRef<Map<number, PageState>>(new Map());

  const pageCount = pdf?.numPages ?? 24;
  const displayPageNumber = pdf ? pageNumber : pageState.pageNumber;
  const thumbPages = useMemo(() => buildThumbPages(displayPageNumber, pageCount), [displayPageNumber, pageCount]);
  const visiblePages = useMemo(
    () => Array.from({ length: pdf ? Math.min(visiblePageCount, pageCount) : 0 }, (_, index) => index + 1),
    [pdf, visiblePageCount, pageCount]
  );

  useEffect(() => {
    const cached = pageCacheRef.current.get(pageNumber);
    if (!cached) return;
    setPageState(cached);
    onPageTextReady?.({ fileName, pageNumber: cached.pageNumber, pageText: cached.pageText });
  }, [fileName, onPageTextReady, pageNumber]);

  useEffect(() => {
    if (pendingScrollPage === null) return;
    const node = pageRefs.current.get(pendingScrollPage);
    if (!node) return;
    scrollToRenderedPage(node);
    setPendingScrollPage(null);
  }, [pendingScrollPage, visiblePageCount]);

  async function loadFile(file: File) {
    setFileName(file.name);
    setIndexStatus(`正在读取 PDF：${file.name}`);
    pageCacheRef.current.clear();
    onPdfFileLoaded?.(file);

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
      setVisiblePageCount(Math.min(4, doc.numPages));
      setPendingScrollPage(1);
      setIndexStatus(enableSentenceIndex
        ? `PDF 已打开，共 ${doc.numPages} 页；正在提取全文句子...`
        : `PDF 已打开，共 ${doc.numPages} 页`);

      if (enableSentenceIndex && onSentenceIndexReady) {
        void buildSentenceIndex(doc, file, ({ pageNumber: currentPage, pageCount: totalPages, sentenceCount }) => {
          setIndexStatus(`正在提取句子：第 ${currentPage}/${totalPages} 页，已得到 ${sentenceCount} 句`);
        })
          .then((index) => {
            onSentenceIndexReady(index);
            const sentenceCount = index.pages.reduce((sum, page) => sum + page.sentences.length, 0);
            setIndexStatus(`句子切分完成：${index.pages.length} 页，${sentenceCount} 句；已准备写入工作区并后台标注`);
          })
          .catch((err) => setIndexStatus(`句子切分失败：${errorMessage(err)}`));
      }
    } catch (err) {
      setIndexStatus(`PDF 加载失败：${errorMessage(err)}`);
    }
  }

  function captureSelection() {
    window.requestAnimationFrame(() => {
      const text = normalizePdfText(window.getSelection()?.toString() || "");
      if (!text) return;

      const selectedPageNumber = findSelectedPageNumber() || pageState.pageNumber;
      const selectedPageState = pageCacheRef.current.get(selectedPageNumber) || pageState;
      const sentence = findSentenceForSelection(selectedPageState.sentences, text);
      onSelectionChange?.({
        selectedText: text,
        pageLabel: `第 ${selectedPageState.pageNumber} 页`,
        pageNumber: selectedPageState.pageNumber,
        pageText: selectedPageState.pageText,
        nearbyContext: buildNearbyContext(selectedPageState.pageText, text),
        source: selectionSource,
        sentenceId: sentence?.id
      });
      setPageNumber(selectedPageState.pageNumber);
      setIndexStatus(`已选中第 ${selectedPageState.pageNumber} 页文本，可直接提问`);
    });
  }

  function captureClickedWord(event: MouseEvent<HTMLDivElement>) {
    if (!onWordClick) return;
    const word = findWordAtPoint(event.clientX, event.clientY);
    if (!word) return;
    const selectedPageNumber = findEventPageNumber(event) || pageState.pageNumber;
    const selectedPageState = pageCacheRef.current.get(selectedPageNumber) || pageState;
    onWordClick({
      term: word,
      pageLabel: `第 ${selectedPageState.pageNumber} 页`,
      pageNumber: selectedPageState.pageNumber,
      pageText: selectedPageState.pageText,
      nearbyContext: buildNearbyContext(selectedPageState.pageText, word),
      source: selectionSource
    });
  }

  const handlePageReady = useCallback((page: PageState) => {
    pageCacheRef.current.set(page.pageNumber, page);
    if (page.pageNumber === pageNumber) {
      setPageState(page);
      onPageTextReady?.({ fileName, pageNumber: page.pageNumber, pageText: page.pageText });
    }
    setIndexStatus(page.pageText
      ? `第 ${page.pageNumber} 页文本已就绪，可选中提问`
      : `第 ${page.pageNumber} 页未提取到文字，可能是扫描版 PDF`);
  }, [fileName, onPageTextReady, pageNumber]);

  function goToPage(nextPage: number) {
    const bounded = Math.max(1, Math.min(pageCount, nextPage));
    setVisiblePageCount((count) => Math.max(count, Math.min(pageCount, bounded + 2)));
    setPageNumber(bounded);
    setPendingScrollPage(bounded);
  }

  function handleScroll() {
    const wrap = pageWrapRef.current;
    if (!wrap || !pdf) return;
    if (wrap.scrollTop + wrap.clientHeight > wrap.scrollHeight - 900) {
      setVisiblePageCount((count) => Math.min(pageCount, count + 3));
    }

    const wrapBox = wrap.getBoundingClientRect();
    const focusY = wrapBox.top + wrapBox.height * 0.32;
    let nearest = pageNumber;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const [candidatePage, node] of pageRefs.current) {
      const box = node.getBoundingClientRect();
      const distance = Math.abs(box.top - focusY);
      if (distance < nearestDistance) {
        nearest = candidatePage;
        nearestDistance = distance;
      }
    }
    if (nearest !== pageNumber) setPageNumber(nearest);
  }

  function findSelectedPageNumber() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return undefined;

    const range = selection.getRangeAt(0);
    const candidates = [selection.anchorNode, selection.focusNode, range.commonAncestorContainer];
    for (const candidate of candidates) {
      const element = candidate instanceof Element ? candidate : candidate?.parentElement;
      const pageNode = element?.closest("[data-page-number]");
      if (pageNode instanceof HTMLElement && pageNode.dataset.pageNumber) {
        const page = Number(pageNode.dataset.pageNumber);
        if (Number.isFinite(page)) return page;
      }
    }

    for (const [candidatePage, node] of pageRefs.current) {
      if (node.contains(range.commonAncestorContainer)) {
        return candidatePage;
      }
    }
    return undefined;
  }

  function findEventPageNumber(event: MouseEvent<HTMLElement>) {
    const node = (event.target as HTMLElement | null)?.closest("[data-page-number]");
    if (node instanceof HTMLElement && node.dataset.pageNumber) {
      const page = Number(node.dataset.pageNumber);
      if (Number.isFinite(page)) return page;
    }
    return undefined;
  }

  function scrollToRenderedPage(node: HTMLDivElement) {
    const wrap = pageWrapRef.current;
    if (!wrap) return;
    const wrapBox = wrap.getBoundingClientRect();
    const nodeBox = node.getBoundingClientRect();
    wrap.scrollTo({
      top: wrap.scrollTop + nodeBox.top - wrapBox.top - 10,
      behavior: "auto"
    });
  }

  return (
    <section className={`pane pdf-pane ${paneClassName}`}>
      <div className="pane-toolbar">
        <div className="toolbar-group toolbar-left">
          <strong>{title}</strong>
          <label className="toolbar-button">
            {openLabel}
            <input type="file" accept="application/pdf,.pdf" hidden onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void loadFile(file);
              event.currentTarget.value = "";
            }} />
          </label>
          <span className="file-name">{fileName}</span>
        </div>
        <div className="toolbar-group toolbar-right">
          <button className="icon-button" aria-label="上一页" title="上一页" disabled={!pdf || pageNumber <= 1} onClick={() => goToPage(pageNumber - 1)}>‹</button>
          <span className="page-pill">{displayPageNumber} / {pageCount}</span>
          <button className="icon-button" aria-label="下一页" title="下一页" disabled={!pdf || pageNumber >= pageCount} onClick={() => goToPage(pageNumber + 1)}>›</button>
          {showZoomControls && (
            <>
              <button className="icon-button zoom-button zoom-out" aria-label="缩小" title="缩小" onClick={() => setZoom((z) => Math.max(0.45, Number((z - 0.1).toFixed(2))))}>−</button>
              <button className="icon-button zoom-button zoom-in" aria-label="放大" title="放大" onClick={() => setZoom((z) => Math.min(2.2, Number((z + 0.1).toFixed(2))))}>+</button>
            </>
          )}
          {showSelectTool && <span className="select-tool-pill">选择文本</span>}
        </div>
      </div>
      <div className={`pdf-body ${showThumbnails ? "with-thumbs" : "no-thumbs"}`}>
        {showThumbnails && (
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
        )}
        <div
          ref={pageWrapRef}
          className="pdf-page-wrap"
          translate="no"
          onScroll={handleScroll}
          onClick={captureClickedWord}
          onMouseUp={captureSelection}
          onKeyUp={captureSelection}
        >
          {pdf ? (
            <div className="pdf-page-stack">
              {visiblePages.map((page) => (
                <PdfPageView
                  key={`${page}-${zoom}`}
                  pdf={pdf}
                  pageNumber={page}
                  zoom={zoom}
                  onPageReady={handlePageReady}
                  onRenderStatus={setIndexStatus}
                  setPageRef={(node) => {
                    if (node) pageRefs.current.set(page, node);
                    else pageRefs.current.delete(page);
                  }}
                />
              ))}
              {visiblePageCount < pageCount && <div className="pdf-load-more">继续向下滚动加载更多页面</div>}
            </div>
          ) : (
            <SamplePdfPage onMouseUp={captureSelection} />
          )}
        </div>
      </div>
      <div className={`status-strip ${showStatus ? "" : "visually-hidden-status"}`}>{indexStatus}</div>
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

function findWordAtPoint(clientX: number, clientY: number) {
  const doc = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };

  const caret = doc.caretPositionFromPoint?.(clientX, clientY);
  if (caret) return extractWordAtOffset(caret.offsetNode.textContent || "", caret.offset);

  const range = doc.caretRangeFromPoint?.(clientX, clientY);
  if (range) return extractWordAtOffset(range.startContainer.textContent || "", range.startOffset);

  const target = document.elementFromPoint(clientX, clientY);
  return firstWord(target?.textContent || "");
}

function extractWordAtOffset(text: string, offset: number) {
  if (!text.trim()) return "";
  const bounded = Math.max(0, Math.min(offset, text.length));
  const matches = [...text.matchAll(/[A-Za-z][A-Za-z0-9]*(?:[-_/&][A-Za-z0-9]+)*/g)];
  const hit = matches.find((match) => {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    return bounded >= start && bounded <= end;
  });
  return hit?.[0] || firstWord(text);
}

function firstWord(text: string) {
  return text.match(/[A-Za-z][A-Za-z0-9]*(?:[-_/&][A-Za-z0-9]+)*/)?.[0] || "";
}

type PdfPageViewProps = {
  pdf: PdfDoc;
  pageNumber: number;
  zoom: number;
  onPageReady: (page: PageState) => void;
  onRenderStatus: (status: string) => void;
  setPageRef: (node: HTMLDivElement | null) => void;
};

function PdfPageView({ pdf, pageNumber, zoom, onPageReady, onRenderStatus, setPageRef }: PdfPageViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textLayerRef = useRef<HTMLDivElement | null>(null);
  const renderRunRef = useRef(0);

  useEffect(() => {
    const renderRun = renderRunRef.current + 1;
    renderRunRef.current = renderRun;
    onRenderStatus(`正在渲染第 ${pageNumber} 页...`);

    renderPage(pdf, pageNumber, zoom, canvasRef.current, textLayerRef.current)
      .then((page) => {
        if (!page || renderRunRef.current !== renderRun) return;
        onPageReady(page);
      })
      .catch((error) => {
        if (renderRunRef.current !== renderRun) return;
        onRenderStatus(`PDF 渲染失败：${errorMessage(error)}`);
      });

    return () => {
      renderRunRef.current += 1;
    };
  }, [onPageReady, onRenderStatus, pageNumber, pdf, zoom]);

  return (
    <div ref={setPageRef} className="pdf-rendered-page" data-page-number={pageNumber} translate="no">
      <canvas ref={canvasRef} />
      <div ref={textLayerRef} className="pdf-text-layer" lang="en" translate="no" />
      <span className="pdf-page-marker">{pageNumber}</span>
    </div>
  );
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
