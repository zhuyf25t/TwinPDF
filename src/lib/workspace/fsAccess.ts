import { defaultSettings, type AppSettings, type StudyLogEntry, type WorkspaceManifest, type WorkspaceRef } from "../../shared/contracts";
import { loadLastWorkspaceHandle, saveLastWorkspaceHandle } from "./handleStore";

export const WORKSPACE_DIRS = [
  "sources",
  "handouts",
  "memory",
  "exports",
  "cache",
  "cache/sentences",
  "cache/page-labels",
  "cache/pdf-index"
];

const MANIFEST_FILE = "twinpdf.workspace.json";

export async function chooseWorkspace(): Promise<WorkspaceRef> {
  if (!window.showDirectoryPicker) {
    throw new Error("当前浏览器不支持本地文件夹工作区。请使用最新版 Chrome 或 Edge，并通过 localhost 打开 TwinPDF。");
  }
  const handle = await window.showDirectoryPicker({ mode: "readwrite" });
  await ensurePermission(handle);
  await ensureWorkspaceShape(handle);
  await saveLastWorkspaceHandle(handle.name, handle);
  return { name: handle.name, handle };
}

export async function continueLastWorkspace(): Promise<WorkspaceRef | null> {
  const stored = await loadLastWorkspaceHandle();
  if (!stored?.handle) return null;
  await ensurePermission(stored.handle);
  await ensureWorkspaceShape(stored.handle);
  return { name: stored.name || stored.handle.name || "TwinPDF Workspace", handle: stored.handle };
}

export async function ensurePermission(handle: any) {
  const options = { mode: "readwrite" };
  if (typeof handle.queryPermission === "function") {
    const status = await handle.queryPermission(options);
    if (status === "granted") return;
  }
  if (typeof handle.requestPermission === "function") {
    const status = await handle.requestPermission(options);
    if (status !== "granted") throw new Error("需要本地工作区读写权限，才能保存历史数据。");
  }
}

export async function ensureWorkspaceShape(root: any) {
  for (const dir of WORKSPACE_DIRS) await getDirectory(root, dir, true);
  const manifest = await readJson<WorkspaceManifest | null>(root, MANIFEST_FILE, null);
  const now = new Date().toISOString();
  if (!manifest) {
    await writeJson(root, MANIFEST_FILE, {
      schemaVersion: 1,
      app: "TwinPDF",
      workspaceName: root.name || "TwinPDF Workspace",
      createdAt: now,
      updatedAt: now
    } satisfies WorkspaceManifest);
  }
  if (!(await exists(root, "memory/settings.json"))) await writeJson(root, "memory/settings.json", defaultSettings);
  if (!(await exists(root, "memory/study-log.json"))) await writeJson(root, "memory/study-log.json", []);
  if (!(await exists(root, "memory/personal-subhandout.md"))) await writeText(root, "memory/personal-subhandout.md", "# 个人子讲义\n\n");
}

export async function loadWorkspaceData(workspace: WorkspaceRef) {
  const manifest = await readJson<WorkspaceManifest>(workspace.handle, MANIFEST_FILE, {
    schemaVersion: 1,
    app: "TwinPDF",
    workspaceName: workspace.name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  const settings = await readJson<AppSettings>(workspace.handle, "memory/settings.json", defaultSettings);
  const studyLog = await readJson<StudyLogEntry[]>(workspace.handle, "memory/study-log.json", []);
  const handoutMarkdown = await readText(workspace.handle, "handouts/current-handout.md", sampleHandout());
  return { manifest, settings: { ...defaultSettings, ...settings }, studyLog, handoutMarkdown };
}

export async function saveSettings(workspace: WorkspaceRef, settings: AppSettings) {
  await writeJson(workspace.handle, "memory/settings.json", settings);
}

export async function saveStudyLog(workspace: WorkspaceRef, entries: StudyLogEntry[]) {
  await writeJson(workspace.handle, "memory/study-log.json", entries);
  const md = buildPersonalSubhandout(entries);
  await writeText(workspace.handle, "memory/personal-subhandout.md", md);
}

export async function saveHandout(workspace: WorkspaceRef, markdown: string) {
  await writeText(workspace.handle, "handouts/current-handout.md", markdown);
}

export async function saveExportMarkdown(workspace: WorkspaceRef, markdown: string) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `exports/personal-sublecture-${stamp}.md`;
  await writeText(workspace.handle, filename, markdown);
  return filename;
}

export async function copyFileToWorkspace(workspace: WorkspaceRef, file: File, targetPath: string) {
  const fileHandle = await getFileHandle(workspace.handle, targetPath, true);
  const writable = await fileHandle.createWritable();
  await writable.write(file);
  await writable.close();
}

export async function writeSentenceCache(workspace: WorkspaceRef, pdfId: string, data: unknown) {
  await writeJson(workspace.handle, `cache/sentences/${safeName(pdfId)}.json`, data);
}

export async function writePageLabels(workspace: WorkspaceRef, pdfId: string, pageNumber: number, data: unknown) {
  const dir = `cache/page-labels/${safeName(pdfId)}`;
  await getDirectory(workspace.handle, dir, true);
  await writeJson(workspace.handle, `${dir}/page-${String(pageNumber).padStart(4, "0")}.json`, data);
}

export async function readText(root: any, path: string, fallback = "") {
  try {
    const handle = await getFileHandle(root, path, false);
    const file = await handle.getFile();
    return await file.text();
  } catch {
    return fallback;
  }
}

export async function writeText(root: any, path: string, text: string) {
  const handle = await getFileHandle(root, path, true);
  const writable = await handle.createWritable();
  await writable.write(text);
  await writable.close();
}

export async function readJson<T>(root: any, path: string, fallback: T): Promise<T> {
  try {
    const text = await readText(root, path, "");
    if (!text.trim()) return fallback;
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

export async function writeJson(root: any, path: string, data: unknown) {
  await writeText(root, path, JSON.stringify(data, null, 2));
}

async function exists(root: any, path: string) {
  try {
    await getFileHandle(root, path, false);
    return true;
  } catch {
    return false;
  }
}

async function getDirectory(root: any, path: string, create: boolean) {
  const parts = path.split("/").filter(Boolean);
  let current = root;
  for (const part of parts) current = await current.getDirectoryHandle(part, { create });
  return current;
}

async function getFileHandle(root: any, path: string, create: boolean) {
  const parts = path.split("/").filter(Boolean);
  const filename = parts.pop();
  if (!filename) throw new Error(`Invalid file path: ${path}`);
  const dir = parts.length ? await getDirectory(root, parts.join("/"), create) : root;
  return dir.getFileHandle(filename, { create });
}

function sampleHandout() {
  return `# 讲义：变分推断与证据下界（ELBO）\n\n## 1. 核心思想\n在复杂模型中，精确推断通常是不可行的。变分推断通过引入一个近似分布 $q(z)$ 来逼近真实后验 $p(z|x)$，并将推断问题转化为优化问题。\n\n> **证据下界（ELBO）** 提供了一个可计算的目标函数，我们可以对 $q(z)$ 进行优化以最大化它。\n\n## 2. 证据下界（ELBO）\n对任意分布 $q(z)$，有：\n\n$$\n\\log p(x) \\ge \\mathbb{E}_{q(z)}[\\log p(x,z)-\\log q(z)] = \\mathcal{L}(q)\n$$\n\n- $\\log p(x)$：对数证据。\n- $\\mathcal{L}(q)$：证据下界。\n- 最大化 $\\mathcal{L}(q)$ 可以让 $q(z)$ 更接近真实后验。\n`;
}

function buildPersonalSubhandout(entries: StudyLogEntry[]) {
  const lines = ["# 个人子讲义", "", `更新时间：${new Date().toLocaleString()}`, ""];
  for (const [index, entry] of entries.entries()) {
    lines.push(`## ${index + 1}. ${entry.pageLabel || "未知页码"} · ${entry.question || "AI 解释"}`);
    lines.push("");
    lines.push("**原文**");
    lines.push("");
    lines.push(`> ${entry.selectedText}`);
    lines.push("");
    lines.push("**浏览器翻译区内容**");
    lines.push("");
    lines.push(`> ${entry.translationSurface}`);
    lines.push("");
    lines.push("**AI 回答**");
    lines.push("");
    lines.push(entry.answer);
    lines.push("");
  }
  return lines.join("\n");
}

export function safeName(input: string) {
  return input.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 100) || "untitled";
}
