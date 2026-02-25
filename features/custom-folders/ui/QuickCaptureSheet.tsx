"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, Mic, PenSquare, StopCircle, Upload } from "lucide-react";
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

type CaptureMode = "photo" | "note" | "voice";

type DestinationOption = {
  id: string;
  label: string;
};

type QuickCaptureSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: CaptureMode;
  destinations: DestinationOption[];
  defaultDestinationId?: string;
  onSaveCapture: (input: {
    folderId: string;
    fileName: string;
    mimeType: string;
    blob: Blob;
    source: CaptureMode;
  }) => Promise<void> | void;
};

const DRAFT_STORAGE_KEY = "studytrix.capture.note.draft";
const LAST_DESTINATION_KEY = "studytrix.capture.last-destination";

function formatDateToken(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}_${hh}-${mm}`;
}

function bestSupportedMimeType(): string {
  if (typeof MediaRecorder === "undefined") {
    return "audio/webm";
  }

  const candidates = [
    "audio/webm;codecs=opus",
    "audio/ogg",
    "audio/mp4",
    "audio/webm",
  ];

  for (const candidate of candidates) {
    if (typeof MediaRecorder.isTypeSupported === "function" && MediaRecorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }
  return "audio/webm";
}

function extensionFromMime(mimeType: string): string {
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("wav")) return "wav";
  return "webm";
}

export function QuickCaptureSheet({
  open,
  onOpenChange,
  initialMode = "photo",
  destinations,
  defaultDestinationId,
  onSaveCapture,
}: QuickCaptureSheetProps) {
  const availableDestinations = useMemo(() => (
    destinations.length > 0
      ? destinations
      : [{ id: "unsorted_captures", label: "Unsorted Captures" }]
  ), [destinations]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);
  const recordingTimeoutRef = useRef<number | null>(null);
  const [mode, setMode] = useState<CaptureMode>(initialMode);
  const [destinationId, setDestinationId] = useState<string>(defaultDestinationId ?? availableDestinations[0]?.id ?? "unsorted_captures");
  const [isSaving, setIsSaving] = useState(false);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoFileName, setPhotoFileName] = useState("");

  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [hasDraft, setHasDraft] = useState(false);

  const [voiceState, setVoiceState] = useState<"ready" | "recording" | "preview">("ready");
  const [voiceMimeType, setVoiceMimeType] = useState("audio/webm");
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [voiceFileName, setVoiceFileName] = useState("");
  const [voicePreviewUrl, setVoicePreviewUrl] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [waveBars, setWaveBars] = useState<number[]>(new Array(20).fill(0.08));

  useEffect(() => {
    if (!open) {
      return;
    }

    setMode(initialMode);
  }, [initialMode, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const fromStorage = window.localStorage.getItem(LAST_DESTINATION_KEY);
    const candidate = fromStorage && availableDestinations.some((entry) => entry.id === fromStorage)
      ? fromStorage
      : defaultDestinationId && availableDestinations.some((entry) => entry.id === defaultDestinationId)
        ? defaultDestinationId
        : availableDestinations[0]?.id ?? "unsorted_captures";
    setDestinationId(candidate);
  }, [availableDestinations, defaultDestinationId, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) {
      setHasDraft(false);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as { title?: string; body?: string };
      setHasDraft(Boolean(parsed.body?.trim()));
    } catch {
      setHasDraft(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || mode !== "note") {
      return;
    }

    const id = window.setInterval(() => {
      const body = noteBody.trim();
      const title = noteTitle.trim();
      if (!body && !title) {
        return;
      }
      window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ title, body, updatedAt: Date.now() }));
    }, 5_000);

    return () => {
      window.clearInterval(id);
    };
  }, [mode, noteBody, noteTitle, open]);

  useEffect(() => {
    return () => {
      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
      if (voicePreviewUrl) {
        URL.revokeObjectURL(voicePreviewUrl);
      }
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
      if (recordingTimeoutRef.current !== null) {
        window.clearTimeout(recordingTimeoutRef.current);
      }
      mediaRecorderRef.current?.stop();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      audioContextRef.current?.close().catch(() => undefined);
    };
  }, [photoPreviewUrl, voicePreviewUrl]);

  const persistDestination = useCallback((id: string) => {
    window.localStorage.setItem(LAST_DESTINATION_KEY, id);
  }, []);

  const restoreDraft = useCallback(() => {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as { title?: string; body?: string };
      setNoteTitle(parsed.title ?? "");
      setNoteBody(parsed.body ?? "");
      setHasDraft(false);
      setMode("note");
    } catch {
      setHasDraft(false);
    }
  }, []);

  const dismissDraft = useCallback(() => {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    setHasDraft(false);
  }, []);

  const startWaveform = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) {
      return;
    }

    const data = new Uint8Array(analyser.frequencyBinCount);
    const loop = () => {
      analyser.getByteFrequencyData(data);
      const bars = new Array<number>(20).fill(0.06);
      const bucket = Math.floor(data.length / bars.length);
      for (let i = 0; i < bars.length; i += 1) {
        const start = i * bucket;
        const end = Math.min(data.length, start + bucket);
        let sum = 0;
        for (let j = start; j < end; j += 1) {
          sum += data[j] ?? 0;
        }
        const avg = end > start ? sum / (end - start) : 0;
        bars[i] = Math.max(0.06, Math.min(1, avg / 255));
      }
      setWaveBars(bars);
      rafRef.current = window.requestAnimationFrame(loop);
    };
    rafRef.current = window.requestAnimationFrame(loop);
  }, []);

  const stopVoiceRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimeoutRef.current !== null) {
      window.clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
  }, []);

  const handleStartRecording = useCallback(async () => {
    setVoiceError(null);
    setVoiceBlob(null);
    if (voicePreviewUrl) {
      URL.revokeObjectURL(voicePreviewUrl);
      setVoicePreviewUrl(null);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const mime = bestSupportedMimeType();
      setVoiceMimeType(mime);
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      mediaRecorderRef.current = recorder;
      const chunks: BlobPart[] = [];

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      source.connect(analyser);
      startWaveform();

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mime });
        setVoiceBlob(blob);
        const preview = URL.createObjectURL(blob);
        setVoicePreviewUrl(preview);
        setVoiceState("preview");
      };

      recorder.start();
      recordingStartedAtRef.current = Date.now();
      setVoiceState("recording");
      const ext = extensionFromMime(mime);
      setVoiceFileName(`Voice_${formatDateToken(new Date())}.${ext}`);

      recordingTimeoutRef.current = window.setTimeout(() => {
        stopVoiceRecording();
        toast.message("Recording stopped at 10 minutes.");
      }, 10 * 60_000);
    } catch {
      setVoiceError("Microphone access is required for voice notes.");
      setVoiceState("ready");
    }
  }, [startWaveform, stopVoiceRecording, voicePreviewUrl]);

  const savePhoto = useCallback(async () => {
    if (!photoFile || !photoFileName.trim()) {
      return;
    }

    const folderId = destinationId;
    setIsSaving(true);
    try {
      await onSaveCapture({
        folderId,
        fileName: photoFileName.trim(),
        mimeType: photoFile.type || "image/jpeg",
        blob: photoFile,
        source: "photo",
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  }, [destinationId, onOpenChange, onSaveCapture, photoFile, photoFileName]);

  const saveNote = useCallback(async () => {
    const body = noteBody.trim();
    if (!body) {
      return;
    }

    const title = noteTitle.trim() || `Note_${formatDateToken(new Date())}.md`;
    const fileName = title.endsWith(".md") ? title : `${title}.md`;
    setIsSaving(true);
    try {
      await onSaveCapture({
        folderId: destinationId,
        fileName,
        mimeType: "text/markdown",
        blob: new Blob([body], { type: "text/markdown" }),
        source: "note",
      });
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  }, [destinationId, noteBody, noteTitle, onOpenChange, onSaveCapture]);

  const saveVoice = useCallback(async () => {
    if (!voiceBlob || !voiceFileName.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      await onSaveCapture({
        folderId: destinationId,
        fileName: voiceFileName.trim(),
        mimeType: voiceMimeType,
        blob: voiceBlob,
        source: "voice",
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  }, [destinationId, onOpenChange, onSaveCapture, voiceBlob, voiceFileName, voiceMimeType]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && voiceState === "recording") {
          const startedAt = recordingStartedAtRef.current ?? Date.now();
          if (Date.now() - startedAt > 5_000) {
            const shouldClose = window.confirm("Stop recording and discard?");
            if (!shouldClose) {
              return;
            }
          }
          stopVoiceRecording();
          setVoiceState("ready");
          return;
        }

        if (nextOpen) {
          persistDestination(destinationId);
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="fixed inset-x-0 bottom-0 top-auto left-0 right-0 mx-auto max-h-[88dvh] w-full max-w-none rounded-t-3xl border-t p-0 sm:inset-auto sm:left-1/2 sm:right-auto sm:top-1/2 sm:max-h-[85dvh] sm:w-full sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl">
        <div className="mx-auto mt-3 h-1.5 w-14 rounded-full bg-muted" />
        <div className="max-h-[82dvh] overflow-y-auto px-5 pb-4 pt-3 sm:px-6">
          <DialogHeader className="space-y-1">
            <DialogTitle>Quick Capture</DialogTitle>
            <DialogDescription>Capture and store instantly in your Personal Repository.</DialogDescription>
          </DialogHeader>

          <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-border/70 bg-muted/35 p-1.5">
            {([
              { key: "photo", label: "Photo", icon: Camera },
              { key: "note", label: "Note", icon: PenSquare },
              { key: "voice", label: "Voice", icon: Mic },
            ] as const).map((entry) => (
              <button
                key={entry.key}
                type="button"
                onClick={() => setMode(entry.key)}
                className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors ${
                  mode === entry.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:bg-card/70"
                }`}
              >
                <entry.icon className="size-4" />
                {entry.label}
              </button>
            ))}
          </div>

          {hasDraft ? (
            <button
              type="button"
              onClick={restoreDraft}
              className="mt-3 w-full rounded-lg border border-amber-300/60 bg-amber-50/75 px-3 py-2 text-left text-xs text-amber-800"
            >
              You have an unsaved draft. Restore?
              <span
                role="button"
                tabIndex={0}
                className="ml-2 underline"
                onClick={(event) => {
                  event.stopPropagation();
                  dismissDraft();
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    event.stopPropagation();
                    dismissDraft();
                  }
                }}
              >
                Dismiss
              </span>
            </button>
          ) : null}

          <div className="mt-4 space-y-3">
            {mode === "photo" ? (
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) {
                      return;
                    }
                    if (photoPreviewUrl) {
                      URL.revokeObjectURL(photoPreviewUrl);
                    }
                    setPhotoFile(file);
                    setPhotoPreviewUrl(URL.createObjectURL(file));
                    setPhotoFileName(`Photo_${formatDateToken(new Date())}.jpg`);
                  }}
                />
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  <Camera className="size-4" />
                  Take Photo
                </Button>
                {photoPreviewUrl ? (
                  <img src={photoPreviewUrl} alt="Photo preview" className="max-h-56 w-full rounded-xl border border-border object-cover" />
                ) : null}
                <Input
                  value={photoFileName}
                  onChange={(event) => setPhotoFileName(event.target.value)}
                  placeholder="Photo filename"
                />
              </div>
            ) : null}

            {mode === "note" ? (
              <div className="space-y-2.5">
                <Input
                  value={noteTitle}
                  onChange={(event) => setNoteTitle(event.target.value)}
                  placeholder={`Note_${formatDateToken(new Date())}.md`}
                />
                <textarea
                  value={noteBody}
                  onChange={(event) => setNoteBody(event.target.value)}
                  placeholder="Start writing..."
                  className="min-h-44 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm"
                />
                {noteBody.length >= 500 ? (
                  <p className="text-xs text-muted-foreground">{noteBody.length} characters</p>
                ) : null}
              </div>
            ) : null}

            {mode === "voice" ? (
              <div className="space-y-3">
                {voiceError ? (
                  <p className="rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    {voiceError}
                  </p>
                ) : null}
                <div className="flex items-center gap-2">
                  {voiceState !== "recording" ? (
                    <Button type="button" variant="outline" onClick={() => void handleStartRecording()}>
                      <Mic className="size-4" />
                      Start Recording
                    </Button>
                  ) : (
                    <Button type="button" variant="destructive" onClick={stopVoiceRecording}>
                      <StopCircle className="size-4" />
                      Stop
                    </Button>
                  )}
                </div>

                <div className="flex h-16 items-end gap-1 rounded-xl border border-border bg-card/60 px-2 py-2">
                  {waveBars.map((value, index) => (
                    <span
                      key={`wave-${index}`}
                      className="block flex-1 rounded bg-primary/70 transition-all"
                      style={{ height: `${Math.round(value * 100)}%` }}
                    />
                  ))}
                </div>

                {voicePreviewUrl ? (
                  <audio controls className="w-full" src={voicePreviewUrl} />
                ) : null}

                <Input
                  value={voiceFileName}
                  onChange={(event) => setVoiceFileName(event.target.value)}
                  placeholder={`Voice_${formatDateToken(new Date())}.${extensionFromMime(voiceMimeType)}`}
                />
              </div>
            ) : null}
          </div>
        </div>

        <div className="border-t border-border/70 px-5 py-3 sm:px-6">
          <label className="mb-2 block text-xs font-medium text-muted-foreground">Save to</label>
          <select
            value={destinationId}
            onChange={(event) => {
              setDestinationId(event.target.value);
              persistDestination(event.target.value);
            }}
            className="mb-3 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            {availableDestinations.map((entry) => (
              <option key={entry.id} value={entry.id}>{entry.label}</option>
            ))}
          </select>

          {mode === "photo" ? (
            <Button type="button" className="w-full" disabled={!photoFile || isSaving} onClick={() => void savePhoto()}>
              <Upload className="size-4" />
              Save Photo
            </Button>
          ) : null}
          {mode === "note" ? (
            <Button type="button" className="w-full" disabled={!noteBody.trim() || isSaving} onClick={() => void saveNote()}>
              <Upload className="size-4" />
              Save Note
            </Button>
          ) : null}
          {mode === "voice" ? (
            <Button type="button" className="w-full" disabled={!voiceBlob || isSaving} onClick={() => void saveVoice()}>
              <Upload className="size-4" />
              Save Voice
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

