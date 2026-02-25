import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <InputPrimitive
        ref={ref}
        type={type}
        data-slot="input"
        className={cn(
          "flex h-10 w-full min-w-0 rounded-xl border border-input bg-card px-3 py-2 text-sm text-foreground outline-none",
          "placeholder:text-muted-foreground",
          "transition-colors duration-150",
          "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35",
          "aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/25",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          className,
        )}
        {...props}
      />
    )
  },
)

Input.displayName = "Input"

export { Input }
