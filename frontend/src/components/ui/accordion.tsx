import * as React from 'react'
import * as AccordionPrimitive from '@radix-ui/react-accordion'
import { ChevronDownIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

// Collect the `value`s of all descendant AccordionItem elements, so the wrapper
// can default to "everything open" when no open-state is provided.
function collectItemValues(children: React.ReactNode): string[] {
  const out: string[] = []
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return
    const props = child.props as { value?: unknown; children?: React.ReactNode }
    if (child.type === AccordionItem && typeof props.value === 'string') {
      out.push(props.value)
    }
    if (props.children) out.push(...collectItemValues(props.children))
  })
  return out
}

// Relaxed props so `type` is optional (defaults to "multiple"); we reconcile the
// Radix discriminated union internally.
type AccordionProps = {
  type?: 'single' | 'multiple'
  collapsible?: boolean
  value?: string | string[]
  defaultValue?: string | string[]
  onValueChange?: ((value: string) => void) | ((value: string[]) => void)
  className?: string
  id?: string
  children?: React.ReactNode
}

/**
 * Accordion — supports single (`type="single"`, one open at a time) and multiple
 * (default, many open). **Default behavior:** when no `value`/`defaultValue` is
 * given, a multiple accordion opens **all** items; pass `defaultValue` (or
 * `value`) to control it. `single` defaults to `collapsible`.
 */
function Accordion({ children, ...props }: AccordionProps) {
  const merged = { ...props } as Record<string, unknown>
  if (merged.type === 'single') {
    merged.collapsible = merged.collapsible ?? true
  } else {
    merged.type = merged.type ?? 'multiple'
    if (merged.value === undefined && merged.defaultValue === undefined) {
      merged.defaultValue = collectItemValues(children)
    }
  }
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      {...(merged as unknown as React.ComponentProps<
        typeof AccordionPrimitive.Root
      >)}
    >
      {children}
    </AccordionPrimitive.Root>
  )
}

function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn(
        'mb-2 overflow-hidden rounded-lg border bg-card last:mb-0',
        className,
      )}
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
          'group/acc flex flex-1 items-center justify-between gap-3 px-3.5 py-3 text-left text-sm font-medium outline-none transition-colors',
          'hover:bg-muted/50 data-[state=open]:bg-muted/30',
          'focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:ring-inset',
          'disabled:pointer-events-none disabled:opacity-50',
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon className="pointer-events-none size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]/acc:rotate-180" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className="overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
      {...props}
    >
      <div className={cn('border-t px-3.5 py-3', className)}>{children}</div>
    </AccordionPrimitive.Content>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
