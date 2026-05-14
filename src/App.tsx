import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { AssistantDock } from "./components/assistant/AssistantDock";
import { PdfPane } from "./components/pdf/PdfPane";
import { FinalSummaryModal } from "./components/summary/FinalSummaryModal";
import { WorkspaceGate } from "./components/workspace/WorkspaceGate";
import { requestAiHealth, requestFinalSummary, requestLabelPage, requestTermLabels } from "./lib/ai/client";
import { buildFinalSummaryMarkdown, ensureFinalSummaryMarkdown } from "./lib/markdown";
import { buildNearbyContext } from "./lib/pdf/sentence";
import { buildTermContext, extractTermsFromPdfIndex, labelArrayToMap, makeTermLabelIndex, mergeTermLabels, normalizeTermKey } from "./lib/pdf/terms";
import {
  copyFileToWorkspace,
  loadWorkspaceData,
  readTermLabelCache,
  safeName,
  saveExportMarkdown,
  saveSettings,
  saveStudyLog,
  writePageLabels,
  writeSentenceCache,
  writeTermLabelCache
} from "./lib/workspace/fsAccess";
import type {
  AppSettings,
  ClickedTermContext,
  PdfSentenceIndex,
  SelectedContext,
  StudyLogEntry,
  TermLabel,
  TermLabelIndex,
  WorkspaceData,
  WorkspaceRef
} from "./shared/contracts";

const initialSelection: SelectedContext = {
  selectedText: "",
  pageLabel: "未选择",
  pageText: "",
  source: "unknown"
};

const splitStorageKey = "twinpdf.workspace.split";
const mockTermLabelBatchSize = 220;
const deepSeekFirstTermBatchSize = 2;
const deepSeekTermLabelBatchSize = 8;

function clampSplitPercent(value: number) {
  return Math.max(28, Math.min(72, value));
}

function initialSplitPercent() {
  if (typeof window === "undefined") return 50;
  const stored = Number(window.localStorage.getItem(splitStorageKey));
  return Number.isFinite(stored) ? clampSplitPercent(stored) : 50;
}

export default function App() {
  const [workspace, setWorkspace] = useState<WorkspaceRef | null>(null);
  const [workspaceData, setWorkspaceData] = useState<WorkspaceData | null>(null);
  const [courseTitle, setCourseTitle] = useState("本次课程");
  const [selected, setSelected] = useState<SelectedContext>(initialSelection);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryMarkdown, setSummaryMarkdown] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [savedSummaryPath, setSavedSummaryPath] = useState<string | null>(null);
  const [status, setStatus] = useState("请选择学习工作区");
  const [rightPdfContext, setRightPdfContext] = useState("");
  const [leftPdfTermIndex, setLeftPdfTermIndex] = useState<TermLabelIndex | null>(null);
  const [splitPercent, setSplitPercent] = useState(initialSplitPercent);
  const [isResizingSplit, setIsResizingSplit] = useState(false);
  const resizingSplitRef = useRef(false);

  const settings = workspaceData?.settings;
  const studyLog = workspaceData?.studyLog ?? [];

  const normalizedSelected = useMemo<SelectedContext>(() => ({
    ...selected,
    nearbyContext: selected.nearbyContext || buildNearbyContext(selected.pageText, selected.selectedText)
  }), [selected]);

  useEffect(() => {
    if (!workspace || !workspaceData) return;
    void saveSettings(workspace, workspaceData.settings).catch((error) => {
      console.error(error);
      setStatus(`保存设置失败：${error instanceof Error ? error.message : String(error)}`);
    });
  }, [workspace, workspaceData?.settings]);

  useEffect(() => {
    if (!workspace || !workspaceData) return;
    void saveStudyLog(workspace, workspaceData.studyLog).catch((error) => {
      console.error(error);
      setStatus(`保存学习记录失败：${error instanceof Error ? error.message : String(error)}`);
    });
  }, [workspace, workspaceData?.studyLog]);

  useEffect(() => {
    window.localStorage.setItem(splitStorageKey, String(Math.round(splitPercent * 10) / 10));
  }, [splitPercent]);

  async function openWorkspace(nextWorkspace: WorkspaceRef) {
    const data = await loadWorkspaceData(nextWorkspace);
    setWorkspace(nextWorkspace);
    setWorkspaceData(data);
    setCourseTitle(data.manifest.workspaceName || nextWorkspace.name || "本次课程");
    setStatus(`工作区：${nextWorkspace.name}`);
  }

  function requireData(): WorkspaceData {
    if (!workspaceData) throw new Error("工作区还没有准备好。");
    return workspaceData;
  }

  function updateSettings(nextSettings: AppSettings) {
    const data = requireData();
    setWorkspaceData({ ...data, settings: nextSettings });
  }

  async function addStudyLogEntry(entry: StudyLogEntry) {
    const data = requireData();
    const nextEntries = data.studyLog.some((item) => item.id === entry.id)
      ? data.studyLog
      : [entry, ...data.studyLog];
    setWorkspaceData({ ...data, studyLog: nextEntries });
    if (workspace) await saveStudyLog(workspace, nextEntries);
  }

  async function handleRightPdfFileLoaded(file: File) {
    setWorkspaceData((data) => data
      ? { ...data, settings: { ...data.settings, lastRightHandoutName: file.name } }
      : data);
    if (workspace) {
      await copyFileToWorkspace(workspace, file, `handouts/imported-handouts/${safeName(file.name)}`);
      setStatus(`已载入右侧讲义 PDF：${file.name}`);
    }
  }

  async function handlePdfFileLoaded(file: File) {
    if (!workspace) return;
    setStatus(`已导入 PDF：${file.name}，正在提取页面文本和句子...`);
    await copyFileToWorkspace(workspace, file, `sources/${safeName(file.name)}`);
    setWorkspaceData((data) => data
      ? { ...data, settings: { ...data.settings, lastLeftPdfName: file.name } }
      : data);
  }

  async function handleSentenceIndexReady(index: PdfSentenceIndex) {
    if (!workspace) return;
    await writeSentenceCache(workspace, index.pdfId, index);
    await ensureTermLabels(index);
    const usefulPages = index.pages.filter((page) => page.sentences.length > 0 && page.pageText.trim());
    setStatus(`句子缓存已写入：${index.pdfName}，共 ${index.pages.length} 页，开始后台标注。`);

    let labeled = 0;
    for (const page of usefulPages) {
      try {
        const labelResult = await requestLabelPage({
          courseTitle,
          pdfName: index.pdfName,
          pageNumber: page.pageNumber,
          pageText: page.pageText,
          sentences: page.sentences.slice(0, 24)
        });
        await writePageLabels(workspace, index.pdfId, page.pageNumber, labelResult);
        labeled += 1;
        setStatus(`后台标注中：${index.pdfName} 第 ${page.pageNumber} 页，已完成 ${labeled}/${usefulPages.length} 页。`);
      } catch (error) {
        setStatus(`第 ${page.pageNumber} 页标注暂未完成：${error instanceof Error ? error.message : String(error)}`);
      }
      await new Promise((resolve) => window.setTimeout(resolve, 60));
    }

    setStatus(`PDF 准备完成：${index.pdfName}。句子缓存和页面标签已写入工作区。`);
  }

  async function ensureTermLabels(index: PdfSentenceIndex) {
    if (!workspace) return;
    const aiHealth = await requestAiHealth().catch(() => null);
    const emptyIndex = makeTermLabelIndex(index.pdfId, index.pdfName, []);
    const cached = await readTermLabelCache<TermLabelIndex>(workspace, index.pdfId, emptyIndex);
    const canReuseCache = cached.labels?.length && isReusableTermLabelCache(cached, aiHealth);
    if (canReuseCache) {
      setLeftPdfTermIndex(cached);
      setStatus(`词义缓存已读取：${cached.labels.length} 个去重词，来源 ${cached.model || "local"}。`);
      return;
    }
    if (cached.labels?.length && aiHealth?.mockAI === false) {
      setStatus(`检测到旧 mock 词义缓存，当前为 ${aiHealth.model}，将重新生成真实 AI 词义。`);
    }

    const terms = extractTermsFromPdfIndex(index);
    const labels: TermLabel[] = [];
    const contextText = buildTermContext(index);
    setStatus(`正在生成词义缓存：${terms.length} 个去重词，模式 ${aiHealth?.mockAI === false ? aiHealth.model : "mock"}。`);

    let start = 0;
    while (start < terms.length) {
      const batchSize = aiHealth?.mockAI === false
        ? start === 0 ? deepSeekFirstTermBatchSize : deepSeekTermLabelBatchSize
        : mockTermLabelBatchSize;
      const chunk = terms.slice(start, start + batchSize);
      const result = await requestTermLabels({
        courseTitle,
        pdfId: index.pdfId,
        pdfName: index.pdfName,
        terms: chunk,
        contextText,
        language: "zh-CN"
      });
      labels.push(...result.labels);
      const partial = makeTermLabelIndex(index.pdfId, index.pdfName, labels, result.model);
      setLeftPdfTermIndex(partial);
      await writeTermLabelCache(workspace, index.pdfId, partial);
      start += chunk.length;
      setStatus(`词义缓存生成中：${Math.min(start, terms.length)}/${terms.length} 个词，来源 ${result.model || "unknown"}。`);
      await new Promise((resolve) => window.setTimeout(resolve, 40));
    }
  }

  function isReusableTermLabelCache(cached: TermLabelIndex, aiHealth: Awaited<ReturnType<typeof requestAiHealth>> | null) {
    if (!aiHealth) return true;
    const containsMockLabels = cached.labels.some((label) => label.source === "mock");
    if (aiHealth.mockAI) return cached.model === "mock" || containsMockLabels;
    return cached.model === aiHealth.model && !containsMockLabels;
  }

  async function handleWordClick(payload: ClickedTermContext) {
    const key = normalizeTermKey(payload.term);
    const label = key ? labelArrayToMap(leftPdfTermIndex?.labels || []).get(key) : undefined;
    const termLabel: TermLabel = label || {
      term: payload.term,
      normalized: key,
      chinese: "标注中",
      definition: "词义缓存还在生成；稍后会自动补上。",
      source: "local"
    };

    setSelected({
      selectedText: payload.term,
      pageLabel: payload.pageLabel,
      pageNumber: payload.pageNumber,
      pageText: payload.pageText,
      nearbyContext: payload.nearbyContext,
      source: payload.source,
      clickedTerm: payload.term,
      termLabel
    });

    if (!workspace || !leftPdfTermIndex || label || !key) return;
    try {
      const result = await requestTermLabels({
        courseTitle,
        pdfId: leftPdfTermIndex.pdfId,
        pdfName: leftPdfTermIndex.pdfName,
        terms: [payload.term],
        contextText: payload.nearbyContext || payload.pageText,
        language: "zh-CN"
      });
      const nextIndex = {
        ...leftPdfTermIndex,
        labels: mergeTermLabels(leftPdfTermIndex.labels, result.labels),
        model: result.model || leftPdfTermIndex.model,
        updatedAt: new Date().toISOString()
      };
      setLeftPdfTermIndex(nextIndex);
      const nextLabel = labelArrayToMap(nextIndex.labels).get(key);
      if (nextLabel) {
        setSelected((current) => current.clickedTerm === payload.term ? { ...current, termLabel: nextLabel } : current);
      }
      await writeTermLabelCache(workspace, leftPdfTermIndex.pdfId, nextIndex);
    } catch (error) {
      setStatus(`词义补标暂时失败：${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async function finalizeCourse() {
    setSummaryOpen(true);
    setSummaryLoading(true);
    setSummaryError(null);
    setSavedSummaryPath(null);
    try {
      const result = await requestFinalSummary({ courseTitle, workspaceName: workspace?.name, entries: studyLog });
      setSummaryMarkdown(ensureFinalSummaryMarkdown({
        courseTitle,
        workspaceName: workspace?.name,
        entries: studyLog,
        generatedReviewMarkdown: result.markdown
      }));
    } catch (error) {
      setSummaryMarkdown(buildFinalSummaryMarkdown({ courseTitle, workspaceName: workspace?.name, entries: studyLog }));
      setSummaryError(`AI 总结暂时不可用，已先生成本地版。${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setSummaryLoading(false);
    }
  }

  async function saveSummary() {
    if (!workspace || !summaryMarkdown.trim()) return;
    const saved = await saveExportMarkdown(workspace, summaryMarkdown);
    setSavedSummaryPath(saved);
    setStatus(`最终总结已保存：${saved}`);
  }

  function updateSplitFromPointer(event: PointerEvent<HTMLElement>) {
    const workspaceBox = event.currentTarget.parentElement?.getBoundingClientRect();
    if (!workspaceBox) return;
    const nextPercent = ((event.clientX - workspaceBox.left) / workspaceBox.width) * 100;
    setSplitPercent(clampSplitPercent(nextPercent));
  }

  function startSplitResize(event: PointerEvent<HTMLElement>) {
    resizingSplitRef.current = true;
    setIsResizingSplit(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    updateSplitFromPointer(event);
  }

  function moveSplitResize(event: PointerEvent<HTMLElement>) {
    if (resizingSplitRef.current) updateSplitFromPointer(event);
  }

  function endSplitResize(event: PointerEvent<HTMLElement>) {
    resizingSplitRef.current = false;
    setIsResizingSplit(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function nudgeSplit(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    setSplitPercent((value) => clampSplitPercent(value + (event.key === "ArrowLeft" ? -3 : 3)));
  }

  if (!workspace || !workspaceData || !settings) {
    return <WorkspaceGate onWorkspaceReady={(next) => void openWorkspace(next)} />;
  }

  return (
    <div className="app-shell">
      <main
        className={`workspace ${isResizingSplit ? "is-resizing" : ""}`}
        style={{ "--left-pane": `${splitPercent}%` } as CSSProperties}
      >
        <PdfPane
          title="英文课件"
          openLabel="打开"
          emptyFileName="左侧 PDF"
          paneClassName="left-pdf-pane"
          selectionSource="left-pdf"
          initialZoom={0.54}
          onSelectionChange={setSelected}
          onWordClick={(word) => void handleWordClick(word)}
          onPdfFileLoaded={(file) => void handlePdfFileLoaded(file)}
          onSentenceIndexReady={(index) => void handleSentenceIndexReady(index)}
        />
        <div
          className="workspace-divider"
          role="separator"
          aria-label="Resize PDF panes"
          aria-orientation="vertical"
          tabIndex={0}
          onPointerDown={startSplitResize}
          onPointerMove={moveSplitResize}
          onPointerUp={endSplitResize}
          onPointerCancel={endSplitResize}
          onKeyDown={nudgeSplit}
        />
        <PdfPane
          title="中文讲义"
          openLabel="打开"
          emptyFileName="右侧 PDF"
          paneClassName="right-pdf-pane"
          selectionSource="right-handout"
          enableSentenceIndex={false}
          initialZoom={0.9}
          onPdfFileLoaded={(file) => void handleRightPdfFileLoaded(file)}
          onPageTextReady={({ fileName, pageNumber, pageText }) => {
            setRightPdfContext(`${fileName} 第 ${pageNumber} 页\n${pageText}`.slice(0, 5000));
          }}
        />
      </main>

      <AssistantDock
        courseTitle={courseTitle}
        workspaceName={workspace.name}
        selected={normalizedSelected}
        rightNoteContext={rightPdfContext}
        recentEntries={studyLog}
        settings={settings}
        onSettingsChange={updateSettings}
        onAddEntry={addStudyLogEntry}
      />

      <FinalSummaryModal
        open={summaryOpen}
        markdown={summaryMarkdown}
        loading={summaryLoading}
        error={summaryError}
        entries={studyLog}
        savedPath={savedSummaryPath}
        onClose={() => setSummaryOpen(false)}
        onCopy={() => navigator.clipboard.writeText(summaryMarkdown)}
        onSave={saveSummary}
      />
    </div>
  );
}
