"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  computeUsagePercent,
  formatBytes,
  getQuotaState,
} from "@/features/storage/storage.quota";

interface StorageQuotaIndicatorProps {
  quotaBytes: number | null;
  usageBytes: number | null;
}

export function StorageQuotaIndicator({
  quotaBytes,
  usageBytes,
}: StorageQuotaIndicatorProps) {
  const percent = computeUsagePercent(quotaBytes, usageBytes);
  const quotaState = getQuotaState(percent);
  const value = percent ?? 0;

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  const strokeColor =
    quotaState === "alert"
      ? "#DC2626"
      : quotaState === "warn"
        ? "#D97706"
        : "#4F46E5";

  const message =
    quotaState === "alert"
      ? "Storage usage is above 90%."
      : quotaState === "warn"
        ? "Storage usage is above 70%."
        : quotaState === "normal"
          ? "Storage usage is within normal limits."
          : "Quota information is unavailable on this device.";

  return (
    <Card className="rounded-2xl border border-stone-200/80 bg-white/90 shadow-sm dark:border-stone-700/80 dark:bg-stone-900/80">
      <CardHeader className="pb-0">
        <CardTitle id="storage-quota-title" className="text-base font-semibold text-stone-900 dark:text-stone-100">
          Quota
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex items-center gap-4">
          <div className="relative h-24 w-24 shrink-0">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
              <circle cx="50" cy="50" r={radius} strokeWidth="8" className="fill-none stroke-stone-200 dark:stroke-stone-700" />
              <circle
                cx="50"
                cy="50"
                r={radius}
                strokeWidth="8"
                className="fill-none transition-all duration-500"
                stroke={strokeColor}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-center">
              <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                {percent !== null ? `${percent.toFixed(0)}%` : "N/A"}
              </p>
            </div>
          </div>

          <div className="space-y-1 text-sm text-stone-600 dark:text-stone-300">
            <p>
              Usage: <span className="font-medium text-stone-900 dark:text-stone-100">{usageBytes !== null ? formatBytes(usageBytes) : "Unavailable"}</span>
            </p>
            <p>
              Quota: <span className="font-medium text-stone-900 dark:text-stone-100">{quotaBytes !== null ? formatBytes(quotaBytes) : "Unavailable"}</span>
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400">{message}</p>
          </div>
        </div>

        <Progress
          value={percent ?? 0}
          aria-label="Storage quota usage percentage"
          className="h-2.5"
        />
      </CardContent>
    </Card>
  );
}
