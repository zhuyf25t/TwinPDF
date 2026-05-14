import { chromium, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const appUrl = process.env.SMOKE_URL || "http://localhost:9999";
const screenshotDir = process.env.SMOKE_SCREENSHOT_DIR || "";
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

  await expect(page.locator(".left-pdf-pane.pdf-pane")).toBeVisible();
  await expect(page.locator(".right-pdf-pane.pdf-pane")).toBeVisible();

  await page.locator(".left-pdf-pane input[type=file]").setInputFiles(leftPdf);
  await expect(page.locator(".left-pdf-pane .file-name")).toContainText("lec08-vm-malloc.pdf", { timeout: 15_000 });
  await page.waitForSelector(".left-pdf-pane .pdf-text-layer span", { timeout: 60_000 });
  await page.waitForFunction(() => {
    const text = document.querySelector(".left-pdf-pane .status-strip")?.textContent || "";
    return /句子切分完成|PDF 准备完成|后台标注/.test(text);
  }, undefined, { timeout: 120_000 });

  await page.locator(".right-pdf-pane input[type=file]").setInputFiles(rightPdf);
  await expect(page.locator(".right-pdf-pane .file-name")).toContainText("lec08_vm_malloc_super_detailed_guide.pdf", { timeout: 15_000 });
  await page.waitForSelector(".right-pdf-pane .pdf-text-layer span", { timeout: 60_000 });
  await expect(page.locator(".right-pdf-pane .page-pill").first()).toContainText("/ 102", { timeout: 15_000 });
  await assertRightPdfCanvas(page);
  await maybeScreenshot(page, "01-workspace-loaded.png");

  await selectFirstPdfText(page);
  await expect(page.locator(".assistant-title")).toContainText("已选中", { timeout: 10_000 });
  await page.locator(".dock-icon-button").click();
  await page.waitForTimeout(120);
  await page.waitForFunction(() => {
    const text = document.querySelector(".selected-text")?.textContent || "";
    return text.trim().length > 0 && !text.includes("在左侧英文 PDF");
  }, undefined, { timeout: 10_000 });
  const selectedText = await page.locator(".selected-text").innerText({ timeout: 10_000 });
  if (!selectedText.trim()) throw new Error("Selected text zone did not update.");

  await expect(page.locator(".selected-text")).toContainText(selectedText.trim().slice(0, 12));
  await assertDockGeometry(page);
  await assertWorkspaceSurface(page);
  await assertAssistantLayout(page);
  const translationAttrs = await page.locator(".selected-text").evaluate((node) => ({
    lang: node.getAttribute("lang"),
    translate: node.getAttribute("translate")
  }));
  if (translationAttrs.lang !== "en" || translationAttrs.translate !== "yes") {
    throw new Error("Translation surface is not ordinary translatable HTML.");
  }
  await exerciseDockModes(page);
  await maybeScreenshot(page, "02-dock-modes.png");

  const questionBox = page.locator(".ask-row textarea");
  await questionBox.fill("What is the relation to malloc?");
  await page.locator(".send-button").click();
  await expect(page.locator(".answer-text")).toContainText("这段原文", { timeout: 30_000 });
  await expect(questionBox).toHaveValue("");
  await assertDockGeometry(page);
  await assertWorkspaceSurface(page);
  await assertAssistantLayout(page);
  await maybeScreenshot(page, "03-after-answer.png");

  await page.locator(".save-chip").click();
  await expect(page.locator(".success-pill").first()).toContainText("加入成功", { timeout: 10_000 });

  await page.locator(".tiny-lock").nth(0).click();
  await page.locator(".tiny-lock").nth(1).click();
  await questionBox.fill("Explain this in one sentence.");
  await page.locator(".send-button").click();
  await expect(questionBox).toHaveValue("Explain this in one sentence.", { timeout: 30_000 });
  await expect(page.locator(".success-pill").first()).toContainText("加入成功", { timeout: 30_000 });

  if (!((await page.locator(".assistant-dock").getAttribute("class")) || "").includes("dock-collapsed")) {
    await page.locator(".dock-icon-button").click();
    await page.waitForTimeout(120);
  }
  await page.setViewportSize({ width: 390, height: 780 });
  await assertDockGeometry(page, { mobile: true });
  await assertWorkspaceSurface(page);
  await maybeScreenshot(page, "04-mobile-dock.png");
  await page.setViewportSize({ width: 1440, height: 950 });

  await page.locator(".finalize-button").click();
  await expect(page.locator(".summary-modal")).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(".summary-markdown")).toContainText("本节个人子讲义", { timeout: 30_000 });
  await expect(page.locator(".summary-markdown")).toContainText("课程与文件信息", { timeout: 30_000 });
  await expect(page.locator(".summary-markdown")).toContainText("仍需回看页码", { timeout: 30_000 });
  await expect(page.locator(".summary-markdown")).toContainText("原始问答日志", { timeout: 30_000 });
  await maybeScreenshot(page, "05-summary-modal.png");
  await page.locator(".summary-footer .primary-button").click();
  await expect(page.locator(".summary-footer")).toContainText("已保存", { timeout: 10_000 });

  const dump = await page.evaluate(() => (window as any).__twinpdfWorkspaceDump?.());
  assertWorkspaceFile(dump, "sources/lec08-vm-malloc.pdf");
  assertWorkspaceFile(dump, "handouts/imported-handouts/lec08_vm_malloc_super_detailed_guide.pdf");
  assertWorkspaceFile(dump, "memory/study-log.json");
  assertWorkspaceFile(dump, "memory/personal-subhandout.md");
  assertWorkspaceFile(dump, "cache/sentences/");
  assertWorkspaceFile(dump, "cache/page-labels/");
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
    const spans = ([...document.querySelectorAll(".left-pdf-pane .pdf-text-layer span")] as HTMLElement[])
      .filter((item) => (item.textContent || "").trim().length > 0);
    const firstIndex = spans.findIndex((item) => (item.textContent || "").trim().length > 6);
    if (firstIndex < 0) throw new Error("No selectable PDF text span found.");
    const chosen: HTMLElement[] = [];
    let selectedLength = 0;
    for (const span of spans.slice(firstIndex)) {
      chosen.push(span);
      selectedLength += (span.textContent || "").trim().length;
      if (selectedLength >= 80 || chosen.length >= 10) break;
    }
    const first = chosen[0];
    const last = chosen[chosen.length - 1];
    const range = document.createRange();
    range.setStart(first.firstChild || first, 0);
    range.setEnd(last.firstChild || last, (last.textContent || "").length);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    document.querySelector(".left-pdf-pane .pdf-page-wrap")?.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  });
}

function assertWorkspaceFile(dump: { files?: string[] } | undefined, needle: string) {
  if (!dump?.files?.some((file) => file.includes(needle))) {
    throw new Error(`Workspace smoke file missing: ${needle}`);
  }
}

async function assertRightPdfCanvas(page: Page) {
  const box = await page.locator(".right-pdf-pane canvas").boundingBox();
  if (!box || box.width <= 0 || box.height <= 0) {
    throw new Error(`Right PDF canvas did not render with usable dimensions: ${JSON.stringify(box)}`);
  }
  const textCount = await page.locator(".right-pdf-pane .pdf-text-layer span").count();
  if (textCount <= 0) {
    throw new Error("Right PDF text layer did not render any text spans.");
  }
}

async function assertDockGeometry(page: Page, options: { mobile?: boolean } = {}) {
  const box = await page.locator(".assistant-dock").boundingBox();
  const viewport = page.viewportSize();
  if (!box || !viewport) throw new Error("Assistant dock geometry unavailable.");
  const dockClass = await page.locator(".assistant-dock").getAttribute("class");
  const collapsed = Boolean(dockClass?.includes("dock-collapsed"));
  const position = await page.locator(".assistant-dock").evaluate((node) => window.getComputedStyle(node).position);
  if (position !== "fixed") {
    throw new Error(`Assistant dock must be fixed overlay, got ${position}.`);
  }
  const right = box.x + box.width;
  const bottom = box.y + box.height;
  if (box.x < -1 || box.y < -1 || right > viewport.width + 1 || bottom > viewport.height + 1) {
    throw new Error(`Assistant dock is outside viewport: ${JSON.stringify({ box, viewport })}`);
  }
  const bottomGap = viewport.height - bottom;
  const expectedGap = options.mobile ? 12 : 18;
  if (Math.abs(bottomGap - expectedGap) > 4) {
    throw new Error(`Assistant dock bottom gap out of target range: ${bottomGap}px`);
  }
  const ratio = box.width / viewport.width;
  if (!options.mobile && (ratio < 0.2 || ratio > 0.42)) {
    throw new Error(`Assistant dock width ratio out of target range: ${ratio.toFixed(2)}`);
  }
  if (options.mobile && ratio < 0.82) {
    throw new Error(`Mobile assistant dock should use nearly full width: ${ratio.toFixed(2)}`);
  }
  const maxHeight = viewport.height * 0.55 + 2;
  if (box.height > maxHeight) {
    throw new Error(`Assistant dock too tall: ${box.height}px`);
  }
  if (collapsed && box.height > 62) {
    throw new Error(`Collapsed assistant dock is too tall: ${box.height}px`);
  }
  if (!options.mobile && !collapsed && box.height < 220) {
    throw new Error(`Assistant dock too short: ${box.height}px`);
  }
  await assertDockDoesNotBlockPrimaryReading(page);
}

async function exerciseDockModes(page: Page) {
  if ((await page.locator(".assistant-dock").getAttribute("class"))?.includes("dock-collapsed")) {
    await page.locator(".dock-icon-button").click();
    await page.waitForTimeout(120);
  }

  const compactBox = await page.locator(".assistant-dock").boundingBox();
  const workspaceBox = await page.locator(".workspace").boundingBox();
  if (!compactBox) throw new Error("Missing compact dock.");
  if (!workspaceBox) throw new Error("Missing workspace.");

  await page.locator(".dock-toggle-button").click();
  await page.waitForTimeout(120);
  await assertWorkspaceHeightStable(page, workspaceBox.height);
  const expandedBox = await page.locator(".assistant-dock").boundingBox();
  if (!expandedBox || expandedBox.height < compactBox.height + 30) {
    throw new Error("Expanded assistant dock did not grow enough.");
  }
  await assertDockGeometry(page);
  await assertAssistantLayout(page);

  const handleBox = await page.locator(".dock-resize-handle").boundingBox();
  if (!handleBox) throw new Error("Missing assistant resize handle.");
  const handleCursor = await page.locator(".dock-resize-handle").evaluate((node) => window.getComputedStyle(node).cursor);
  if (handleCursor !== "ns-resize") {
    throw new Error(`Assistant resize handle cursor should be ns-resize, got ${handleCursor}.`);
  }
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y - 55);
  await page.mouse.up();
  await page.waitForTimeout(120);
  await assertDockGeometry(page);
  await assertWorkspaceHeightStable(page, workspaceBox.height);

  await page.locator(".dock-toggle-button").click();
  await page.waitForTimeout(120);
  await assertDockGeometry(page);
  await assertWorkspaceHeightStable(page, workspaceBox.height);
  await assertAssistantLayout(page);

  await page.locator(".dock-icon-button").click();
  await page.waitForTimeout(120);
  const collapsedBox = await page.locator(".assistant-dock").boundingBox();
  if (!collapsedBox || collapsedBox.height > 60) {
    throw new Error(`Collapsed assistant dock is too tall: ${collapsedBox?.height}`);
  }
  await assertWorkspaceHeightStable(page, workspaceBox.height);

  await page.locator(".dock-icon-button").click();
  await page.waitForTimeout(120);
  await assertDockGeometry(page);
  await assertWorkspaceHeightStable(page, workspaceBox.height);
  await assertAssistantLayout(page);
}

async function assertWorkspaceHeightStable(page: Page, expectedHeight: number) {
  const box = await page.locator(".workspace").boundingBox();
  if (!box) throw new Error("Workspace geometry unavailable.");
  if (Math.abs(box.height - expectedHeight) > 2) {
    throw new Error(`Workspace height changed when assistant moved: before=${expectedHeight}, after=${box.height}`);
  }
}

async function assertDockDoesNotBlockPrimaryReading(page: Page) {
  const issues = await page.evaluate(() => {
    const dock = document.querySelector(".assistant-dock")?.getBoundingClientRect();
    const leftToolbar = document.querySelector(".left-pdf-pane .pane-toolbar")?.getBoundingClientRect();
    const rightToolbar = document.querySelector(".right-pdf-pane .pane-toolbar")?.getBoundingClientRect();
    const leftPage = document.querySelector(".left-pdf-pane .pdf-page-wrap")?.getBoundingClientRect();
    const rightPage = document.querySelector(".right-pdf-pane .pdf-page-wrap")?.getBoundingClientRect();
    const problems: string[] = [];
    if (!dock) return ["missing assistant dock"];

    for (const [name, box] of [["left toolbar", leftToolbar], ["right toolbar", rightToolbar]] as const) {
      if (box && intersects(dock, box)) problems.push(`dock overlaps ${name}`);
    }

    const middleLine = window.innerHeight * 0.5;
    if (dock.top < middleLine) {
      problems.push(`dock reaches too high: ${Math.round(dock.top)}px`);
    }

    for (const [name, box] of [["left page", leftPage], ["right page", rightPage]] as const) {
      if (!box) continue;
      const safeTopHalf = {
        left: box.left,
        right: box.right,
        top: box.top,
        bottom: box.top + box.height * 0.52
      };
      if (intersects(dock, safeTopHalf)) problems.push(`dock overlaps upper half of ${name}`);
    }
    return problems;

    function intersects(a: DOMRect, b: { left: number; right: number; top: number; bottom: number }) {
      return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    }
  });

  if (issues.length) {
    throw new Error(`Assistant dock obstruction issues: ${issues.join("; ")}`);
  }
}

async function assertWorkspaceSurface(page: Page) {
  const issues = await page.evaluate(() => {
    const viewportHeight = window.innerHeight;
    const app = document.querySelector(".app-shell")?.getBoundingClientRect();
    const workspace = document.querySelector(".workspace")?.getBoundingClientRect();
    const panes = [...document.querySelectorAll(".pane")].map((node) => node.getBoundingClientRect());
    const problems: string[] = [];

    if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 2) {
      problems.push("document has horizontal scroll");
    }
    if (!app || Math.abs(app.height - viewportHeight) > 2) {
      problems.push("app shell does not fill viewport height");
    }
    if (!workspace || Math.abs(workspace.bottom - viewportHeight) > 2) {
      problems.push("workspace does not fill remaining viewport height");
    }
    if (panes.length < 2) {
      problems.push("missing left/right panes");
    }
    if (workspace && window.innerWidth > 1119 && panes.length >= 2) {
      const workspaceStyle = window.getComputedStyle(document.querySelector(".workspace") as Element);
      const verticalPadding = parseFloat(workspaceStyle.paddingTop) + parseFloat(workspaceStyle.paddingBottom);
      const expectedPaneHeight = workspace.height - verticalPadding;
      if (panes.some((pane) => Math.abs(pane.height - expectedPaneHeight) > 4)) {
        problems.push("pane height is not aligned with workspace");
      }
    }
    return problems;
  });

  if (issues.length) {
    throw new Error(`Workspace layout issues: ${issues.join("; ")}`);
  }
}

async function assertAssistantLayout(page: Page) {
  const issues = await page.evaluate(() => {
    const selectors = [".assistant-header", ".mode-row", ".assistant-grid", ".ask-row"];
    const dock = document.querySelector(".assistant-dock")?.getBoundingClientRect();
    const boxes = selectors.map((selector) => ({
      selector,
      box: document.querySelector(selector)?.getBoundingClientRect()
    }));
    const problems: string[] = [];
    if (!dock) return ["missing .assistant-dock"];
    for (const item of boxes) {
      if (!item.box) {
        problems.push(`missing ${item.selector}`);
        continue;
      }
      if (item.box.left < dock.left - 1 || item.box.right > dock.right + 1 || item.box.top < dock.top - 1 || item.box.bottom > dock.bottom + 1) {
        problems.push(`${item.selector} outside dock`);
      }
    }
    for (let index = 1; index < boxes.length; index += 1) {
      const previous = boxes[index - 1].box;
      const current = boxes[index].box;
      if (previous && current && current.top < previous.bottom - 3) {
        problems.push(`${boxes[index - 1].selector} overlaps ${boxes[index].selector}`);
      }
    }

    const overflowSelectors = [".tiny-lock", ".mode-chip", ".success-pill", ".send-button", ".finalize-button", ".text-tool-button"];
    for (const node of [...document.querySelectorAll(overflowSelectors.join(","))] as HTMLElement[]) {
      const style = window.getComputedStyle(node);
      if (style.display === "none" || node.offsetParent === null) continue;
      if (node.scrollWidth > node.clientWidth + 2) {
        problems.push(`text overflow in ${node.className}: ${node.textContent}`);
      }
    }
    return problems;
  });
  if (issues.length) {
    throw new Error(`Assistant layout issues: ${issues.join("; ")}`);
  }
}

async function maybeScreenshot(page: Page, name: string) {
  if (!screenshotDir) return;
  fs.mkdirSync(screenshotDir, { recursive: true });
  await page.screenshot({ path: path.join(screenshotDir, name), fullPage: false });
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
