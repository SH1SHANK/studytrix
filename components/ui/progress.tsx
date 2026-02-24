import * as React from "react"

import { cn } from "@/lib/utils"

interface ProgressProps extends React.ComponentProps<"div"> {
  value?: number | null
  max?: number
  indeterminate?: boolean
  animated?: boolean
  indicatorClassName?: string
  trackClassName?: string
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function Progress({
  className,
  value = 0,
  max = 100,
  indeterminate = false,
  animated = false,
  indicatorClassName,
  trackClassName,
  ...props
}: ProgressProps) {
  const safeMax = max > 0 ? max : 100
  const safeValue = value === null ? 0 : clamp(value, 0, safeMax)
  const percent = (safeValue / safeMax) * 100

  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={indeterminate ? undefined : Math.round(safeValue)}
      className={cn("bg-muted relative h-2.5 w-full overflow-hidden rounded-full", trackClassName, className)}
      {...props}
    >
      {indeterminate ? (
        <div className="absolute inset-0">
          <div
            data-slot="progress-indicator"
            className={cn(
              "bg-primary/25 absolute inset-y-0 left-0 w-2/5 rounded-full",
              animated ? "animate-pulse" : "",
              indicatorClassName,
            )}
          />
        </div>
      ) : (
        <div
          data-slot="progress-indicator"
          className={cn(
            "bg-primary relative h-full transition-transform duration-300 ease-out",
            indicatorClassName,
          )}
          style={{ transform: `translateX(-${100 - percent}%)` }}
        >
          {animated ? (
            <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-white/35 via-white/0 to-transparent" />
          ) : null}
        </div>
      )}
    </div>
  )
}

export { Progress }
