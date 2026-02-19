import type { DownloadTask } from "./download.types";

export interface DownloadProgressEvent {
  taskId: string;
  progress: number;
  loadedBytes: number;
  totalBytes: number;
}

export interface DownloadFailureEvent {
  taskId: string;
  error: string;
}

export interface DownloadStateEvent {
  taskId: string;
}

export interface DownloadAnimationCompleteEvent {
  durationMs: number;
}

export interface DownloadEventMap {
  "download:added": { task: DownloadTask };
  "download:progress": DownloadProgressEvent;
  "download:completed": DownloadStateEvent;
  "download:failed": DownloadFailureEvent;
  "download:paused": DownloadStateEvent;
  "download:canceled": DownloadStateEvent;
  "download:animation-complete": DownloadAnimationCompleteEvent;
}

type EventName = keyof DownloadEventMap;
type Listener<T extends EventName> = (payload: DownloadEventMap[T]) => void;

class DownloadEventEmitter {
  private listeners = new Map<EventName, Set<Listener<EventName>>>();

  on<T extends EventName>(event: T, callback: Listener<T>): () => void {
    const current = this.listeners.get(event) ?? new Set<Listener<EventName>>();
    current.add(callback as Listener<EventName>);
    this.listeners.set(event, current);

    return () => {
      const active = this.listeners.get(event);
      if (!active) {
        return;
      }

      active.delete(callback as Listener<EventName>);
      if (active.size === 0) {
        this.listeners.delete(event);
      }
    };
  }

  emit<T extends EventName>(event: T, payload: DownloadEventMap[T]): void {
    const listeners = this.listeners.get(event);
    if (!listeners || listeners.size === 0) {
      return;
    }

    for (const listener of listeners) {
      (listener as Listener<T>)(payload);
    }
  }
}

export const downloadEvents = new DownloadEventEmitter();

export function on<T extends EventName>(
  event: T,
  callback: Listener<T>,
): () => void {
  return downloadEvents.on(event, callback);
}

export function emit<T extends EventName>(event: T, payload: DownloadEventMap[T]): void {
  downloadEvents.emit(event, payload);
}
