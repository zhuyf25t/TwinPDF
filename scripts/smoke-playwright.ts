import { chromium, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const appUrl = process.env.SMOKE_URL || "http://localhost:9999";
const courseDir = "C:\\Users\\Laptop\\Desktop\\网络学堂\\[11] 计算机系统概论\\lec8";
const leftPdf = path.join(courseDir, "lec08-vm-malloc.pdf");
const rightPdf = path.join(courseDir, "lec08_vm_malloc_super_detailed_guide.pdf");
const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

if (!fs.existsSync(leftPdf) || !fs.existsSync(rightPdf)) {
  throw new Error(`Missing smoke PDFs in ${courseDir}`);
}

async function main() {
  const browser = await chromium.launch({
    executablePath: fs.existsSync(edgePath) ? edgePath : undefined,
    headless: true
  });

  try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  await page.addInitScript({ content: workspaceStubSource });
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  await page.addScriptTag({ content: workspaceStubSource });

  await page.locator(".workspace-gate .primary-button").click();
  await expect(page.locator(".app-shell")).toBeVisible({ timeout: 15_000 });

  await page.locator(".pdf-pane input[type=file]").setInputFiles(leftPdf);
  await expect(page.locator(".file-name").first()).toContainText("lec08-vm-malloc.pdf", { timeout: 15_000 });
  await page.waitForSelector(".pdf-text-layer span", { timeout: 60_000 });
  await page.waitForFunction(() => {
    const text = document.querySelector(".status-strip")?.textContent || "";
    return /句子切分完成|PDF 准备完成|后台标注/.test(text);
  }, undefined, { timeout: 120_000 });

  await page.locator(".handout-pane input[type=file]").setInputFiles(rightPdf);
  await expect(page.locator(".handout-content")).toContainText("Introduction to Computer Systems", { timeout: 120_000 });

  await selectFirstPdfText(page);
  await page.waitForFunction(() => {
    const text = document.querySelector(".selected-text")?.textContent || "";
    return text.trim().length > 0 && !text.includes("在左侧英文 PDF");
  }, undefined, { timeout: 10_000 });
  const selectedText = await page.locator(".selected-text").innerText({ timeout: 10_000 });
  if (!selectedText.trim()) throw new Error("Selected text zone did not update.");

  await expect(page.locator(".translation-surface")).toContainText(selectedText.trim().slice(0, 12));
  const translationAttrs = await page.locator(".translation-surface").evaluate((node) => ({
    lang: node.getAttribute("lang"),
    translate: node.getAttribute("translate")
  }));
  if (translationAttrs.lang !== "en" || translationAttrs.translate !== "yes") {
    throw new Error("Translation surface is not ordinary translatable HTML.");
  }

  const questionBox = page.locator(".ask-row textarea");
  await questionBox.fill("What is the relation to malloc?");
  await page.locator(".send-button").click();
  await expect(page.locator(".answer-text")).toContainText("这段原文", { timeout: 30_000 });
  await expect(questionBox).toHaveValue("");

  await page.locator(".save-chip").click();
  await expect(page.locator(".success-pill").first()).toContainText("加入成功", { timeout: 10_000 });

  await page.locator(".tiny-lock").nth(0).click();
  await page.locator(".tiny-lock").nth(1).click();
  await questionBox.fill("Explain this in one sentence.");
  await page.locator(".send-button").click();
  await expect(questionBox).toHaveValue("Explain this in one sentence.", { timeout: 30_000 });
  await expect(page.locator(".success-pill").first()).toContainText("加入成功", { timeout: 30_000 });

  await page.locator(".course-summary-mini").click();
  await expect(page.locator(".summary-modal")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(".summary-markdown")).toContainText("原始问答日志", { timeout: 30_000 });
  await page.locator(".summary-footer .primary-button").click();
  await expect(page.locator(".summary-footer")).toContainText("已保存", { timeout: 10_000 });

  const dump = await page.evaluate(() => (window as any).__twinpdfWorkspaceDump?.());
  assertWorkspaceFile(dump, "memory/study-log.json");
  assertWorkspaceFile(dump, "cache/sentences/");
  assertWorkspaceFile(dump, "exports/personal-sublecture-");

  console.log(JSON.stringify({
    ok: true,
    appUrl,
    leftPdf: path.basename(leftPdf),
    rightPdf: path.basename(rightPdf),
    workspaceFiles: dump.files.length,
    selectedText: selectedText.slice(0, 80)
  }, null, 2));
  } finally {
    await browser.close();
  }
}

async function selectFirstPdfText(page: Page) {
  await page.evaluate(() => {
    const spans = [...document.querySelectorAll(".pdf-text-layer span")] as HTMLElement[];
    const span = spans.find((item) => (item.textContent || "").trim().length > 8);
    if (!span) throw new Error("No selectable PDF text span found.");
    const range = document.createRange();
    range.selectNodeContents(span);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    document.querySelector(".pdf-page-wrap")?.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  });
}

function assertWorkspaceFile(dump: { files?: string[] } | undefined, needle: string) {
  if (!dump?.files?.some((file) => file.includes(needle))) {
    throw new Error(`Workspace smoke file missing: ${needle}`);
  }
}

const workspaceStubSource = String.raw`
(() => {
  if (window.__twinpdfWorkspaceRoot) return;

  class MemoryFileHandle {
    constructor(directory, name) {
      this.kind = "file";
      this.directory = directory;
      this.name = name;
    }

    async getFile() {
      return this.directory.files.get(this.name) || new File([""], this.name);
    }

    async createWritable() {
      const chunks = [];
      const directory = this.directory;
      const name = this.name;
      return {
        write: async (data) => {
          chunks.push(data);
        },
        close: async () => {
          directory.files.set(name, new File(chunks, name));
        }
      };
    }
  }

  class MemoryDirectoryHandle {
    constructor(name) {
      this.kind = "directory";
      this.name = name;
      this.directories = new Map();
      this.files = new Map();
    }

    async getDirectoryHandle(name, options = {}) {
      const existing = this.directories.get(name);
      if (existing) return existing;
      if (!options.create) throw new Error("Missing directory: " + name);
      const directory = new MemoryDirectoryHandle(name);
      this.directories.set(name, directory);
      return directory;
    }

    async getFileHandle(name, options = {}) {
      if (!this.files.has(name) && !options.create) throw new Error("Missing file: " + name);
      if (!this.files.has(name)) this.files.set(name, new File([""], name));
      return new MemoryFileHandle(this, name);
    }

    async queryPermission() {
      return "granted";
    }

    async requestPermission() {
      return "granted";
    }

    dump(prefix = "") {
      const here = [...this.files.keys()].map((name) => prefix + name);
      const nested = [...this.directories.entries()].flatMap(([name, dir]) => dir.dump(prefix + name + "/"));
      return [...here, ...nested];
    }
  }

  const root = new MemoryDirectoryHandle("TwinPDF-Smoke");
  const idbStore = new Map();
  const db = {
    createObjectStore: () => undefined,
    transaction: () => {
      const tx = {
        objectStore: () => ({
          put: (value, key) => idbStore.set(key, value),
          delete: (key) => idbStore.delete(key),
          get: (key) => {
            const request = {};
            setTimeout(() => {
              request.result = idbStore.get(key);
              request.onsuccess && request.onsuccess();
            }, 0);
            return request;
          }
        }),
        oncomplete: null,
        onerror: null,
        error: null
      };
      setTimeout(() => tx.oncomplete && tx.oncomplete(), 0);
      return tx;
    },
    close: () => undefined
  };

  Object.defineProperty(window, "showDirectoryPicker", {
    value: async () => root,
    writable: true,
    configurable: true
  });
  Object.defineProperty(window, "indexedDB", {
    value: {
      open: () => {
        const request = { result: db, error: null };
        setTimeout(() => {
          request.onupgradeneeded && request.onupgradeneeded();
          request.onsuccess && request.onsuccess();
        }, 0);
        return request;
      }
    },
    writable: true,
    configurable: true
  });

  window.__twinpdfWorkspaceRoot = root;
  window.__twinpdfWorkspaceDump = () => ({ files: root.dump() });
})();
`;

await main();
