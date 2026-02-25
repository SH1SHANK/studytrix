import type { LucideIcon } from "lucide-react";
import {
  Archive,
  File,
  FileAudio,
  FileCode2,
  FileImage,
  FileJson,
  FileSpreadsheet,
  FileText,
  FileType2,
  FileVideo,
  Notebook,
  Presentation,
} from "lucide-react";

export type FileCategory =
  | "image"
  | "pdf"
  | "document"
  | "spreadsheet"
  | "presentation"
  | "audio"
  | "video"
  | "code"
  | "archive"
  | "notebook"
  | "data"
  | "unknown";

export type CodeLanguage = string;

type ExtensionMeta = {
  category: FileCategory;
  codeLanguage?: string;
  syntax?: string;
};

const EXTENSION_META: Record<string, ExtensionMeta> = {
  py: { category: "code", codeLanguage: "Python", syntax: "python" },
  c: { category: "code", codeLanguage: "C", syntax: "c" },
  h: { category: "code", codeLanguage: "C", syntax: "c" },
  cpp: { category: "code", codeLanguage: "C++", syntax: "cpp" },
  cc: { category: "code", codeLanguage: "C++", syntax: "cpp" },
  cxx: { category: "code", codeLanguage: "C++", syntax: "cpp" },
  hpp: { category: "code", codeLanguage: "C++", syntax: "cpp" },
  java: { category: "code", codeLanguage: "Java", syntax: "java" },
  js: { category: "code", codeLanguage: "JavaScript", syntax: "javascript" },
  mjs: { category: "code", codeLanguage: "JavaScript", syntax: "javascript" },
  cjs: { category: "code", codeLanguage: "JavaScript", syntax: "javascript" },
  ts: { category: "code", codeLanguage: "TypeScript", syntax: "typescript" },
  tsx: { category: "code", codeLanguage: "TypeScript", syntax: "typescript" },
  html: { category: "code", codeLanguage: "HTML", syntax: "xml" },
  htm: { category: "code", codeLanguage: "HTML", syntax: "xml" },
  css: { category: "code", codeLanguage: "CSS", syntax: "css" },
  scss: { category: "code", codeLanguage: "CSS", syntax: "scss" },
  sass: { category: "code", codeLanguage: "CSS", syntax: "scss" },
  json: { category: "data", codeLanguage: "JSON", syntax: "json" },
  xml: { category: "data", codeLanguage: "XML", syntax: "xml" },
  csv: { category: "data", codeLanguage: "CSV", syntax: "csv" },
  m: { category: "code", codeLanguage: "MATLAB", syntax: "matlab" },
  r: { category: "code", codeLanguage: "R", syntax: "r" },
  ipynb: { category: "notebook", codeLanguage: "Jupyter Notebook", syntax: "json" },
  sh: { category: "code", codeLanguage: "Shell Script", syntax: "bash" },
  bash: { category: "code", codeLanguage: "Shell Script", syntax: "bash" },
  zsh: { category: "code", codeLanguage: "Shell Script", syntax: "bash" },
  sql: { category: "code", codeLanguage: "SQL", syntax: "sql" },
  md: { category: "document", codeLanguage: "Markdown", syntax: "markdown" },
  markdown: { category: "document", codeLanguage: "Markdown", syntax: "markdown" },
  tex: { category: "document", codeLanguage: "LaTeX", syntax: "latex" },
  zip: { category: "archive" },
  tar: { category: "archive" },
  gz: { category: "archive" },
  rar: { category: "archive" },
  vhd: { category: "code", codeLanguage: "VHDL", syntax: "vhdl" },
  vhdl: { category: "code", codeLanguage: "VHDL", syntax: "vhdl" },
  v: { category: "code", codeLanguage: "Verilog", syntax: "verilog" },
  s: { category: "code", codeLanguage: "Assembly", syntax: "asm" },
  asm: { category: "code", codeLanguage: "Assembly", syntax: "asm" },
};

function normalizeExtension(extension: string): string {
  return extension.trim().replace(/^\./, "").toLowerCase();
}

export function getFileCategory(mimeType: string, extension: string): FileCategory {
  const ext = normalizeExtension(extension);
  if (ext && EXTENSION_META[ext]) {
    return EXTENSION_META[ext].category;
  }

  const normalizedMime = mimeType.trim().toLowerCase();
  if (!normalizedMime) {
    return "unknown";
  }

  if (normalizedMime.startsWith("image/")) return "image";
  if (normalizedMime === "application/pdf") return "pdf";
  if (normalizedMime.startsWith("audio/")) return "audio";
  if (normalizedMime.startsWith("video/")) return "video";
  if (normalizedMime.includes("presentation")) return "presentation";
  if (normalizedMime.includes("spreadsheet") || normalizedMime.includes("excel")) return "spreadsheet";
  if (normalizedMime.includes("zip") || normalizedMime.includes("archive")) return "archive";
  if (normalizedMime.includes("json") || normalizedMime.includes("xml") || normalizedMime.includes("csv")) return "data";
  if (normalizedMime.startsWith("text/")) return "document";
  if (normalizedMime.includes("document") || normalizedMime.includes("word")) return "document";

  return "unknown";
}

export function getFileIcon(category: FileCategory): LucideIcon {
  switch (category) {
    case "image":
      return FileImage;
    case "pdf":
      return FileType2;
    case "document":
      return FileText;
    case "spreadsheet":
      return FileSpreadsheet;
    case "presentation":
      return Presentation;
    case "audio":
      return FileAudio;
    case "video":
      return FileVideo;
    case "code":
      return FileCode2;
    case "archive":
      return Archive;
    case "notebook":
      return Notebook;
    case "data":
      return FileJson;
    case "unknown":
    default:
      return File;
  }
}

export function getFileCategoryLabel(category: FileCategory): string {
  switch (category) {
    case "image":
      return "Image";
    case "pdf":
      return "PDF";
    case "document":
      return "Document";
    case "spreadsheet":
      return "Spreadsheet";
    case "presentation":
      return "Presentation";
    case "audio":
      return "Audio";
    case "video":
      return "Video";
    case "code":
      return "Code";
    case "archive":
      return "Archive";
    case "notebook":
      return "Notebook";
    case "data":
      return "Data";
    case "unknown":
    default:
      return "File";
  }
}

export function isCodeFile(extension: string): boolean {
  const ext = normalizeExtension(extension);
  if (!ext) {
    return false;
  }
  return EXTENSION_META[ext]?.category === "code";
}

export function getCodeLanguage(extension: string): CodeLanguage | null {
  const ext = normalizeExtension(extension);
  return EXTENSION_META[ext]?.codeLanguage ?? null;
}

export function getSyntaxHighlightLanguage(extension: string): string {
  const ext = normalizeExtension(extension);
  return EXTENSION_META[ext]?.syntax ?? "plaintext";
}

