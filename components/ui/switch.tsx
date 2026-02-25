"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"

type SwitchSize = "sm" | "default"

type BaseSwitchProps = Omit<SwitchPrimitive.Root.Props, "checked" | "defaultChecked" | "onCheckedChange"> & {
  size?: SwitchSize
}

type ControlledSwitchProps = {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  defaultChecked?: never
}

type UncontrolledSwitchProps = {
  checked?: never
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

type SwitchProps = BaseSwitchProps & (ControlledSwitchProps | UncontrolledSwitchProps)

function resolveTrackSizeClass(size: SwitchSize): string {
  if (size === "sm") {
    return "h-4 w-7"
  }

  return "h-5 w-9"
}

function resolveThumbSizeClass(size: SwitchSize): string {
  if (size === "sm") {
    return "size-3"
  }

  return "size-4"
}

function resolveThumbOffsetClass(size: SwitchSize): string {
  if (size === "sm") {
    return "data-unchecked:translate-x-[1px] data-checked:translate-x-[calc(100%+1px)]"
  }

  return "data-unchecked:translate-x-[1px] data-checked:translate-x-[calc(100%+1px)]"
}

function Switch({ className, size = "default", ...props }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer inline-flex shrink-0 items-center rounded-full border border-transparent transition-colors outline-none",
        "data-checked:bg-primary data-unchecked:bg-input/80",
        "focus-visible:ring-2 focus-visible:ring-ring/50",
        "data-disabled:cursor-not-allowed data-disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/30",
        resolveTrackSizeClass(size),
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full bg-background shadow-sm ring-0 transition-transform duration-200",
          "dark:data-unchecked:bg-foreground dark:data-checked:bg-primary-foreground",
          resolveThumbSizeClass(size),
          resolveThumbOffsetClass(size),
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
