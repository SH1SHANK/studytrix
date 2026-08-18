"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X as IconX } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type SheetContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  dismissOnOverlayClick: boolean;
  dismissOnEscape: boolean;
};

const SheetContext = React.createContext<SheetContextValue | null>(null);

function useSheetContext(): SheetContextValue {
  const context = React.useContext(SheetContext);
  if (!context) {
    throw new Error("Sheet components must be used inside <Sheet>");
  }
  return context;
}

export function Sheet({
  open,
  defaultOpen = false,
  onOpenChange,
  dismissOnOverlayClick = true,
  dismissOnEscape = true,
  children,
}: {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  dismissOnOverlayClick?: boolean;
  dismissOnEscape?: boolean;
  children: React.ReactNode;
}) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const isControlled = typeof open === "boolean";
  const resolvedOpen = isControlled ? open : internalOpen;

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setInternalOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange],
  );

  return (
    <SheetContext.Provider
      value={{
        open: resolvedOpen,
        setOpen,
        dismissOnOverlayClick,
        dismissOnEscape,
      }}
    >
      {children}
    </SheetContext.Provider>
  );
}

export function SheetTrigger({
  asChild,
  children,
}: {
  asChild?: boolean;
  children: React.ReactElement<{ onClick?: React.MouseEventHandler }>;
}) {
  const { setOpen } = useSheetContext();

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: (event: React.MouseEvent) => {
        children.props.onClick?.(event);
        if (!event.defaultPrevented) {
          setOpen(true);
        }
      },
    });
  }

  return (
    <button type="button" onClick={() => setOpen(true)}>
      {children}
    </button>
  );
}

export function SheetContent({
  side = "left",
  showClose = true,
  className,
  children,
}: {
  side?: "left" | "right" | "top" | "bottom";
  showClose?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const { open, setOpen, dismissOnOverlayClick, dismissOnEscape } = useSheetContext();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open || !dismissOnEscape) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, dismissOnEscape, setOpen]);

  if (!mounted || !open) return null;

  const sideClasses = {
    left: "inset-y-0 left-0 h-full w-3/4 max-w-sm border-r animate-in slide-in-from-left duration-200",
    right: "inset-y-0 right-0 h-full w-3/4 max-w-sm border-l animate-in slide-in-from-right duration-200",
    top: "inset-x-0 top-0 border-b animate-in slide-in-from-top duration-200",
    bottom: "inset-x-0 bottom-0 border-t animate-in slide-in-from-bottom duration-200",
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={() => {
          if (dismissOnOverlayClick) {
            setOpen(false);
          }
        }}
        aria-hidden="true"
      />

      {/* Sheet panel */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "fixed z-50 bg-background shadow-xl focus:outline-none",
          sideClasses[side],
          className,
        )}
      >
        {children}
        {showClose && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-3 top-3 size-7 rounded-md text-muted-foreground hover:text-foreground"
            onClick={() => setOpen(false)}
            aria-label="Close"
          >
            <IconX className="size-4" />
          </Button>
        )}
      </div>
    </div>,
    document.body,
  );
}

export function SheetHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 p-4 text-left", className)}
      {...props}
    />
  );
}

export function SheetTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-base font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  );
}
