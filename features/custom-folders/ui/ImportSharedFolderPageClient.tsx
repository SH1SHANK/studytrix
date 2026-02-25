"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FolderOpen, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AddFolderDialog } from "@/features/custom-folders/ui/AddFolderDialog";
import type { CustomFolderVerifyResponse } from "@/features/custom-folders/custom-folders.types";

type ImportSharedFolderPageClientProps = {
  fid: string | null;
};

type ImportStatus = "verifying" | "ready" | "error";
type ImportErrorCode = "INVALID_LINK" | "ACCESS_DENIED" | "FOLDER_NOT_FOUND";

function resolveErrorMessage(errorCode: ImportErrorCode): string {
  switch (errorCode) {
    case "ACCESS_DENIED":
      return "This folder is private. Ask the owner to change sharing settings.";
    case "FOLDER_NOT_FOUND":
      return "This folder no longer exists or was removed.";
    case "INVALID_LINK":
    default:
      return "This link doesn't look right. Ask for a new one.";
  }
}

export function ImportSharedFolderPageClient({ fid }: ImportSharedFolderPageClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState<ImportStatus>("verifying");
  const [errorCode, setErrorCode] = useState<ImportErrorCode | null>(null);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [verifiedFolder, setVerifiedFolder] = useState<CustomFolderVerifyResponse | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [prefilledImportValue, setPrefilledImportValue] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function runImportVerification() {
      if (!fid) {
        if (!cancelled) {
          setStatus("error");
          setErrorCode("INVALID_LINK");
        }
        return;
      }

      setStatus("verifying");
      setErrorCode(null);
      setVerifiedFolder(null);

      let resolvedFolderId = "";
      try {
        const resolveResponse = await fetch(`/api/custom-folders/resolve?fid=${encodeURIComponent(fid)}`, {
          method: "GET",
          cache: "no-store",
        });

        if (!resolveResponse.ok) {
          throw new Error("INVALID_LINK");
        }

        const resolvePayload = (await resolveResponse.json()) as { folderId?: string };
        if (typeof resolvePayload.folderId !== "string" || !resolvePayload.folderId.trim()) {
          throw new Error("INVALID_LINK");
        }

        resolvedFolderId = resolvePayload.folderId.trim();
        if (!cancelled) {
          setFolderId(resolvedFolderId);
        }
      } catch {
        if (!cancelled) {
          setStatus("error");
          setErrorCode("INVALID_LINK");
        }
        return;
      }

      try {
        const verifyResponse = await fetch("/api/custom-folders/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ folderId: resolvedFolderId }),
        });

        if (!verifyResponse.ok) {
          const body = (await verifyResponse.json().catch(() => ({}))) as { errorCode?: string };
          const code = body.errorCode;
          if (code === "ACCESS_DENIED") {
            throw new Error("ACCESS_DENIED");
          }
          if (code === "FOLDER_NOT_FOUND") {
            throw new Error("FOLDER_NOT_FOUND");
          }
          throw new Error("INVALID_LINK");
        }

        const payload = (await verifyResponse.json()) as CustomFolderVerifyResponse;
        if (cancelled) {
          return;
        }

        setVerifiedFolder(payload);
        setStatus("ready");
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message = error instanceof Error ? error.message : "INVALID_LINK";
        setStatus("error");
        setErrorCode(
          message === "ACCESS_DENIED"
            ? "ACCESS_DENIED"
            : message === "FOLDER_NOT_FOUND"
              ? "FOLDER_NOT_FOUND"
              : "INVALID_LINK",
        );
      }
    }

    void runImportVerification();

    return () => {
      cancelled = true;
    };
  }, [fid]);

  const ownerDomain = useMemo(() => {
    if (!verifiedFolder?.ownerDomain) {
      return "unknown";
    }

    return verifiedFolder.ownerDomain;
  }, [verifiedFolder?.ownerDomain]);

  return (
    <section className="mx-auto w-full max-w-xl px-4 pb-24 pt-8 sm:px-5 sm:pt-10">
      <div className="rounded-2xl border border-border/70 bg-card/60 p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl border border-border/70 bg-card text-primary">
            <FolderOpen className="size-5" />
          </span>
          <div>
            <h1 className="text-base font-semibold text-foreground">Someone shared a study folder with you</h1>
            <p className="text-xs text-muted-foreground">Import this shared folder instantly.</p>
            {status === "verifying" ? (
              <p className="text-xs text-muted-foreground">Verifying folder...</p>
            ) : null}
          </div>
        </div>

        {status === "verifying" ? (
          <div className="mt-5 rounded-xl border border-border/70 bg-muted/35 p-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              Verifying folder...
            </span>
          </div>
        ) : null}

        {status === "ready" && verifiedFolder ? (
          <div className="mt-5 space-y-3">
            <div className="rounded-xl border border-border/70 bg-card/70 p-3">
              <p className="truncate text-sm font-semibold text-foreground">{verifiedFolder.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {verifiedFolder.fileCount} files · {verifiedFolder.folderCount} folders · owner: {ownerDomain}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  router.push("/?repo=personal");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (!folderId) {
                    return;
                  }
                  setPrefilledImportValue(folderId);
                  setAddDialogOpen(true);
                }}
              >
                Add to Personal Repository
              </Button>
            </div>
          </div>
        ) : null}

        {status === "error" && errorCode ? (
          <div className="mt-5 rounded-xl border border-destructive/35 bg-destructive/10 p-3 text-sm text-destructive">
            {resolveErrorMessage(errorCode)}
          </div>
        ) : null}
      </div>

      <AddFolderDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        prefilledImportValue={prefilledImportValue}
        onPrefilledImportConsumed={() => setPrefilledImportValue(null)}
        onFolderAdded={() => {
          setAddDialogOpen(false);
          router.push("/?repo=personal");
        }}
      />
    </section>
  );
}
