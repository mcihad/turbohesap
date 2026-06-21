import * as React from 'react'
import { createPortal } from 'react-dom'

import { cn } from '@/lib/utils'
import { useLayout } from '@/lib/layout/use-layout'

/**
 * PageWrapper — the per-page container rendered inside the app shell's content
 * area.
 *
 * - `padded` (default): applies horizontal/vertical page padding and fills the
 *   full width of the content area. Use for normal pages.
 * - `padded={false}`: edge-to-edge, full-height. Use for maps, canvases, or any
 *   surface that must fill the viewport with no gutters.
 *
 * Content fills the available width by default (only the page-padding gutters on
 * each side). To cap and center a page for readability, pass a `max-w-*` via
 * `className` — `mx-auto` is kept so it centers automatically.
 */
export function PageWrapper({
  padded = true,
  className,
  children,
}: {
  padded?: boolean
  className?: string
  children: React.ReactNode
}) {
  if (!padded) {
    return <div className={cn('relative h-full w-full', className)}>{children}</div>
  }
  return (
    <div
      className={cn(
        'mx-auto w-full',
        'px-[var(--app-page-padding-x)] py-[var(--app-page-padding-y)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

/**
 * PageHeader — standard page heading band: title (+ optional description) on the
 * left, actions (buttons / dropdowns) on the right.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
  children,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
  children?: React.ReactNode
}) {
  return (
    <div className={cn('mb-6 flex flex-col gap-4', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h1 className="truncate text-2xl font-semibold tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>
      {children}
    </div>
  )
}

/** Convenience wrapper for grouping header action controls. */
export function PageActions({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div className={cn('flex items-center gap-2', className)} {...props} />
  )
}

/**
 * PageFooter — lets a page own the app's bottom footer bar (`AppFooter`).
 *
 * Renders nothing inline; it portals `children` into the footer slot and marks
 * the footer as page-controlled (hiding the default status strip) for as long as
 * it is mounted. Use it for contextual footers: table totals, selection counts,
 * thin page stats, bulk-action toolbars, etc.
 *
 *   <PageFooter>
 *     <PageFooterStat label="Rows" value="1,204" />
 *     <PageFooterStat label="Selected" value="12" />
 *   </PageFooter>
 */
export function PageFooter({ children }: { children: React.ReactNode }) {
  const { footerSlot, setPageFooterActive } = useLayout()

  React.useEffect(() => {
    setPageFooterActive(true)
    return () => setPageFooterActive(false)
  }, [setPageFooterActive])

  if (!footerSlot) return null
  return createPortal(
    <div className="flex w-full items-center gap-4 overflow-x-auto">
      {children}
    </div>,
    footerSlot,
  )
}

/** A compact label/value pair for thin footer stat strips. */
export function PageFooterStat({
  label,
  value,
  className,
}: {
  label: React.ReactNode
  value: React.ReactNode
  className?: string
}) {
  return (
    <span className={cn('flex items-center gap-1.5 whitespace-nowrap', className)}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </span>
  )
}
