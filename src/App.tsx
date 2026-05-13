import { useEffect, useMemo, useState } from "react";
import { AssistantDock } from "./components/assistant/AssistantDock";
import { HandoutPane } from "./components/handout/HandoutPane";
import { PdfPane } from "./components/pdf/PdfPane";
import { FinalSummaryModal } from "./components/summary/FinalSummaryModal";
import { WorkspaceGate } from "./components/workspace/WorkspaceGate";
import { requestFinalSummary, requestLabelPage } from "./lib/ai/client";
import { buildNearbyContext } from "./lib/pdf/sentence";
import { copyFileToWorkspace, loadWorkspaceData, safeName, saveExportMarkdown, saveHandout, saveSettings, saveStudyLog, writePageLabels, writeSentenceCache } from "./lib/workspace/fsAccess";
import type { AppSettings, PdfSentenceIndex, SelectedContext, StudyLogEntry, WorkspaceData, WorkspaceRef } from "./shared/contracts";

const initialSelection: SelectedContext = {
  selectedText: "The Evidence Lower Bound (ELBO) provides a tractable objective that we can maximize with respect to q(z).",
  pageLabel: "Page 7",
  pageNumber: 7,
  pageText: "Variational inference turns inference into an optimization problem by introducing an approximate distribution q(z) to the true posterior p(z|x). The Evidence Lower Bound (ELBO) provides a tractable objective that we can maximize with respect to q(z). For any distribution q(z), log p(x) is greater than or equal to the expected log joint minus log q(z).",
  source: "left-pdf"
};

export default function App() {
  const [workspace, setWorkspace] = useState<WorkspaceRef | null>(null);
  const [workspaceData, setWorkspaceData] = useState<WorkspaceData | null>(null);
  const [courseTitle, setCourseTitle] = useState("TwinPDF · 本次课程");
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
    void saveSettings(workspace, workspaceData.settings).catch(console.error);
  }, [workspace, workspaceData?.settings]);

  useEffect(() => {
    if (!workspace || !workspaceData) return;
    void saveStudyLog(workspace, workspaceData.studyLog).catch(console.error);
  }, [workspace, workspaceData?.studyLog]);

  useEffect(() => {
    if (!workspace || !workspaceData) return;
    const timer = window.setTimeout(() => {
      void saveHandout(workspace, workspaceData.handoutMarkdown).catch(console.error);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [workspace, workspaceData?.handoutMarkdown]);

  async function openWorkspace(nextWorkspace: WorkspaceRef) {
    const data = await loadWorkspaceData(nextWorkspace);
    setWorkspace(nextWorkspace);
    setWorkspaceData(data);
    setCourseTitle(data.manifest.workspaceName || nextWorkspace.name);
    setStatus(`工作区：${nextWorkspace.name}`);
  }

  function requireData(): WorkspaceData {
    if (!workspaceData) throw new Error("Workspace not ready.");
    return workspaceData;
  }

  function updateSettings(settings: AppSettings) {
    const data = requireData();
    setWorkspaceData({ ...data, settings });
  }

  async function addStudyLogEntry(entry: StudyLogEntry) {
    const data = requireData();
    const nextEntries = data.studyLog.some((item) => item.id === entry.id) ? data.studyLog : [entry, ...data.studyLog];
    setWorkspaceData({ ...data, studyLog: nextEntries });
    if (workspace) await saveStudyLog(workspace, nextEntries);
  }

  async function handleRightFile(file: File) {
    const text = await file.text();
    setWorkspaceData((data) => data ? { ...data, handoutMarkdown: text, settings: { ...data.settings, lastRightHandoutName: file.name } } : data);
    if (workspace) {
      await copyFileToWorkspace(workspace, file, `handouts/imported-handouts/${safeName(file.name)}`);
      await saveHandout(workspace, text);
    }
  }

  async function handlePdfFileLoaded(file: File) {
    if (!workspace) return;
    setStatus(`已导入 PDF：${file.name}，正在准备句子切分…`);
    await copyFileToWorkspace(workspace, file, `sources/${safeName(file.name)}`);
    setWorkspaceData((data) => data ? { ...data, settings: { ...data.settings, lastLeftPdfName: file.name } } : data);
  }

  async function handleSentenceIndexReady(index: PdfSentenceIndex) {
    if (!workspace) return;
    await writeSentenceCache(workspace, index.pdfId, index);
    setStatus(`已完成句子切分：${index.pdfName} · ${index.pages.length} 页`);
    // MVP: label first page in background to prove the pipeline; Codex should extend to queue all pages with cache skipping.
    const firstUsefulPage = index.pages.find((page) => page.sentences.length > 0);
    if (firstUsefulPage) {
      try {
        const labelResult = await requestLabelPage({
          courseTitle,
          pdfName: index.pdfName,
          pageNumber: firstUsefulPage.pageNumber,
          pageText: firstUsefulPage.pageText,
          sentences: firstUsefulPage.sentences.slice(0, 18)
        });
        await writePageLabels(workspace, index.pdfId, firstUsefulPage.pageNumber, labelResult);
        setStatus(`已生成第 ${firstUsefulPage.pageNumber} 页句子标签缓存`);
      } catch (error) {
        setStatus(`句子 label 暂未完成：${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  async function finalizeCourse() {
    setSummaryOpen(true);
    setSummaryLoading(true);
    setSummaryError(null);
    setSavedSummaryPath(null);
    try {
      const result = await requestFinalSummary({ courseTitle, workspaceName: workspace?.name, entries: studyLog });
      setSummaryMarkdown(result.markdown);
    } catch (error) {
      setSummaryError(error instanceof Error ? error.message : String(error));
    } finally {
      setSummaryLoading(false);
    }
  }

  async function saveSummary() {
    if (!workspace || !summaryMarkdown.trim()) return;
    const saved = await saveExportMarkdown(workspace, summaryMarkdown);
    setSavedSummaryPath(saved);
  }

  if (!workspace || !workspaceData || !settings) {
    return <WorkspaceGate onWorkspaceReady={(next) => void openWorkspace(next)} />;
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand"><span className="brand-mark">□</span><span className="brand-title">TwinPDF</span></div>
        <input className="course-title-input" value={courseTitle} onChange={(event) => setCourseTitle(event.target.value)} aria-label="course title" />
        <span className="workspace-status">{status}</span>
        <button className="header-help" title="help">?</button>
        <button className="finalize-button" onClick={() => void finalizeCourse()}>✦ 结束课程总结</button>
      </header>

      <main className="workspace" style={{ paddingBottom: settings.assistantHeight + 28 }}>
        <PdfPane onSelectionChange={setSelected} onPdfFileLoaded={(file) => void handlePdfFileLoaded(file)} onSentenceIndexReady={(index) => void handleSentenceIndexReady(index)} />
        <HandoutPane markdown={handoutMarkdown} onChange={(markdown) => setWorkspaceData({ ...workspaceData, handoutMarkdown: markdown })} onOpenFile={(file) => void handleRightFile(file)} />
      </main>

      <AssistantDock
        courseTitle={courseTitle}
        workspaceName={workspace.name}
        selected={normalizedSelected}
        rightNoteContext={handoutMarkdown}
        recentEntries={studyLog}
        settings={settings}
        onSettingsChange={updateSettings}
        onAddEntry={addStudyLogEntry}
        onFinalize={() => void finalizeCourse()}
      />

      <FinalSummaryModal
        open={summaryOpen}
        markdown={summaryMarkdown}
        loading={summaryLoading}
        error={summaryError}
        entries={studyLog}
        savedPath={savedSummaryPath}
        onClose={() => setSummaryOpen(false)}
        onCopy={() => void navigator.clipboard.writeText(summaryMarkdown)}
        onSave={() => void saveSummary()}
      />
    </div>
  );
}
