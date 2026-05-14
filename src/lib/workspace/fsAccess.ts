import { defaultSettings, type AppSettings, type StudyLogEntry, type WorkspaceManifest, type WorkspaceRef } from "../../shared/contracts";
import { buildPersonalSubhandoutMarkdown } from "../markdown";
import { loadLastWorkspaceHandle, saveLastWorkspaceHandle } from "./handleStore";

export const WORKSPACE_DIRS = [
  "sources",
  "handouts",
  "handouts/imported-handouts",
  "memory",
  "exports",
  "cache",
  "cache/sentences",
  "cache/page-labels",
  "cache/pdf-index"
];

const MANIFEST_FILE = "twinpdf.workspace.json";
const SETTINGS_FILE = "memory/settings.json";
const STUDY_LOG_FILE = "memory/study-log.json";
const SESSION_LOG_FILE = "memory/session-log.jsonl";
const PERSONAL_SUBHANDOUT_FILE = "memory/personal-subhandout.md";
const CURRENT_HANDOUT_FILE = "handouts/current-handout.md";

type JsonReadOptions<T> = {
  repairCorrupt?: boolean;
  validate?: (value: unknown) => value is T;
};

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
    if (status !== "granted") throw new Error("需要本地工作区读写权限，TwinPDF 才能保存你的学习记录。");
  }
}

export async function ensureWorkspaceShape(root: any) {
  for (const dir of WORKSPACE_DIRS) await getDirectory(root, dir, true);

  await ensureJson(root, MANIFEST_FILE, createManifest(root.name || "TwinPDF Workspace"), isWorkspaceManifest);
  await ensureJson(root, SETTINGS_FILE, defaultSettings, isAppSettings);
  await ensureJson(root, STUDY_LOG_FILE, [], Array.isArray);
  await ensureTextFile(root, SESSION_LOG_FILE, "");
  await ensureTextFile(root, CURRENT_HANDOUT_FILE, sampleHandout());
  await ensureTextFile(root, PERSONAL_SUBHANDOUT_FILE, buildPersonalSubhandoutMarkdown([], { workspaceName: root.name }));
}

export async function loadWorkspaceData(workspace: WorkspaceRef) {
  const manifest = await readJson<WorkspaceManifest>(
    workspace.handle,
    MANIFEST_FILE,
    createManifest(workspace.name),
    { validate: isWorkspaceManifest }
  );
  const settings = await readJson<AppSettings>(
    workspace.handle,
    SETTINGS_FILE,
    defaultSettings,
    { validate: isAppSettings }
  );
  const studyLog = await readJson<StudyLogEntry[]>(
    workspace.handle,
    STUDY_LOG_FILE,
    [],
    { validate: Array.isArray }
  );
  const handoutMarkdown = await readText(workspace.handle, CURRENT_HANDOUT_FILE, sampleHandout());
  return { manifest, settings: { ...defaultSettings, ...settings }, studyLog, handoutMarkdown };
}

export async function saveSettings(workspace: WorkspaceRef, settings: AppSettings) {
  await writeJson(workspace.handle, SETTINGS_FILE, settings);
}

export async function saveStudyLog(workspace: WorkspaceRef, entries: StudyLogEntry[]) {
  await writeJson(workspace.handle, STUDY_LOG_FILE, entries);
  const md = buildPersonalSubhandoutMarkdown(entries, { workspaceName: workspace.name });
  await writeText(workspace.handle, PERSONAL_SUBHANDOUT_FILE, md);
}

export async function saveHandout(workspace: WorkspaceRef, markdown: string) {
  await writeText(workspace.handle, CURRENT_HANDOUT_FILE, markdown);
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
    return await readExistingText(root, path);
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

export async function readJson<T>(root: any, path: string, fallback: T, options: JsonReadOptions<T> = {}): Promise<T> {
  let text: string;
  try {
    text = await readExistingText(root, path);
  } catch {
    return fallback;
  }

  try {
    if (!text.trim()) throw new Error("Empty JSON file.");
    const parsed = JSON.parse(text) as unknown;
    if (options.validate && !options.validate(parsed)) throw new Error("Unexpected JSON shape.");
    return parsed as T;
  } catch (error) {
    if (options.repairCorrupt !== false) {
      await preserveBrokenFile(root, path, text).catch((backupError) => {
        console.warn(`TwinPDF 无法备份损坏的工作区文件 ${path}`, backupError);
      });
      await writeJson(root, path, fallback);
      const reason = error instanceof Error ? error.message : String(error);
      console.warn(`TwinPDF 已修复损坏的工作区文件 ${path}：${reason}`);
    }
    return fallback;
  }
}

export async function writeJson(root: any, path: string, data: unknown) {
  await writeText(root, path, JSON.stringify(data, null, 2));
}

async function ensureJson<T>(root: any, path: string, fallback: T, validate: (value: unknown) => value is T) {
  if (!(await exists(root, path))) {
    await writeJson(root, path, fallback);
    return;
  }
  await readJson(root, path, fallback, { validate });
}

async function ensureTextFile(root: any, path: string, fallback: string) {
  if (!(await exists(root, path))) await writeText(root, path, fallback);
}

async function readExistingText(root: any, path: string) {
  const handle = await getFileHandle(root, path, false);
  const file = await handle.getFile();
  return await file.text();
}

async function preserveBrokenFile(root: any, path: string, text: string) {
  const brokenPath = buildBrokenPath(path);
  await writeText(root, brokenPath, text);
}

function buildBrokenPath(path: string) {
  const parts = path.split("/").filter(Boolean);
  const filename = parts.pop();
  if (!filename) throw new Error(`Invalid file path: ${path}`);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const brokenName = `${filename}.broken.${stamp}`;
  return [...parts, brokenName].join("/");
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

function createManifest(workspaceName: string): WorkspaceManifest {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    app: "TwinPDF",
    workspaceName,
    createdAt: now,
    updatedAt: now
  };
}

function isWorkspaceManifest(value: unknown): value is WorkspaceManifest {
  if (!value || typeof value !== "object") return false;
  const manifest = value as Partial<WorkspaceManifest>;
  return manifest.schemaVersion === 1
    && manifest.app === "TwinPDF"
    && typeof manifest.workspaceName === "string"
    && typeof manifest.createdAt === "string"
    && typeof manifest.updatedAt === "string";
}

function isAppSettings(value: unknown): value is AppSettings {
  if (!value || typeof value !== "object") return false;
  const settings = value as Partial<AppSettings>;
  return typeof settings.assistantHeight === "number"
    && (settings.assistantMode === undefined || settings.assistantMode === "collapsed" || settings.assistantMode === "compact" || settings.assistantMode === "expanded")
    && typeof settings.inputLocked === "boolean"
    && typeof settings.autoAddLocked === "boolean"
    && (settings.assistantX === undefined || typeof settings.assistantX === "number")
    && (settings.assistantY === undefined || typeof settings.assistantY === "number")
    && (settings.lastLeftPdfName === undefined || typeof settings.lastLeftPdfName === "string")
    && (settings.lastRightHandoutName === undefined || typeof settings.lastRightHandoutName === "string");
}

function sampleHandout() {
  return [
    "# 当前讲义",
    "",
    "这里保存右侧中文讲义。导入 Markdown 后，TwinPDF 会把当前讲义写入 `handouts/current-handout.md`。",
    "",
    "## 课堂记录",
    "",
    "- 可以在这里整理重点、公式和自己的理解。"
  ].join("\n");
}

export function safeName(input: string) {
  return input.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 100) || "untitled";
}
