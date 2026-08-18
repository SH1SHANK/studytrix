"use client";

import { useState, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Folder,
  FolderPlus,
  HardDrive,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
  Command,
} from "lucide-react";
import { workspaceRepository } from "@/db/repositories/workspace.repository";
import { folderRepository } from "@/db/repositories/folder.repository";
import { driveSourceRepository } from "@/db/repositories/drive-source.repository";
import { driveScanner } from "@/features/drive/drive-scanner";
import { extractDriveFolderId } from "@/features/drive/drive.parser";
import { toast } from "sonner";

interface OnboardingDialogProps {
  open: boolean;
  onComplete: () => void;
}

const WORKSPACE_SUGGESTIONS = [
  "GATE Preparation",
  "Algorithms & Data Structures",
  "Thermodynamics",
  "Machine Learning",
  "Semester Studies",
];

const DEFAULT_FOLDERS = ["Lecture Notes", "Problem Sets", "Reference Material"];

export function OnboardingDialog({ open, onComplete }: OnboardingDialogProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [workspaceName, setWorkspaceName] = useState("My Study Workspace");
  const [folders, setFolders] = useState<string[]>(DEFAULT_FOLDERS);
  const [newFolderInput, setNewFolderInput] = useState("");
  const [driveUrl, setDriveUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleAddFolder = () => {
    const trimmed = newFolderInput.trim();
    if (!trimmed || folders.includes(trimmed)) return;
    setFolders((prev) => [...prev, trimmed]);
    setNewFolderInput("");
  };

  const handleRemoveFolder = (folderToRemove: string) => {
    setFolders((prev) => prev.filter((f) => f !== folderToRemove));
  };

  const handleFinish = useCallback(async () => {
    setSubmitting(true);
    try {
      // 1. Create Workspace if name is provided
      let wsId = "";
      if (workspaceName.trim()) {
        const createdWs = await workspaceRepository.create({
          name: workspaceName.trim(),
          driveFolderId: "",
          pinned: true,
        });
        wsId = createdWs.id;

        // 2. Create subfolders
        for (const fldName of folders) {
          if (fldName.trim()) {
            await folderRepository.createFolder({
              workspaceId: wsId,
              parentFolderId: "",
              name: fldName.trim(),
            });
          }
        }
      }

      // 3. Connect Drive source if provided
      if (driveUrl.trim()) {
        const folderId = extractDriveFolderId(driveUrl);
        if (folderId) {
          const source = await driveSourceRepository.addSource({
            folderId,
            url: driveUrl.trim(),
            name: `${workspaceName || "Study"} Drive`,
          });
          // Initiate scan in background
          void driveScanner.scanSource(source.id);
        }
      }

      toast.success("Study library configured!");
    } catch (err) {
      console.error("Error setting up onboarding library:", err);
    } finally {
      setSubmitting(false);
      onComplete();
    }
  }, [workspaceName, folders, driveUrl, onComplete]);

  return (
    <Dialog open={open} onOpenChange={() => undefined}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-[540px] p-0 overflow-hidden border-border/80 bg-background shadow-2xl rounded-2xl"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
              {step}
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              Step {step} of 4
            </span>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={onComplete}
            className="text-xs text-muted-foreground hover:text-foreground h-7"
          >
            Skip to App
          </Button>
        </div>

        {/* Step Content */}
        <div className="px-6 py-5 min-h-[300px] flex flex-col justify-center">
          {/* STEP 1: Workspace */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground tracking-tight sm:text-lg">
                  Welcome to Studytrix
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Studytrix is your local-first personal study library. Let&apos;s create your first workspace.
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <label className="text-xs font-medium text-foreground">Workspace Name</label>
                <Input
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="e.g. GATE Preparation, Algorithms..."
                  className="text-sm h-9"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] text-muted-foreground">Quick suggestions:</span>
                <div className="flex flex-wrap gap-1.5">
                  {WORKSPACE_SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setWorkspaceName(suggestion)}
                      className="text-[11px] rounded-md border border-border/60 bg-muted/30 px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Folders */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground tracking-tight sm:text-lg">
                  Organize into Folders
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Structure your study material into folders inside <strong>{workspaceName}</strong>.
                </p>
              </div>

              {/* Interactive Folder Preview */}
              <div className="rounded-xl border border-border/60 bg-card p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground pb-1 border-b border-border/40">
                  <Folder className="size-4 text-primary" />
                  {workspaceName}
                </div>

                <div className="space-y-1.5 pl-3">
                  {folders.map((fld) => (
                    <div
                      key={fld}
                      className="flex items-center justify-between rounded-lg bg-muted/40 px-2.5 py-1.5 text-xs text-foreground group"
                    >
                      <div className="flex items-center gap-2">
                        <FolderPlus className="size-3.5 text-muted-foreground" />
                        <span>{fld}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFolder(fld)}
                        className="text-muted-foreground hover:text-rose-500 p-0.5"
                        title="Remove folder"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Input
                    value={newFolderInput}
                    onChange={(e) => setNewFolderInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddFolder();
                      }
                    }}
                    placeholder="Add custom folder..."
                    className="h-7 text-xs flex-1"
                  />
                  <Button
                    type="button"
                    size="xs"
                    variant="secondary"
                    onClick={handleAddFolder}
                    disabled={!newFolderInput.trim()}
                    className="h-7 text-xs"
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Google Drive Source */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground tracking-tight sm:text-lg">
                  Bring in Google Drive Materials
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Have lecture slides or books in a shared Google Drive folder? Link it to index and access offline.
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <label className="text-xs font-medium text-foreground">
                  Public Drive Folder URL <span className="text-muted-foreground font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <HardDrive className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    value={driveUrl}
                    onChange={(e) => setDriveUrl(e.target.value)}
                    placeholder="https://drive.google.com/drive/folders/..."
                    className="text-xs h-9 pl-8"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Folders must be set to &quot;Anyone with the link can view&quot;. No Google login needed.
                </p>
              </div>
            </div>
          )}

          {/* STEP 4: Ready */}
          {step === 4 && (
            <div className="space-y-4 text-center py-2">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mx-auto">
                <CheckCircle2 className="size-6" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground sm:text-lg">
                  Your Study Library is Ready!
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                  <strong>{workspaceName}</strong> has been initialized with {folders.length} folders.
                  {driveUrl ? " Google Drive discovery is running." : ""}
                </p>
              </div>

              <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-left max-w-sm mx-auto space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                  <Command className="size-3.5 text-primary" />
                  Pro-tip: Quick Search
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Press <kbd className="font-mono bg-background border px-1 rounded text-[10px]">⌘K</kbd> anywhere in Studytrix to instantly search files, folders, and tags.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border/40 bg-muted/10">
          <div>
            {step > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3 | 4)}
                disabled={submitting}
                className="h-8 text-xs gap-1"
              >
                <ArrowLeft className="size-3" />
                Back
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step < 4 ? (
              <Button
                type="button"
                size="sm"
                onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3 | 4)}
                className="h-8 text-xs gap-1 font-medium"
              >
                Continue
                <ArrowRight className="size-3" />
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={() => void handleFinish()}
                disabled={submitting}
                className="h-8 text-xs gap-1 font-medium"
              >
                <Sparkles className="size-3.5" />
                {submitting ? "Opening..." : "Open Study Library"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
