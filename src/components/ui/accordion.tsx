import * as React from "react"
import { Accordion as AccordionPrimitive } from "radix-ui"
import { Plus } from "lucide-react"

import { cn } from "@/lib/utils"

function Accordion({
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Root>) {
  return <AccordionPrimitive.Root data-slot="accordion" {...props} />
}

function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("border-b border-border", className)}
      {...props}
    />
  )
}

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "group flex flex-1 items-start justify-between gap-6 py-6 text-left text-lg leading-snug font-medium transition-colors outline-none hover:text-muted-foreground focus-visible:text-foreground md:text-xl",
          className
        )}
        {...props}
      >
        <span className="text-balance">{children}</span>
        <Plus
          aria-hidden
          className="mt-1 size-5 shrink-0 text-muted-foreground transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-data-[state=open]:rotate-[135deg]"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

/**
 * Height transition uses Radix's --radix-accordion-content-height together
 * with the accordion-down / accordion-up keyframes that ship in
 * shadcn/tailwind.css.
 */
function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className="overflow-hidden data-[state=closed]:animate-[accordion-up_300ms_cubic-bezier(0.16,1,0.3,1)] data-[state=open]:animate-[accordion-down_300ms_cubic-bezier(0.16,1,0.3,1)]"
      {...props}
    >
      <div className={cn("max-w-2xl pb-6 text-muted-foreground", className)}>
        {children}
      </div>
    </AccordionPrimitive.Content>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
