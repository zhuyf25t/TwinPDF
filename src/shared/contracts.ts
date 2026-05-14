export type AssistMode = "explain" | "translate" | "example" | "question";
export type AssistantDockMode = "collapsed" | "compact" | "expanded";

export type WorkspaceManifest = {
  schemaVersion: 1;
  app: "TwinPDF";
  workspaceName: string;
  createdAt: string;
  updatedAt: string;
};

export type AppSettings = {
  assistantHeight: number;
  assistantMode: AssistantDockMode;
  inputLocked: boolean;
  autoAddLocked: boolean;
  lastLeftPdfName?: string;
  lastRightHandoutName?: string;
};

export const defaultSettings: AppSettings = {
  assistantHeight: 300,
  assistantMode: "collapsed",
  inputLocked: false,
  autoAddLocked: false
};

export type WorkspaceRef = {
  name: string;
  handle: any;
};

export type WorkspaceData = {
  manifest: WorkspaceManifest;
  settings: AppSettings;
  studyLog: StudyLogEntry[];
  handoutMarkdown: string;
};

export type SelectedContext = {
  selectedText: string;
  pageLabel: string;
  pageNumber?: number;
  pageText: string;
  nearbyContext?: string;
  source: "left-pdf" | "right-handout" | "assistant" | "unknown";
  sentenceId?: string;
  labels?: SentenceLabel[];
};

export type StudyLogEntry = {
  id: string;
  createdAt: string;
  courseTitle: string;
  workspaceName?: string;
  pageLabel?: string;
  pageNumber?: number;
  mode: AssistMode;
  selectedText: string;
  translationSurface: string;
  question: string;
  answer: string;
  rightNoteContext?: string;
  pageContext?: string;
  source?: string;
  sentenceId?: string;
  userNote?: string;
};

export type SentenceRecord = {
  id: string;
  pageNumber: number;
  indexOnPage: number;
  text: string;
  startOffset?: number;
  endOffset?: number;
};

export type PageSentenceIndex = {
  pdfId: string;
  pdfName: string;
  pageNumber: number;
  pageText: string;
  sentences: SentenceRecord[];
  createdAt: string;
};

export type PdfSentenceIndex = {
  pdfId: string;
  pdfName: string;
  pages: PageSentenceIndex[];
  createdAt: string;
};

export type SentenceLabel = {
  sentenceId: string;
  kind: "definition" | "formula" | "intuition" | "procedure" | "warning" | "example" | "other";
  difficulty: "low" | "medium" | "high";
  shortGloss: string;
  likelyQuestion: string;
  examHint?: string;
};

export type AssistRequest = {
  selectedText: string;
  pageContext?: string;
  rightNoteContext?: string;
  question?: string;
  mode?: AssistMode;
  pageLabel?: string;
  pageNumber?: number;
  courseTitle?: string;
  workspaceName?: string;
  sentenceLabels?: SentenceLabel[];
  recentEntries?: Pick<StudyLogEntry, "question" | "answer" | "selectedText" | "pageLabel">[];
};

export type AssistResponse = {
  answer: string;
  mock?: boolean;
  error?: string;
};

export type LabelPageRequest = {
  courseTitle?: string;
  pdfName: string;
  pageNumber: number;
  pageText: string;
  sentences: SentenceRecord[];
};

export type LabelPageResponse = {
  labels: SentenceLabel[];
  mock?: boolean;
  error?: string;
};

export type FinalizeRequest = {
  courseTitle: string;
  workspaceName?: string;
  entries: StudyLogEntry[];
};

export type FinalizeResponse = {
  markdown: string;
  mock?: boolean;
  error?: string;
};
