"use client";

export type CodePreviewRequest = {
  fileId: string;
  fileName: string;
  extension: string;
};

const CODE_PREVIEW_EVENT = "studytrix:open-code-preview";

function normalizeRequest(request: CodePreviewRequest): CodePreviewRequest | null {
  const fileId = request.fileId.trim();
  const fileName = request.fileName.trim();
  const extension = request.extension.trim().replace(/^\./, "").toLowerCase();
  if (!fileId || !fileName) {
    return null;
  }

  return {
    fileId,
    fileName,
    extension,
  };
}

export function emitCodePreviewRequest(request: CodePreviewRequest): void {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = normalizeRequest(request);
  if (!normalized) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<CodePreviewRequest>(CODE_PREVIEW_EVENT, {
      detail: normalized,
    }),
  );
}

export function onCodePreviewRequest(
  handler: (request: CodePreviewRequest) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const listener = (event: Event) => {
    const detail = (event as CustomEvent<CodePreviewRequest>).detail;
    const normalized = detail ? normalizeRequest(detail) : null;
    if (!normalized) {
      return;
    }
    handler(normalized);
  };

  window.addEventListener(CODE_PREVIEW_EVENT, listener as EventListener);
  return () => {
    window.removeEventListener(CODE_PREVIEW_EVENT, listener as EventListener);
  };
}
