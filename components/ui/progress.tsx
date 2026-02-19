import * as React from "react"

import { cn } from "@/lib/utils"

interface ProgressProps extends React.ComponentProps<"div"> {
  value?: number | null
  max?: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function Progress({
  className,
  value = 0,
  max = 100,
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
      aria-valuenow={Math.round(safeValue)}
      className={cn("bg-muted h-2.5 w-full overflow-hidden rounded-full", className)}
      {...props}
    >
      <div
        data-slot="progress-indicator"
        className="bg-primary h-full transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${100 - percent}%)` }}
      />
    </div>
  )
}

export { Progress }
