import * as React from "react"

import { cn } from "@/lib/utils"

function Slider({
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "type">) {
  return (
    <input
      type="range"
      data-slot="slider"
      className={cn(
        "accent-primary h-2 w-full cursor-pointer rounded-full bg-input/60 outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Slider }
