import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { AssistantDock } from "./components/assistant/AssistantDock";
import { HandoutPane } from "./components/handout/HandoutPane";
import { PdfPane } from "./components/pdf/PdfPane";
import { FinalSummaryModal } from "./components/summary/FinalSummaryModal";
import { WorkspaceGate } from "./components/workspace/WorkspaceGate";
import { requestFinalSummary, requestLabelPage } from "./lib/ai/client";
import { buildFinalSummaryMarkdown, ensureFinalSummaryMarkdown } from "./lib/markdown";
import { extractPdfTextAsMarkdown } from "./lib/pdf/extractPdf";
import { buildNearbyContext } from "./lib/pdf/sentence";
import {
  copyFileToWorkspace,
  loadWorkspaceData,
  safeName,
  saveExportMarkdown,
  saveHandout,
  saveSettings,
  saveStudyLog,
  writePageLabels,
  writeSentenceCache
} from "./lib/workspace/fsAccess";
import type {
  AppSettings,
  PdfSentenceIndex,
  SelectedContext,
  StudyLogEntry,
  WorkspaceData,
  WorkspaceRef
} from "./shared/contracts";

const initialSelection: SelectedContext = {
  selectedText: "",
  pageLabel: "未选择",
  pageText: "",
  source: "unknown"
};

function getAssistantReservedHeight(settings: AppSettings) {
  const mode = settings.assistantMode ?? "compact";
  if (mode === "collapsed") return 58;

  const rawHeight = Number.isFinite(settings.assistantHeight) ? settings.assistantHeight : 316;
  if (mode === "expanded") return Math.min(Math.max(rawHeight, 340), 520) + 20;
  return Math.min(Math.max(rawHeight, 260), 320) + 18;
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

  const settings = workspaceData?.settings;
  const studyLog = workspaceData?.studyLog ?? [];
  const handoutMarkdown = workspaceData?.handoutMarkdown ?? "";

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
    if (!workspace || !workspaceData) return;
    const timer = window.setTimeout(() => {
      void saveHandout(workspace, workspaceData.handoutMarkdown).catch((error) => {
        console.error(error);
        setStatus(`保存讲义失败：${error instanceof Error ? error.message : String(error)}`);
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [workspace, workspaceData?.handoutMarkdown]);

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

  async function handleRightFile(file: File) {
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const text = isPdf
      ? await extractPdfTextAsMarkdown(file, ({ pageNumber, pageCount }) => {
        setStatus(`正在提取右侧讲义 PDF：第 ${pageNumber}/${pageCount} 页`);
      })
      : await file.text();
    setWorkspaceData((data) => data
      ? { ...data, handoutMarkdown: text, settings: { ...data.settings, lastRightHandoutName: file.name } }
      : data);
    if (workspace) {
      await copyFileToWorkspace(workspace, file, `handouts/imported-handouts/${safeName(file.name)}`);
      await saveHandout(workspace, text);
      setStatus(`已载入右侧讲义：${file.name}`);
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

  if (!workspace || !workspaceData || !settings) {
    return <WorkspaceGate onWorkspaceReady={(next) => void openWorkspace(next)} />;
  }

  const shellStyle = {
    "--assistant-reserved-height": `${getAssistantReservedHeight(settings)}px`
  } as CSSProperties;

  return (
    <div className="app-shell" style={shellStyle}>
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark">T</span>
          <span className="brand-title">TwinPDF</span>
        </div>
        <input
          className="course-title-input"
          value={courseTitle}
          onChange={(event) => setCourseTitle(event.target.value)}
          aria-label="课程名称"
        />
        <span className="workspace-status">{status}</span>
        <button className="finalize-button" onClick={() => void finalizeCourse()}>结束课程总结</button>
      </header>

      <main className="workspace">
        <PdfPane
          onSelectionChange={setSelected}
          onPdfFileLoaded={(file) => void handlePdfFileLoaded(file)}
          onSentenceIndexReady={(index) => void handleSentenceIndexReady(index)}
        />
        <HandoutPane
          markdown={handoutMarkdown}
          fileName={workspaceData.settings.lastRightHandoutName}
          onChange={(markdown) => setWorkspaceData({ ...workspaceData, handoutMarkdown: markdown })}
          onOpenFile={(file) => void handleRightFile(file)}
        />
      </main>

      <div className="assistant-stage">
        <AssistantDock
          courseTitle={courseTitle}
          workspaceName={workspace.name}
          selected={normalizedSelected}
          rightNoteContext={handoutMarkdown}
          recentEntries={studyLog}
          settings={settings}
          onSettingsChange={updateSettings}
          onAddEntry={addStudyLogEntry}
        />
      </div>

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
