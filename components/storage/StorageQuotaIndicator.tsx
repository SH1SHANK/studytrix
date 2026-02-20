"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  computeUsagePercent,
  formatBytes,
  getQuotaState,
} from "@/features/storage/storage.quota";
import { useSetting } from "@/ui/hooks/useSettings";

interface StorageQuotaIndicatorProps {
  quotaBytes: number | null;
  usageBytes: number | null;
}

export function StorageQuotaIndicator({
  quotaBytes, // Browser quota
  usageBytes, // Actual usage
}: StorageQuotaIndicatorProps) {
  // Fetch user-defined limit from settings (in MB)
  const [settingsLimitMb] = useSetting("storage_limit_mb");

  // Calculate effective quota based on user settings and browser limits
  const settingsLimitBytes =
    typeof settingsLimitMb === "number" && settingsLimitMb > 0
      ? settingsLimitMb * 1024 * 1024
      : Infinity;

  const effectiveQuotaBytes = Math.min(quotaBytes ?? Infinity, settingsLimitBytes);
  const finalQuota = effectiveQuotaBytes === Infinity ? null : effectiveQuotaBytes;

  const percent = computeUsagePercent(finalQuota, usageBytes);
  const quotaState = getQuotaState(percent);
  const value = percent ?? 0;

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  const strokeColor =
    quotaState === "alert"
      ? "var(--destructive)"
      : quotaState === "warn"
        ? "var(--chart-3)"
        : "var(--primary)";

  const message =
    quotaState === "alert"
      ? "Storage usage is above 90%."
      : quotaState === "warn"
        ? "Storage usage is above 70%."
        : quotaState === "normal"
          ? "Storage usage is within normal limits."
          : "Quota information is unavailable on this device.";

  return (
    <Card className="rounded-2xl border border-border/80 bg-card/80 shadow-sm">
      <CardHeader className="pb-0">
        <CardTitle id="storage-quota-title" className="text-base font-semibold text-foreground">
          Quota
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex items-center gap-4">
          <div className="relative h-24 w-24 shrink-0">
            <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
              <circle cx="50" cy="50" r={radius} strokeWidth="8" className="fill-none stroke-border/80" />
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
              <p className="text-sm font-semibold text-foreground">
                {percent !== null ? `${percent.toFixed(0)}%` : "N/A"}
              </p>
            </div>
          </div>

          <div className="space-y-1 text-sm text-muted-foreground">
            <p>
              Usage: <span className="font-medium text-foreground">{usageBytes !== null ? formatBytes(usageBytes) : "Unavailable"}</span>
            </p>
            <p>
              Quota: <span className="font-medium text-foreground">{finalQuota !== null ? formatBytes(finalQuota) : "Unavailable"}</span>
            </p>
            <p className="text-xs text-muted-foreground">{message}</p>
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
