import { useDroppable } from '@dnd-kit/core'

import type { OpportunityDto, PipelineStageDto } from '@turbohesap/shared'

import { cn } from '@/lib/utils'
import { formatMoney } from '../format'
import { OpportunityCard } from './opportunity-card'

/**
 * One Kanban column = one pipeline stage. The whole column is a drop target, so a
 * card released anywhere over it (even on top of another card) lands in the stage.
 */
export function PipelineColumn({
  stage,
  opportunities,
  onOpen,
  dragDisabled = false,
}: {
  stage: PipelineStageDto
  opportunities: OpportunityDto[]
  onOpen: (id: string) => void
  dragDisabled?: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id, data: { stageId: stage.id } })

  const count = opportunities.length
  const currency = opportunities[0]?.currencyCode ?? 'TRY'
  const total = opportunities.reduce((s, o) => s + o.amount, 0)
  const weighted = opportunities.reduce((s, o) => s + (o.amount * o.probability) / 100, 0)

  return (
    <div className="flex h-full w-72 shrink-0 flex-col">
      {/* Header */}
      <div
        className="rounded-t-xl border border-b-0 bg-card px-3 py-2.5"
        style={{ borderTopColor: stage.color, borderTopWidth: 3 }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: stage.color }}
            />
            <span className="truncate text-sm font-semibold">{stage.name}</span>
          </div>
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-2xs font-medium tabular-nums text-muted-foreground">
            {count}
          </span>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-2xs text-muted-foreground">
          <span className="font-medium tabular-nums text-foreground">
            {formatMoney(total, currency)}
          </span>
          <span title="Ağırlıklı tahmin" className="tabular-nums">
            ~{formatMoney(weighted, currency)}
          </span>
        </div>
      </div>

      {/* Body / drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-1 flex-col gap-2 overflow-y-auto rounded-b-xl border border-t-0 bg-muted/30 p-2 transition-colors',
          isOver && 'bg-primary/10 ring-1 ring-inset ring-primary/40',
        )}
      >
        {count === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed py-8 text-xs text-muted-foreground">
            Fırsat yok
          </div>
        ) : (
          opportunities.map((o) => (
            <OpportunityCard key={o.id} opportunity={o} onOpen={onOpen} disabled={dragDisabled} />
          ))
        )}
      </div>
    </div>
  )
}
