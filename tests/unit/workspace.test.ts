import { describe, expect, it, vi } from "vitest";
import { defaultSettings } from "../../src/shared/contracts";
import { ensureWorkspaceShape, loadWorkspaceData } from "../../src/lib/workspace/fsAccess";

class MemoryFileHandle {
  constructor(private readonly directory: MemoryDirectoryHandle, public readonly name: string) {}

  async getFile() {
    const text = this.directory.files.get(this.name) ?? "";
    return { text: async () => text };
  }

  async createWritable() {
    let nextText = "";
    return {
      write: async (data: unknown) => {
        if (typeof data === "string") nextText += data;
        else if (data instanceof Blob) nextText += await data.text();
        else nextText += String(data);
      },
      close: async () => {
        this.directory.files.set(this.name, nextText);
      }
    };
  }
}

class MemoryDirectoryHandle {
  public readonly directories = new Map<string, MemoryDirectoryHandle>();
  public readonly files = new Map<string, string>();

  constructor(public readonly name: string) {}

  async getDirectoryHandle(name: string, options: { create?: boolean } = {}) {
    const existing = this.directories.get(name);
    if (existing) return existing;
    if (!options.create) throw new Error(`Missing directory: ${name}`);
    const directory = new MemoryDirectoryHandle(name);
    this.directories.set(name, directory);
    return directory;
  }

  async getFileHandle(name: string, options: { create?: boolean } = {}) {
    if (!this.files.has(name) && !options.create) throw new Error(`Missing file: ${name}`);
    if (!this.files.has(name)) this.files.set(name, "");
    return new MemoryFileHandle(this, name);
  }

  async queryPermission() {
    return "granted";
  }

  getDirectory(path: string) {
    let current: MemoryDirectoryHandle = this;
    for (const part of path.split("/").filter(Boolean)) {
      const next = current.directories.get(part);
      if (!next) throw new Error(`Missing directory: ${path}`);
      current = next;
    }
    return current;
  }

  getText(path: string) {
    const parts = path.split("/").filter(Boolean);
    const filename = parts.pop();
    if (!filename) throw new Error(`Invalid path: ${path}`);
    return this.getDirectory(parts.join("/")).files.get(filename);
  }

  setText(path: string, text: string) {
    const parts = path.split("/").filter(Boolean);
    const filename = parts.pop();
    if (!filename) throw new Error(`Invalid path: ${path}`);
    const directory = parts.length ? this.getDirectory(parts.join("/")) : this;
    directory.files.set(filename, text);
  }
}

describe("workspace file access", () => {
  it("creates the workspace directories and default files", async () => {
    const root = new MemoryDirectoryHandle("CourseA");

    await ensureWorkspaceShape(root);

    expect(root.getDirectory("sources")).toBeTruthy();
    expect(root.getDirectory("handouts/imported-handouts")).toBeTruthy();
    expect(root.getDirectory("memory")).toBeTruthy();
    expect(root.getDirectory("exports")).toBeTruthy();
    expect(root.getDirectory("cache/sentences")).toBeTruthy();
    expect(root.getDirectory("cache/page-labels")).toBeTruthy();
    expect(root.getDirectory("cache/pdf-index")).toBeTruthy();

    const manifest = JSON.parse(root.getText("twinpdf.workspace.json") ?? "{}");
    expect(manifest).toMatchObject({ app: "TwinPDF", schemaVersion: 1, workspaceName: "CourseA" });
    expect(JSON.parse(root.getText("memory/settings.json") ?? "{}")).toEqual(defaultSettings);
    expect(JSON.parse(root.getText("memory/study-log.json") ?? "null")).toEqual([]);
    expect(root.getText("handouts/current-handout.md")).toContain("# 当前讲义");
    expect(root.getText("memory/personal-subhandout.md")).toContain("# 个人子讲义");
  });

  it("backs up corrupt JSON and recreates defaults", async () => {
    const root = new MemoryDirectoryHandle("CourseB");
    await ensureWorkspaceShape(root);
    root.setText("memory/settings.json", "{ broken json");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    try {
      await ensureWorkspaceShape(root);
    } finally {
      warn.mockRestore();
    }

    expect(JSON.parse(root.getText("memory/settings.json") ?? "{}")).toEqual(defaultSettings);
    const memory = root.getDirectory("memory");
    const brokenFiles = [...memory.files.keys()].filter((name) => name.startsWith("settings.json.broken."));
    expect(brokenFiles).toHaveLength(1);
    expect(memory.files.get(brokenFiles[0])).toBe("{ broken json");
  });

  it("loads repaired workspace data from workspace files", async () => {
    const root = new MemoryDirectoryHandle("CourseC");
    await ensureWorkspaceShape(root);
    root.setText("memory/study-log.json", "not-json");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    let data: Awaited<ReturnType<typeof loadWorkspaceData>> | undefined;
    try {
      data = await loadWorkspaceData({ name: "CourseC", handle: root });
    } finally {
      warn.mockRestore();
    }

    expect(data?.manifest.workspaceName).toBe("CourseC");
    expect(data?.settings).toEqual(defaultSettings);
    expect(data?.studyLog).toEqual([]);
    expect(JSON.parse(root.getText("memory/study-log.json") ?? "null")).toEqual([]);
    const memory = root.getDirectory("memory");
    expect([...memory.files.keys()].some((name) => name.startsWith("study-log.json.broken."))).toBe(true);
  });
});
