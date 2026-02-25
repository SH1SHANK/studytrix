"use client";

import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Files,
  FolderOpen,
  Link as LinkIcon,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  ClipboardPaste,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  getPersonalRepositoryErrorMessage,
  normalizeDriveFolderInput,
} from "@/features/custom-folders/custom-folders.constants";
import { useCustomFoldersStore } from "@/features/custom-folders/custom-folders.store";
import type { CustomFolderVerifyResponse } from "@/features/custom-folders/custom-folders.types";
import { ColourSwatchPicker } from "./ColourSwatchPicker";
import { VerificationProgress } from "./VerificationProgress";
import { VerificationStage, type VerificationStageStatus } from "./VerificationStage";

type AddFolderDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFolderAdded?: (folderId: string) => void;
};

type VerifyPhase = "input" | "verifying" | "customize";
type StageKey = "format" | "access" | "permission" | "contents" | "safety";

type StageDefinition = {
  key: StageKey;
  icon: ComponentType<{ className?: string }>;
  runningLabel: string;
};

const STAGES: readonly StageDefinition[] = [
  { key: "format", icon: LinkIcon, runningLabel: "Checking link format..." },
  { key: "access", icon: FolderOpen, runningLabel: "Checking folder access..." },
  { key: "permission", icon: ShieldCheck, runningLabel: "Checking permissions..." },
  { key: "contents", icon: Files, runningLabel: "Checking folder contents..." },
  { key: "safety", icon: ShieldAlert, runningLabel: "Running safety check..." },
];

const wait = (ms: number) => new Promise<void>((resolve) => {
  window.setTimeout(resolve, ms);
});

function isTerminalStageStatus(status: VerificationStageStatus): boolean {
  return status === "success" || status === "warning" || status === "failed";
}

export function AddFolderDialog({
  open,
  onOpenChange,
  onFolderAdded,
}: AddFolderDialogProps) {
  const addFolder = useCustomFoldersStore((state) => state.addFolder);
  const [phase, setPhase] = useState<VerifyPhase>("input");
  const [inputValue, setInputValue] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [stageStatus, setStageStatus] = useState<Record<StageKey, VerificationStageStatus>>({
    format: "pending",
    access: "pending",
    permission: "pending",
    contents: "pending",
    safety: "pending",
  });
  const [stageLabel, setStageLabel] = useState<Record<StageKey, string>>({
    format: "Checking link format...",
    access: "Checking folder access...",
    permission: "Checking permissions...",
    contents: "Checking folder contents...",
    safety: "Running safety check...",
  });
  const [verifiedFolder, setVerifiedFolder] = useState<CustomFolderVerifyResponse | null>(null);
  const [verifiedFolderId, setVerifiedFolderId] = useState<string>("");
  const [customLabel, setCustomLabel] = useState("");
  const [customColour, setCustomColour] = useState("hsl(var(--primary))");
  const [pinnedToTop, setPinnedToTop] = useState(false);
  const [safetyAcknowledged, setSafetyAcknowledged] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const completedStages = useMemo(
    () => STAGES.reduce((acc, stage) => acc + (isTerminalStageStatus(stageStatus[stage.key]) ? 1 : 0), 0),
    [stageStatus],
  );

  const hasSafetyWarning = Boolean(verifiedFolder?.safetyFlags.length);
  const labelCount = customLabel.trim().length;
  const canAdd = labelCount > 0 && labelCount <= 40 && (!hasSafetyWarning || safetyAcknowledged);
  const normalizedFolderInput = useMemo(() => normalizeDriveFolderInput(inputValue), [inputValue]);
  const canVerify = phase === "input" && normalizedFolderInput !== null;

  const resetState = useCallback(() => {
    setPhase("input");
    setInputValue("");
    setInputError(null);
    setStageStatus({
      format: "pending",
      access: "pending",
      permission: "pending",
      contents: "pending",
      safety: "pending",
    });
    setStageLabel({
      format: "Checking link format...",
      access: "Checking folder access...",
      permission: "Checking permissions...",
      contents: "Checking folder contents...",
      safety: "Running safety check...",
    });
    setVerifiedFolder(null);
    setVerifiedFolderId("");
    setCustomLabel("");
    setCustomColour("hsl(var(--primary))");
    setPinnedToTop(false);
    setSafetyAcknowledged(false);
    setIsSubmitting(false);
  }, []);

  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open, resetState]);

  const setStage = useCallback((key: StageKey, status: VerificationStageStatus, label: string) => {
    setStageStatus((current) => ({ ...current, [key]: status }));
    setStageLabel((current) => ({ ...current, [key]: label }));
  }, []);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim().length > 0) {
        setInputValue(text.trim());
        setInputError(null);
      }
    } catch {
      toast.error("Clipboard access is unavailable.");
    }
  }, []);

  const runVerification = useCallback(async () => {
    const folderId = normalizedFolderInput;
    if (!folderId) {
      setInputError("This doesn't look like a valid Drive folder link.");
      return;
    }

    setInputError(null);
    setPhase("verifying");
    setVerifiedFolderId(folderId);
    setStageStatus({
      format: "pending",
      access: "pending",
      permission: "pending",
      contents: "pending",
      safety: "pending",
    });
    setStageLabel({
      format: "Checking link format...",
      access: "Checking folder access...",
      permission: "Checking permissions...",
      contents: "Checking folder contents...",
      safety: "Running safety check...",
    });

    setStage("format", "running", "Checking link format...");
    await wait(120);
    setStage("format", "success", "Link looks valid");

    setStage("access", "running", "Checking folder access...");
    let payload: CustomFolderVerifyResponse;
    try {
      const response = await fetch("/api/custom-folders/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ folderId }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { errorCode?: string };
        const message = getPersonalRepositoryErrorMessage(body.errorCode ?? "DRIVE_ERROR");
        setStage("access", "failed", message);
        await wait(160);
        setPhase("input");
        setInputError(message);
        return;
      }

      payload = (await response.json()) as CustomFolderVerifyResponse;
    } catch {
      const message = "Couldn't reach Google Drive. Check your connection and try again.";
      setStage("access", "failed", message);
      await wait(160);
      setPhase("input");
      setInputError(message);
      return;
    }

    if (!payload.accessible) {
      const message = "This folder is private or access was denied. Make sure the folder is shared with 'Anyone with the link'.";
      setStage(
        "access",
        "failed",
        message,
      );
      await wait(160);
      setPhase("input");
      setInputError(message);
      return;
    }

    setStage("access", "success", "Folder is accessible");

    setStage("permission", "running", "Checking permissions...");
    await wait(90);
    if (payload.permissionLevel === "none") {
      const message = "View-only access required. This folder's permissions are too restrictive.";
      setStage("permission", "failed", message);
      await wait(160);
      setPhase("input");
      setInputError(message);
      return;
    }
    setStage("permission", "success", "Read access confirmed");

    setStage("contents", "running", "Checking folder contents...");
    await wait(90);
    const itemCount = payload.fileCount + payload.folderCount;
    if (itemCount === 0) {
      setStage("contents", "warning", "This folder appears to be empty.");
    } else {
      setStage("contents", "success", `Found ${itemCount} items`);
    }

    setStage("safety", "running", "Running safety check...");
    await wait(100);
    if (payload.safetyFlags.length > 0) {
      setStage(
        "safety",
        "warning",
        "This folder passed basic checks but couldn't be fully verified. Only add folders from sources you trust.",
      );
    } else {
      setStage("safety", "success", "No issues found");
    }

    setVerifiedFolder(payload);
    setCustomLabel(payload.name.slice(0, 40));
    setSafetyAcknowledged(payload.safetyFlags.length === 0);
    setPhase("customize");
  }, [normalizedFolderInput, setStage]);

  const addToPersonalRepository = useCallback(() => {
    if (!verifiedFolder || !verifiedFolderId || !canAdd || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    const now = Date.now();
    const trimmedLabel = customLabel.trim().slice(0, 40);
    addFolder({
      id: verifiedFolderId,
      label: trimmedLabel,
      colour: customColour,
      pinnedToTop,
      addedAt: now,
      lastRefreshedAt: now,
      fileCount: verifiedFolder.fileCount,
      folderCount: verifiedFolder.folderCount,
      accessVerifiedAt: now,
    });
    toast.success(`${trimmedLabel} added to your Personal Repository`);
    onFolderAdded?.(verifiedFolderId);
    onOpenChange(false);
  }, [
    addFolder,
    canAdd,
    customColour,
    customLabel,
    isSubmitting,
    onFolderAdded,
    onOpenChange,
    pinnedToTop,
    verifiedFolder,
    verifiedFolderId,
  ]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
      }}
      dismissOnOverlayClick={phase !== "verifying"}
      dismissOnEscape={phase !== "verifying"}
    >
      <DialogContent className="fixed inset-x-0 bottom-0 top-auto left-0 right-0 mx-auto flex max-h-[88dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col overflow-hidden rounded-t-3xl border-t border-border/70 bg-background/95 p-0 shadow-2xl backdrop-blur-xl sm:inset-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:max-h-[85dvh] sm:w-full sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:border">
        <div className="mx-auto mt-3 h-1.5 w-14 rounded-full bg-muted" />
        <div className="flex-1 overflow-y-auto px-5 pb-4 pt-4 sm:px-6 sm:pb-5 sm:pt-4">
          <DialogHeader className="space-y-1">
            <DialogTitle>Add to Personal Repository</DialogTitle>
            <DialogDescription>
              {phase === "input"
                ? "Paste a Google Drive folder link to verify and add it."
                : phase === "verifying"
                  ? "Verifying folder access and safety checks."
                  : "Folder verified. Customize how it appears in your Personal Repository."}
            </DialogDescription>
          </DialogHeader>

          <AnimatePresence mode="wait" initial={false}>
            {phase === "input" ? (
              <motion.div
                key="input"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.16 }}
                className="mt-5 space-y-3"
              >
                <div className="space-y-1.5">
                  <label htmlFor="add-personal-folder-input" className="text-xs font-medium text-muted-foreground">
                    Google Drive folder link
                  </label>
                  <div className="relative">
                    <Input
                      id="add-personal-folder-input"
                      value={inputValue}
                      autoFocus
                      onChange={(event) => {
                        setInputValue(event.target.value);
                        if (inputError) {
                          setInputError(null);
                        }
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && canVerify) {
                          event.preventDefault();
                          void runVerification();
                        }
                      }}
                      placeholder="Paste a Google Drive folder link"
                      className="h-11 pr-22"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => void handlePaste()}
                      className="absolute right-1.5 top-1/2 h-8 -translate-y-1/2 rounded-lg px-2.5"
                    >
                      <ClipboardPaste className="size-3.5" />
                      Paste
                    </Button>
                  </div>
                </div>
                {inputError ? (
                  <p className="text-xs text-destructive">{inputError}</p>
                ) : normalizedFolderInput ? (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    Valid folder detected
                  </p>
                ) : null}
                <div className="rounded-xl border border-border/70 bg-card/45 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                  We only add folders after verifying access and basic safety checks.
                </div>
              </motion.div>
            ) : null}

            {phase === "verifying" ? (
              <motion.div
                key="verifying"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.16 }}
                className="mt-5 space-y-3"
              >
                <VerificationProgress completedCount={completedStages} totalCount={5} />
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: {},
                    visible: {
                      transition: {
                        staggerChildren: 0.08,
                      },
                    },
                  }}
                  className="space-y-2"
                >
                  {STAGES.map((stage, index) => (
                    <VerificationStage
                      key={stage.key}
                      icon={stage.icon}
                      label={stageLabel[stage.key] || stage.runningLabel}
                      status={stageStatus[stage.key]}
                      delayMs={index * 40}
                    />
                  ))}
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {phase === "customize" && verifiedFolder ? (
            <AnimatePresence mode="wait">
              <motion.div
                key="customize-view"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="mt-5 space-y-4"
              >
                <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4">
                  <p className="text-sm font-semibold text-primary">Folder verified</p>
                  <div className="mt-3 flex items-center gap-3">
                    <motion.div
                      layoutId={`personal-folder-icon-${verifiedFolderId}`}
                      className="flex size-11 items-center justify-center rounded-xl border border-primary/30 bg-card text-primary"
                      initial={{ scale: 0.9, opacity: 0.8 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 280, damping: 24 }}
                    >
                      <FolderOpen className="size-5" />
                    </motion.div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{verifiedFolder.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {verifiedFolder.fileCount} files · {verifiedFolder.folderCount} subfolders
                      </p>
                    </div>
                  </div>
                </div>

                {hasSafetyWarning ? (
                  <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      This folder passed basic checks but couldn't be fully verified. Only add folders from sources you trust.
                    </p>
                    <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-amber-700 dark:text-amber-300">
                      <input
                        type="checkbox"
                        checked={safetyAcknowledged}
                        onChange={(event) => setSafetyAcknowledged(event.target.checked)}
                      />
                      I understand and want to continue.
                    </label>
                  </div>
                ) : null}

                <div className="space-y-1.5">
                  <label htmlFor="personal-folder-label" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/90">
                    Label
                  </label>
                  <Input
                    id="personal-folder-label"
                    maxLength={40}
                    value={customLabel}
                    onChange={(event) => setCustomLabel(event.target.value)}
                  />
                  {labelCount >= 30 ? (
                    <p className="text-[11px] text-muted-foreground">{labelCount} / 40</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/90">Colour</p>
                  <ColourSwatchPicker value={customColour} onChange={setCustomColour} />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/35 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-foreground">Pin to top</p>
                    <p className="text-xs text-muted-foreground">Pinned folders always appear before unpinned folders.</p>
                  </div>
                  <Switch checked={pinnedToTop} onCheckedChange={setPinnedToTop} />
                </div>
              </motion.div>
            </AnimatePresence>
          ) : null}
        </div>
        <div className="border-t border-border/70 bg-background/95 px-5 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-3 sm:px-6 sm:pb-4">
          {phase === "input" ? (
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={!canVerify} onClick={() => void runVerification()}>
                Verify Folder
              </Button>
            </div>
          ) : null}

          {phase === "verifying" ? (
            <div className="flex items-center justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          ) : null}

          {phase === "customize" ? (
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={!canAdd || isSubmitting} onClick={addToPersonalRepository}>
                {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                Add to Personal Repository
              </Button>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
