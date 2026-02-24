"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IconCheck, IconCopy, IconShare, IconSparkles } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { summarizePDF, type SummarizeResult } from "@/features/intelligence/summarize.client";

const ERROR_COPY: Record<string, string> = {
  FILE_FETCH_FAILED: "Could not load this PDF right now. Check your connection and try again.",
  NO_TEXT_CONTENT: "This PDF appears to be image-based or handwritten. Summarization requires text content.",
  RATE_LIMIT_EXCEEDED: "You have reached the summarize limit. Please wait a minute and try again.",
  INSUFFICIENT_TEXT_CONTENT: "This file does not contain enough extractable text to summarize.",
  NETWORK_ERROR: "Connection issue while summarizing. Please try again.",
  TIMEOUT: "Summarization took too long. Please try again.",
  SERVER_ERROR: "Summary service is unavailable right now. Please try again.",
  SUMMARIZE_FAILED: "Summarization failed. Check your connection and try again.",
};

type SummarizeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileId: string;
  fileName: string;
};

function resolveErrorMessage(errorCode: string): string {
  return ERROR_COPY[errorCode] ?? "Summarization failed. Please try again.";
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // ignore and fallback
  }

  return false;
}

export function SummarizeDialog({
  open,
  onOpenChange,
  fileId,
  fileName,
}: SummarizeDialogProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [summary, setSummary] = useState("");
  const [summarySource, setSummarySource] = useState<SummarizeResult["source"] | null>(null);
  const [errorCode, setErrorCode] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!open || !fileId) {
      return;
    }

    if (inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    setStatus("loading");
    setSummary("");
    setSummarySource(null);
    setErrorCode("");

    void summarizePDF(fileId)
      .then((result) => {
        setSummary(result.summary);
        setSummarySource(result.source);
        setStatus("success");
      })
      .catch((error) => {
        setStatus("error");
        setErrorCode(error instanceof Error ? error.message : "SUMMARIZE_FAILED");
      })
      .finally(() => {
        inFlightRef.current = false;
      });
  }, [fileId, open]);

  const errorMessage = useMemo(
    () => resolveErrorMessage(errorCode),
    [errorCode],
  );
  const summaryDescription = useMemo(() => {
    if (summarySource === "gemini") {
      return "AI summary generated with Gemini.";
    }

    if (summarySource === "server-fallback") {
      return "Generated with resilient extractive fallback.";
    }

    if (summarySource === "client-fallback") {
      return "Generated locally because cloud summarization was unavailable.";
    }

    return "Adaptive summarize pipeline";
  }, [summarySource]);

  const handleCopy = async () => {
    if (!summary) {
      return;
    }

    const ok = await copyToClipboard(summary);
    if (!ok) {
      return;
    }

    setCopied(true);
    window.setTimeout(() => {
      setCopied(false);
    }, 600);
  };

  const handleShare = async () => {
    if (!summary) {
      return;
    }

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: fileName, text: summary });
        return;
      } catch {
        // fallback to copy
      }
    }

    await handleCopy();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-1.25rem)] rounded-2xl border-border/80 p-4 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <IconSparkles className="size-4 text-primary" />
            {status === "success" ? `Summary — ${fileName}` : "Summarizing"}
          </DialogTitle>
          <DialogDescription>
            {summaryDescription}
          </DialogDescription>
        </DialogHeader>

        {status === "loading" ? (
          <div className="space-y-2 py-2">
            <div className="h-3 w-full animate-pulse rounded bg-muted" />
            <div className="h-3 w-11/12 animate-pulse rounded bg-muted" />
            <div className="h-3 w-10/12 animate-pulse rounded bg-muted" />
            <div className="h-3 w-8/12 animate-pulse rounded bg-muted" />
          </div>
        ) : null}

        {status === "error" ? (
          <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-800 dark:text-rose-300">
            {errorMessage}
          </div>
        ) : null}

        {status === "success" ? (
          <div className="max-h-[50dvh] overflow-y-auto rounded-xl border border-border/70 bg-muted/20 p-3 text-sm leading-6 text-foreground whitespace-pre-wrap">
            {summary}
          </div>
        ) : null}

        <DialogFooter showCloseButton>
          {status === "success" ? (
            <>
              <Button type="button" variant="outline" onClick={() => void handleCopy()}>
                {copied ? <IconCheck className="size-4" /> : <IconCopy className="size-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button type="button" variant="outline" onClick={() => void handleShare()}>
                <IconShare className="size-4" />
                Share
              </Button>
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
