"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Download, Share2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getFile } from "@/features/offline/offline.db";
import { getCodeLanguage, getSyntaxHighlightLanguage } from "@/features/custom-folders/file-type.utils";

type NotebookCell = {
  cell_type?: string;
  source?: string[] | string;
  outputs?: Array<{ text?: string[] | string }>;
};

type CodePreviewSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileId: string | null;
  fileName: string;
  extension: string;
  onRequestDownload?: (fileId: string) => void;
};

const MAX_PREVIEW_BYTES = 500 * 1024;
const HIGHLIGHT_THEME_CSS = `
.studytrix-hljs-light .hljs { color: #24292f; background: #f6f8fa; }
.studytrix-hljs-light .hljs-comment,.studytrix-hljs-light .hljs-quote { color: #6e7781; }
.studytrix-hljs-light .hljs-keyword,.studytrix-hljs-light .hljs-selector-tag,.studytrix-hljs-light .hljs-literal,.studytrix-hljs-light .hljs-name { color: #cf222e; }
.studytrix-hljs-light .hljs-string,.studytrix-hljs-light .hljs-title,.studytrix-hljs-light .hljs-section,.studytrix-hljs-light .hljs-attribute { color: #0a3069; }
.studytrix-hljs-light .hljs-number,.studytrix-hljs-light .hljs-meta { color: #8250df; }

.studytrix-hljs-dark .hljs { color: #c9d1d9; background: #0d1117; }
.studytrix-hljs-dark .hljs-comment,.studytrix-hljs-dark .hljs-quote { color: #8b949e; }
.studytrix-hljs-dark .hljs-keyword,.studytrix-hljs-dark .hljs-selector-tag,.studytrix-hljs-dark .hljs-literal,.studytrix-hljs-dark .hljs-name { color: #ff7b72; }
.studytrix-hljs-dark .hljs-string,.studytrix-hljs-dark .hljs-title,.studytrix-hljs-dark .hljs-section,.studytrix-hljs-dark .hljs-attribute { color: #a5d6ff; }
.studytrix-hljs-dark .hljs-number,.studytrix-hljs-dark .hljs-meta { color: #d2a8ff; }
`;

function normalizeTextSource(source: unknown): string {
  if (Array.isArray(source)) {
    return source.join("");
  }
  if (typeof source === "string") {
    return source;
  }
  return "";
}

function readAsText(blob: Blob): Promise<string> {
  return blob.text();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function highlightWithHighlightJs(text: string, language: string): Promise<string> {
  try {
    const hljsModule = await import("highlight.js");
    const hljs = hljsModule.default;
    if (language && hljs.getLanguage(language)) {
      return hljs.highlight(text, {
        language,
        ignoreIllegals: true,
      }).value;
    }
    return hljs.highlightAuto(text).value;
  } catch {
    return escapeHtml(text);
  }
}

function isDarkThemeActive(): boolean {
  const theme = document.documentElement.getAttribute("data-theme") || "";
  const darkLikeThemes = new Set(["midnight", "eclipse", "graphite", "aurora"]);
  return darkLikeThemes.has(theme);
}

export function CodePreviewSheet({
  open,
  onOpenChange,
  fileId,
  fileName,
  extension,
  onRequestDownload,
}: CodePreviewSheetProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "missing" | "too-large" | "ready" | "error">("idle");
  const [rawContent, setRawContent] = useState("");
  const [highlightedHtml, setHighlightedHtml] = useState("");
  const [isNotebook, setIsNotebook] = useState(false);
  const [notebookCells, setNotebookCells] = useState<NotebookCell[]>([]);
  const [notebookCodeHtmlByIndex, setNotebookCodeHtmlByIndex] = useState<Record<number, string>>({});

  const languageLabel = getCodeLanguage(extension) ?? extension.toUpperCase();
  const syntaxLanguage = getSyntaxHighlightLanguage(extension);
  const darkTheme = typeof document !== "undefined" ? isDarkThemeActive() : false;

  useEffect(() => {
    if (!open || !fileId) {
      setStatus("idle");
      setRawContent("");
      setHighlightedHtml("");
      setNotebookCells([]);
      setNotebookCodeHtmlByIndex({});
      setIsNotebook(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      setStatus("loading");
      const record = await getFile(fileId);
      if (!record) {
        if (!cancelled) setStatus("missing");
        return;
      }

      if (record.size > MAX_PREVIEW_BYTES) {
        if (!cancelled) setStatus("too-large");
        return;
      }

      try {
        const text = await readAsText(record.blob);
        if (cancelled) {
          return;
        }

        const isIpynb = extension.trim().toLowerCase() === "ipynb";
        setIsNotebook(isIpynb);
        setRawContent(text);

        if (isIpynb) {
          try {
            const parsed = JSON.parse(text) as { cells?: NotebookCell[] };
            const cells = Array.isArray(parsed.cells) ? parsed.cells : [];
            const highlightedCodeEntries = await Promise.all(
              cells.map(async (cell, index) => {
                if (cell?.cell_type !== "code") {
                  return [index, ""] as const;
                }
                const source = normalizeTextSource(cell.source);
                const html = await highlightWithHighlightJs(source, "python");
                return [index, html] as const;
              }),
            );
            const nextHighlights = highlightedCodeEntries.reduce<Record<number, string>>((acc, [index, html]) => {
              if (html) {
                acc[index] = html;
              }
              return acc;
            }, {});
            setNotebookCells(cells);
            setNotebookCodeHtmlByIndex(nextHighlights);
            setStatus("ready");
            return;
          } catch {
            setNotebookCells([]);
            setNotebookCodeHtmlByIndex({});
          }
        }

        const highlighted = await highlightWithHighlightJs(text, syntaxLanguage);
        if (!cancelled) {
          setHighlightedHtml(highlighted);
          setStatus("ready");
        }
      } catch {
        if (!cancelled) {
          setStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [extension, fileId, open, syntaxLanguage]);

  const copyAll = useCallback(async () => {
    if (!rawContent) {
      return;
    }
    try {
      await navigator.clipboard.writeText(rawContent);
      toast.success("Copied!");
    } catch {
      toast.error("Clipboard is unavailable.");
    }
  }, [rawContent]);

  const shareAll = useCallback(async () => {
    if (!rawContent) {
      return;
    }

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: fileName, text: rawContent });
        return;
      } catch {
      }
    }
    await copyAll();
  }, [copyAll, fileName, rawContent]);

  const codeLines = useMemo(() => rawContent.split("\n"), [rawContent]);

  return (
    <>
      {open ? (
        <div className="fixed inset-0 z-[70] bg-black/50" onClick={() => onOpenChange(false)} />
      ) : null}
      <div className={`fixed inset-0 z-[80] ${open ? "pointer-events-auto" : "pointer-events-none"}`}>
        <style>{HIGHLIGHT_THEME_CSS}</style>
        <div className={`absolute inset-0 transform bg-background transition-transform duration-200 ${open ? "translate-y-0" : "translate-y-full"}`}>
          <header className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{fileName}</p>
              <p className="text-xs text-muted-foreground">{languageLabel}</p>
            </div>
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="icon" onClick={() => void copyAll()}>
                <Copy className="size-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => void shareAll()}>
                <Share2 className="size-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                <X className="size-4" />
              </Button>
            </div>
          </header>

          {status === "missing" ? (
            <div className="p-4">
              <p className="text-sm text-muted-foreground">Download this file first to preview it.</p>
              {fileId && onRequestDownload ? (
                <Button type="button" className="mt-3" onClick={() => onRequestDownload?.(fileId)}>
                  <Download className="size-4" />
                  Download
                </Button>
              ) : null}
            </div>
          ) : null}

          {status === "too-large" ? (
            <div className="p-4 text-sm text-muted-foreground">File too large to preview. Download to view.</div>
          ) : null}

          {status === "loading" ? (
            <div className="p-4 text-sm text-muted-foreground">Loading preview...</div>
          ) : null}

          {status === "error" ? (
            <div className="p-4 text-sm text-destructive">Could not preview this file.</div>
          ) : null}

          {status === "ready" && !isNotebook ? (
            <div className={`h-[calc(100%-56px)] overflow-auto ${darkTheme ? "studytrix-hljs-dark" : "studytrix-hljs-light"}`}>
              <div className="flex min-w-max">
                <div className="select-none border-r border-border bg-muted/40 px-2 py-3 text-right text-xs text-muted-foreground">
                  {codeLines.map((_, index) => (
                    <div key={`line-${index + 1}`} className="h-5 leading-5">{index + 1}</div>
                  ))}
                </div>
                <pre className="hljs m-0 p-3 text-xs leading-5">
                  <code dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
                </pre>
              </div>
            </div>
          ) : null}

          {status === "ready" && isNotebook ? (
            <div className={`h-[calc(100%-56px)] overflow-auto p-3 ${darkTheme ? "studytrix-hljs-dark" : "studytrix-hljs-light"}`}>
              <p className="mb-2 text-xs text-muted-foreground">Jupyter Notebook · {notebookCells.length} cells</p>
              <div className="space-y-3">
                {notebookCells.map((cell, index) => {
                  const source = normalizeTextSource(cell.source);
                  if (cell.cell_type === "markdown") {
                    return (
                      <article key={`md-${index}`} className="rounded-lg border border-border bg-card p-3">
                        <p className="whitespace-pre-wrap text-sm text-foreground">{source}</p>
                      </article>
                    );
                  }

                  const outputText = Array.isArray(cell.outputs)
                    ? cell.outputs
                      .map((output) => normalizeTextSource(output.text))
                      .filter((text) => text.length > 0)
                      .join("\n")
                    : "";

                  return (
                    <article key={`code-${index}`} className="rounded-lg border border-border bg-card p-3">
                      <pre className="hljs overflow-auto whitespace-pre text-xs leading-5">
                        <code dangerouslySetInnerHTML={{ __html: notebookCodeHtmlByIndex[index] ?? escapeHtml(source) }} />
                      </pre>
                      {outputText ? (
                        <div className="mt-2 rounded border border-border/70 bg-muted/30 p-2 text-xs text-muted-foreground">
                          <p className="mb-1 font-medium">Output</p>
                          <pre className="whitespace-pre-wrap">{outputText}</pre>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
