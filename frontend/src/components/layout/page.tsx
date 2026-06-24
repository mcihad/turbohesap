import * as React from 'react'
import { createPortal } from 'react-dom'
import { Search, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useLayout } from '@/lib/layout/use-layout'
import { Input } from '@/components/ui/input'
import { EntityAuditButton } from '@/modules/iam/components/entity-audit-button'

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

/** Parametric page search: a controlled box that declares which fields it covers. */
export interface PageSearch {
  value: string
  onChange: (value: string) => void
  /** Human-readable searched fields, e.g. ['Ad', 'E-posta'] — drives the placeholder/hint. */
  fields: string[]
  /** Override the auto-generated placeholder. */
  placeholder?: string
  className?: string
}

/** Reference to the entity a detail page is about — powers the standard audit button. */
export interface PageAuditRef {
  entityType: string
  entityId: string
  title?: string
}

function PageSearchBox({ value, onChange, fields, placeholder, className }: PageSearch) {
  const hint = placeholder ?? `${fields.join(', ')} içinde ara…`
  return (
    <div className={cn('relative w-full sm:w-64', className)}>
      <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={hint}
        title={fields.length ? `Aranan alanlar: ${fields.join(', ')}` : undefined}
        aria-label={hint}
        className="h-9 bg-background/60 pl-8"
      />
      {value ? (
        <button
          type="button"
          aria-label="Aramayı temizle"
          onClick={() => onChange('')}
          className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  )
}

/**
 * PageHeader — standard page heading band: title (+ description) with actions on
 * the right; an optional parametric **search** box on the left of a toolbar row;
 * and, for entity detail pages, an automatic **audit log** button (`audit`) shown
 * when the user has `iam.audit.read`.
 */
export function PageHeader({
  title,
  description,
  actions,
  search,
  audit,
  className,
  children,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  search?: PageSearch
  audit?: PageAuditRef
  className?: string
  children?: React.ReactNode
}) {
  const hasToolbar = Boolean(search || actions || audit)

  return (
    <div className={cn('mb-5', className)}>
      {/* Compact toolbar band: title/description (left) + search & actions
          grouped on the right of the same row, over a thin divider. */}
      <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          )}
        </div>

        {hasToolbar ? (
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
            {search ? <PageSearchBox {...search} /> : null}
            {audit ? (
              <EntityAuditButton
                entityType={audit.entityType}
                entityId={audit.entityId}
                title={audit.title}
              />
            ) : null}
            {actions}
          </div>
        ) : null}
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
 * it is mounted. Contextual footers use a **monospace** strip for page info and
 * short stats (totals, selection counts, filter state).
 *
 *   <PageFooter>
 *     <PageFooterStat label="Toplam" value="1.204" />
 *     <PageFooterStat label="Seçili" value="12" />
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
    <div className="flex w-full items-center gap-x-5 gap-y-1 overflow-x-auto font-mono text-xs">
      {children}
    </div>,
    footerSlot,
  )
}

/** A compact label/value pair for the monospace footer stat strip. */
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
      <span className="text-2xs tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      <span className="font-medium text-foreground tabular-nums">{value}</span>
    </span>
  )
}
