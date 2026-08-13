import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close
const DialogTitle = DialogPrimitive.Title
const DialogDescription = DialogPrimitive.Description

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-foreground/25 backdrop-blur-[3px] transition-opacity duration-300 data-[state=closed]:opacity-0 data-[state=open]:opacity-100",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showClose = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showClose?: boolean
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid max-h-[88vh] w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto border border-border bg-background shadow-[0_24px_80px_-24px_rgb(0_0_0/0.25)] outline-none",
          "duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          "data-[state=closed]:scale-[0.98] data-[state=closed]:opacity-0",
          "data-[state=open]:scale-100 data-[state=open]:opacity-100",
          "motion-safe:transition-[opacity,transform]",
          className
        )}
        {...props}
      >
        {children}
        {showClose && (
          <DialogPrimitive.Close
            className="absolute top-5 right-5 flex size-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogClose,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
}
