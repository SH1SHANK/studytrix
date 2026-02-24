"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { IconX } from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type DialogContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  dismissOnOverlayClick: boolean
  dismissOnEscape: boolean
}

const DialogContext = React.createContext<DialogContextValue | null>(null)

function useDialogContext(): DialogContextValue {
  const context = React.useContext(DialogContext)
  if (!context) {
    throw new Error("Dialog components must be used inside <Dialog>")
  }

  return context
}

function Dialog({
  open,
  defaultOpen = false,
  onOpenChange,
  dismissOnOverlayClick = true,
  dismissOnEscape = true,
  children,
}: {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  dismissOnOverlayClick?: boolean
  dismissOnEscape?: boolean
  children: React.ReactNode
}) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen)
  const isControlled = typeof open === "boolean"
  const resolvedOpen = isControlled ? open : internalOpen

  const setOpen = React.useCallback((nextOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(nextOpen)
    }
    onOpenChange?.(nextOpen)
  }, [isControlled, onOpenChange])

  return (
    <DialogContext.Provider
      value={{
        open: resolvedOpen,
        setOpen,
        dismissOnOverlayClick,
        dismissOnEscape,
      }}
    >
      {children}
    </DialogContext.Provider>
  )
}

function DialogTrigger({
  className,
  onClick,
  ...props
}: React.ComponentProps<"button">) {
  const { setOpen } = useDialogContext()

  return (
    <button
      data-slot="dialog-trigger"
      className={className}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) {
          setOpen(true)
        }
      }}
      {...props}
    />
  )
}

function DialogPortal({ children }: { children?: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || typeof document === "undefined") {
    return null
  }

  return createPortal(children, document.body)
}

function DialogClose({
  className,
  onClick,
  children,
  ...props
}: React.ComponentProps<"button">) {
  const { setOpen } = useDialogContext()

  return (
    <button
      data-slot="dialog-close"
      className={className}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) {
          setOpen(false)
        }
      }}
      {...props}
    >
      {children}
    </button>
  )
}

function DialogOverlay({
  className,
  onClick,
  ...props
}: React.ComponentProps<"div">) {
  const { open, setOpen, dismissOnOverlayClick } = useDialogContext()
  if (!open) {
    return null
  }

  return (
    <div
      data-slot="dialog-overlay"
      className={cn(
        "data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 fixed inset-0 z-50 bg-black/40 backdrop-blur-md duration-300",
        className
      )}
      onClick={(event) => {
        onClick?.(event)
        if (
          dismissOnOverlayClick &&
          !event.defaultPrevented &&
          event.target === event.currentTarget
        ) {
          setOpen(false)
        }
      }}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  onKeyDown,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  const { open, setOpen, dismissOnEscape } = useDialogContext()

  React.useEffect(() => {
    if (!open) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (dismissOnEscape && event.key === "Escape") {
        setOpen(false)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [dismissOnEscape, open, setOpen])

  if (!open) {
    return null
  }

  return (
    <DialogPortal>
      <DialogOverlay />
      <div
        data-slot="dialog-content"
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={cn(
          "bg-background data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 ring-foreground/10 grid max-h-[85dvh] max-w-[calc(100%-2rem)] gap-4 overflow-y-auto rounded-xl p-4 text-xs/relaxed ring-1 duration-100 sm:max-w-sm fixed top-1/2 left-1/2 z-50 w-full -translate-x-1/2 -translate-y-1/2 outline-none",
          className
        )}
        onKeyDown={onKeyDown}
        {...props}
      >
        {children}
        {showCloseButton && (
          <Button
            data-slot="dialog-close"
            type="button"
            variant="ghost"
            className="absolute top-2 right-2"
            size="icon-sm"
            onClick={() => setOpen(false)}
          >
            <IconX />
            <span className="sr-only">Close</span>
          </Button>
        )}
      </div>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("gap-1 flex flex-col", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  const { setOpen } = useDialogContext()

  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => setOpen(false)}
        >
          Close
        </Button>
      ) : null}
    </div>
  )
}

function DialogTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      data-slot="dialog-title"
      className={cn("text-sm font-medium", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="dialog-description"
      className={cn("text-muted-foreground *:[a]:hover:text-foreground text-xs/relaxed *:[a]:underline *:[a]:underline-offset-3", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
