"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CheckCircle2 as IconCircleCheck, Info as IconInfoCircle, AlertTriangle as IconAlertTriangle, AlertOctagon as IconAlertOctagon, Loader as IconLoader } from "lucide-react";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "classic" } = useTheme()
  const sonnerTheme: ToasterProps["theme"] = theme === "midnight" || theme === "eclipse" || theme === "graphite" ? "dark" : "light";

  return (
    <Sonner
      theme={sonnerTheme}
      className="toaster group"
      icons={{
        success: (
          <IconCircleCheck className="size-4" />
        ),
        info: (
          <IconInfoCircle className="size-4" />
        ),
        warning: (
          <IconAlertTriangle className="size-4" />
        ),
        error: (
          <IconAlertOctagon className="size-4" />
        ),
        loading: (
          <IconLoader className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
