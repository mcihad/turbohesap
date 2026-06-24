import * as React from 'react'
import { ArrowRight, ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react'

import type {
  AuditAction,
  AuditLogChange,
  AuditLogDto,
} from '@turbohesap/shared'

import { formatDateTime, formatRelative } from '@/lib/datetime'
import { cn } from '@/lib/utils'
import { Skeleton } from './skeleton'

// Visual metadata per audit action — tone drives both the icon chip and labels.
const ACTION_META: Record<
  AuditAction,
  {
    label: string
    icon: typeof Plus
    chip: string
    text: string
  }
> = {
  Insert: {
    label: 'Eklendi',
    icon: Plus,
    chip: 'bg-success/10 text-success ring-success/25',
    text: 'text-success',
  },
  Update: {
    label: 'Güncellendi',
    icon: Pencil,
    chip: 'bg-info/10 text-info ring-info/25',
    text: 'text-info',
  },
  Delete: {
    label: 'Silindi',
    icon: Trash2,
    chip: 'bg-destructive/10 text-destructive ring-destructive/25',
    text: 'text-destructive',
  },
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '∅'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function shortId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 8)}…` : id
}

function ValueChip({
  tone,
  children,
}: {
  tone: 'old' | 'new'
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-block max-w-full truncate rounded px-1.5 py-0.5 font-mono text-[11px] leading-relaxed',
        tone === 'old'
          ? 'bg-destructive/10 text-destructive line-through'
          : 'bg-success/10 text-success',
      )}
    >
      {children}
    </span>
  )
}

function ChangeRow({
  change,
  action,
}: {
  change: AuditLogChange
  action: AuditAction
}) {
  const showOld = action !== 'Insert'
  const showNew = action !== 'Delete'
  return (
    <div className="grid grid-cols-[7rem_1fr] items-start gap-x-3 gap-y-1 px-3 py-2">
      <span className="truncate pt-0.5 text-xs font-medium text-muted-foreground">
        {change.field}
      </span>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        {showOld ? <ValueChip tone="old">{formatValue(change.oldValue)}</ValueChip> : null}
        {showOld && showNew ? (
          <ArrowRight className="size-3 shrink-0 text-muted-foreground/60" />
        ) : null}
        {showNew ? <ValueChip tone="new">{formatValue(change.newValue)}</ValueChip> : null}
      </div>
    </div>
  )
}

function AuditTrailItem({
  log,
  loadDetail,
  isLast,
}: {
  log: AuditLogDto
  loadDetail?: (id: string) => Promise<AuditLogDto>
  isLast: boolean
}) {
  const meta = ACTION_META[log.action] ?? ACTION_META.Update
  const Icon = meta.icon
  const expandable = log.changeCount > 0

  const [open, setOpen] = React.useState(false)
  const [changes, setChanges] = React.useState<AuditLogChange[] | null>(
    log.changes.length > 0 ? log.changes : null,
  )
  const [loading, setLoading] = React.useState(false)

  async function toggle() {
    if (!expandable) return
    const next = !open
    setOpen(next)
    if (next && changes === null && loadDetail) {
      setLoading(true)
      try {
        const full = await loadDetail(log.id)
        setChanges(full.changes)
      } catch {
        setChanges([])
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <div data-slot="audit-trail-item" className="relative pl-12">
      {/* Connector: runs from below this icon to the next one (skipped on the
          last item), so the line never passes through an icon or overshoots. */}
      {!isLast ? (
        <span
          aria-hidden
          className="absolute top-9 -bottom-3 left-[17px] w-px bg-border"
        />
      ) : null}

      {/* Action icon chip */}
      <span
        className={cn(
          'absolute top-0 left-0 flex size-9 items-center justify-center rounded-full',
          meta.chip,
        )}
      >
        <Icon className="size-4" />
      </span>

      <div className="overflow-hidden rounded-lg border bg-card transition-colors hover:border-border">
        <button
          type="button"
          onClick={toggle}
          disabled={!expandable}
          className={cn(
            'flex w-full items-center gap-3 px-3 py-2.5 text-left',
            expandable && 'cursor-pointer hover:bg-muted/40',
          )}
        >
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="text-sm font-semibold">{log.entityType}</span>
              {log.entityId ? (
                <span className="font-mono text-xs text-muted-foreground">
                  #{shortId(log.entityId)}
                </span>
              ) : null}
              <span className={cn('text-xs font-medium', meta.text)}>
                {meta.label}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
              <span className="font-medium text-foreground/70">
                {log.userName ?? 'Sistem'}
              </span>
              <span>·</span>
              <time title={formatDateTime(log.createdAt)}>
                {formatRelative(log.createdAt)}
              </time>
              {log.module ? (
                <>
                  <span>·</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 font-medium">
                    {log.module}
                  </span>
                </>
              ) : null}
            </div>
          </div>

          {expandable ? (
            <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
              <span className="tabular-nums">{log.changeCount} alan</span>
              <ChevronDown
                className={cn(
                  'size-4 transition-transform duration-200',
                  open && 'rotate-180',
                )}
              />
            </span>
          ) : null}
        </button>

        {open ? (
          <div className="border-t bg-muted/20">
            {loading ? (
              <div className="space-y-2 p-3">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-5 w-1/2" />
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {(changes ?? []).map((c) => (
                  <ChangeRow key={c.field} change={c} action={log.action} />
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}

/**
 * AuditTrail — a polished vertical timeline of audit entries. Presentational;
 * pass `logs`. When `loadDetail` is given, each row lazily fetches its full diff
 * on expand (lists ship only a `changeCount`). Reuse anywhere; `EntityAuditTrail`
 * (`modules/iam/components`) wraps it for entity detail pages.
 */
export function AuditTrail({
  logs,
  loading = false,
  emptyText = 'Kayıt yok.',
  loadDetail,
  className,
}: {
  logs: AuditLogDto[]
  loading?: boolean
  emptyText?: string
  loadDetail?: (id: string) => Promise<AuditLogDto>
  className?: string
}) {
  if (loading) {
    return (
      <div data-slot="audit-trail" className={cn('space-y-4', className)}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <Skeleton className="h-14 flex-1 rounded-lg" />
          </div>
        ))}
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        {emptyText}
      </p>
    )
  }

  return (
    <div data-slot="audit-trail" className={cn('space-y-3', className)}>
      {logs.map((log, i) => (
        <AuditTrailItem
          key={log.id}
          log={log}
          loadDetail={loadDetail}
          isLast={i === logs.length - 1}
        />
      ))}
    </div>
  )
}
