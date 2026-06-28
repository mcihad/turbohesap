import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Building2, Clock, Flame } from 'lucide-react'

import type { OpportunityDto } from '@turbohesap/shared'

import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { formatMoney } from '../format'

/** Build up-to-two-letter initials from a display name. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

/**
 * A single deal card on the Kanban board. Draggable via @dnd-kit; clicking it
 * (without dragging) opens the deal. The actual click→navigate is guarded by the
 * board so a finished drag does not also navigate.
 */
export function OpportunityCard({
  opportunity,
  onOpen,
  overlay = false,
  disabled = false,
}: {
  opportunity: OpportunityDto
  onOpen?: (id: string) => void
  /** Rendered inside a DragOverlay — skip the draggable wiring & dimming. */
  overlay?: boolean
  /** Disable dragging (e.g. user lacks write permission). */
  disabled?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: opportunity.id,
    data: { opportunity },
    disabled: overlay || disabled,
  })

  const style = overlay
    ? undefined
    : { transform: CSS.Translate.toString(transform) }

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={style}
      {...(overlay ? {} : attributes)}
      {...(overlay ? {} : listeners)}
      onClick={() => onOpen?.(opportunity.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen?.(opportunity.id)
        }
      }}
      className={cn(
        'group touch-none rounded-lg border bg-card p-3 text-left shadow-sm',
        'transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        disabled ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing',
        isDragging && !overlay && 'opacity-40',
        overlay && 'rotate-2 cursor-grabbing shadow-lg ring-1 ring-border',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-sm font-medium leading-snug">{opportunity.name}</p>
        {opportunity.isRotting ? (
          <Badge variant="destructive" className="shrink-0 gap-1 px-1.5 py-0 text-2xs">
            <Flame className="size-3" />
            Bekliyor
          </Badge>
        ) : null}
      </div>

      {opportunity.contact ? (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
          <Building2 className="size-3 shrink-0" />
          <span className="truncate">{opportunity.contact.name}</span>
        </p>
      ) : null}

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className="font-mono text-sm font-semibold tabular-nums">
          {formatMoney(opportunity.amount, opportunity.currencyCode)}
        </span>
        {opportunity.owner ? (
          <Avatar className="size-6" title={opportunity.owner.name}>
            <AvatarFallback className="text-2xs">
              {initials(opportunity.owner.name)}
            </AvatarFallback>
          </Avatar>
        ) : null}
      </div>

      <div className="mt-2 flex items-center justify-between text-2xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="size-3" />
          {opportunity.daysInStage} gün
        </span>
        <span className="tabular-nums">%{opportunity.probability}</span>
      </div>
    </div>
  )
}
