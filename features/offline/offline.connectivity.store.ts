"use client";

import { create } from "zustand";

type EffectiveConnection =
  | "slow-2g"
  | "2g"
  | "3g"
  | "4g"
  | string;

type ConnectivityState = {
  isOnline: boolean;
  effectiveType: EffectiveConnection | null;
  saveData: boolean;
  lastOnlineAt: number | null;
  lastOfflineAt: number | null;
  lastSyncAt: number | null;
  setOnlineState: (isOnline: boolean) => void;
  setConnection: (effectiveType: EffectiveConnection | null, saveData: boolean) => void;
  markSync: (timestamp?: number) => void;
};

function readConnection(): { effectiveType: EffectiveConnection | null; saveData: boolean } {
  if (typeof navigator === "undefined") {
    return {
      effectiveType: null,
      saveData: false,
    };
  }

  const connection = (navigator as Navigator & {
    connection?: {
      effectiveType?: EffectiveConnection;
      saveData?: boolean;
    };
  }).connection;

  return {
    effectiveType: connection?.effectiveType ?? null,
    saveData: Boolean(connection?.saveData),
  };
}

const initialOnline = typeof navigator === "undefined" ? true : navigator.onLine;
const initialConnection = readConnection();

export const useOfflineConnectivityStore = create<ConnectivityState>((set) => ({
  isOnline: initialOnline,
  effectiveType: initialConnection.effectiveType,
  saveData: initialConnection.saveData,
  lastOnlineAt: initialOnline ? Date.now() : null,
  lastOfflineAt: initialOnline ? null : Date.now(),
  lastSyncAt: null,

  setOnlineState: (isOnline) => {
    set((state) => ({
      isOnline,
      lastOnlineAt: isOnline ? Date.now() : state.lastOnlineAt,
      lastOfflineAt: isOnline ? state.lastOfflineAt : Date.now(),
    }));
  },

  setConnection: (effectiveType, saveData) => {
    set({
      effectiveType,
      saveData,
    });
  },

  markSync: (timestamp) => {
    set({
      lastSyncAt: timestamp ?? Date.now(),
    });
  },
}));

export function registerConnectivityListeners(): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const setOnlineState = useOfflineConnectivityStore.getState().setOnlineState;
  const setConnection = useOfflineConnectivityStore.getState().setConnection;

  const handleOnline = () => {
    setOnlineState(true);
  };

  const handleOffline = () => {
    setOnlineState(false);
  };

  const handleConnectionChange = () => {
    const connection = readConnection();
    setConnection(connection.effectiveType, connection.saveData);
  };

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  const connection = (navigator as Navigator & {
    connection?: EventTarget & {
      addEventListener?: (type: string, callback: EventListener) => void;
      removeEventListener?: (type: string, callback: EventListener) => void;
    };
  }).connection;
  connection?.addEventListener?.("change", handleConnectionChange);

  handleOnline();
  handleConnectionChange();

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
    connection?.removeEventListener?.("change", handleConnectionChange);
  };
}
