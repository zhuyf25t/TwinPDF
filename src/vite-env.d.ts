/// <reference types="vite/client" />

declare module "pdfjs-dist/build/pdf.worker.mjs?url" {
  const workerSrc: string;
  export default workerSrc;
}

declare global {
  interface Window {
    showDirectoryPicker?: (options?: { mode?: "read" | "readwrite" }) => Promise<any>;
  }
}

export {};
