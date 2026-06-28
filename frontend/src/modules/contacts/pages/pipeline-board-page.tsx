import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { Plus, User, X } from 'lucide-react'
import { toast } from 'sonner'

import {
  ContactsPermissions,
  toApiError,
  type OpportunityDto,
  type PipelineDto,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { PageHeader, PageWrapper } from '@/components/layout/page'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { OwnerSelect } from '../components/owner-select'
import { OpportunityDialog } from '../components/opportunity-dialog'
import { CloseOpportunityDialog } from '../components/close-opportunity-dialog'
import { OpportunityCard } from '../components/opportunity-card'
import { PipelineColumn } from '../components/pipeline-column'

export function PipelineBoardPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canReadOpps = hasPermission(ContactsPermissions.opportunitiesRead)
  const canWrite = hasPermission(ContactsPermissions.opportunitiesWrite)
  const canReadPipelines = hasPermission(ContactsPermissions.pipelinesRead)

  // ── Filters / selection ──────────────────────────────────────────────
  const [pipelineId, setPipelineId] = React.useState<string | null>(null)
  const [mine, setMine] = React.useState(false)
  const [ownerId, setOwnerId] = React.useState<string | null>(null)

  const pipelinesQuery = useQuery({
    queryKey: ['contacts', 'pipelines'],
    queryFn: () => api.contacts.pipelines.list(),
    enabled: canReadPipelines,
  })
  const pipelines = pipelinesQuery.data ?? []

  // Default to the org's default pipeline once they load.
  React.useEffect(() => {
    if (pipelineId || pipelines.length === 0) return
    const def = pipelines.find((p) => p.isDefault) ?? pipelines[0]
    if (def) setPipelineId(def.id)
  }, [pipelines, pipelineId])

  const pipeline: PipelineDto | undefined = pipelines.find((p) => p.id === pipelineId)
  const stages = React.useMemo(
    () => (pipeline ? [...pipeline.stages].sort((a, b) => a.sortOrder - b.sortOrder) : []),
    [pipeline],
  )

  const oppsKey = React.useMemo(
    () => ['contacts', 'opportunities', { pipelineId, mine, ownerId: mine ? null : ownerId }] as const,
    [pipelineId, mine, ownerId],
  )

  const oppsQuery = useQuery({
    queryKey: oppsKey,
    queryFn: () =>
      api.contacts.opportunities.list({
        pipelineId: pipelineId!,
        mine: mine || undefined,
        ownerId: mine ? undefined : ownerId ?? undefined,
      }),
    enabled: canReadOpps && !!pipelineId,
  })
  const opportunities = oppsQuery.data ?? []

  const byStage = React.useMemo(() => {
    const map = new Map<string, OpportunityDto[]>()
    for (const s of stages) map.set(s.id, [])
    for (const o of opportunities) map.get(o.stageId)?.push(o)
    return map
  }, [stages, opportunities])

  // ── Drag & drop ──────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )
  const [activeOpp, setActiveOpp] = React.useState<OpportunityDto | null>(null)
  // Suppresses the click→navigate that the browser fires right after a drag.
  const justDragged = React.useRef(false)

  const move = useMutation({
    mutationFn: ({ id, stageId }: { id: string; stageId: string }) =>
      api.contacts.opportunities.move(id, { stageId }),
    onMutate: async ({ id, stageId }) => {
      await qc.cancelQueries({ queryKey: oppsKey })
      const prev = qc.getQueryData<OpportunityDto[]>(oppsKey)
      const stage = stages.find((s) => s.id === stageId)
      qc.setQueryData<OpportunityDto[]>(oppsKey, (old) =>
        (old ?? []).map((o) =>
          o.id === id
            ? {
                ...o,
                stageId,
                stageName: stage?.name ?? o.stageName,
                stageColor: stage?.color ?? o.stageColor,
                stageType: stage?.type ?? o.stageType,
                daysInStage: 0,
              }
            : o,
        ),
      )
      return { prev }
    },
    onError: (e, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(oppsKey, ctx.prev)
      toast.error('Taşıma başarısız', { description: toApiError(e).message })
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['contacts', 'opportunities'] }),
  })

  const handleDragStart = (e: DragStartEvent) => {
    setActiveOpp((e.active.data.current?.opportunity as OpportunityDto) ?? null)
  }

  const handleDragEnd = (e: DragEndEvent) => {
    const dragged = activeOpp
    setActiveOpp(null)
    // Guard the synthetic click that follows pointerup after a real drag.
    justDragged.current = true
    setTimeout(() => {
      justDragged.current = false
    }, 0)

    const { over } = e
    if (!dragged || !over) return
    const targetStageId = String(over.id)
    if (targetStageId === dragged.stageId) return

    const targetStage = stages.find((s) => s.id === targetStageId)
    if (!targetStage) return

    // Dropping into a won/lost stage closes the deal (captures a reason).
    if (targetStage.type === 'won' || targetStage.type === 'lost') {
      setClosing(dragged)
      return
    }
    move.mutate({ id: dragged.id, stageId: targetStageId })
  }

  // ── Dialogs ──────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = React.useState(false)
  const [closing, setClosing] = React.useState<OpportunityDto | null>(null)

  const handleOpen = (id: string) => {
    if (justDragged.current) return
    navigate({ to: '/contacts/opportunities/$id', params: { id } })
  }

  const invalidate = () => qc.invalidateQueries({ queryKey: ['contacts', 'opportunities'] })

  // ── Render ───────────────────────────────────────────────────────────
  const noPipelines = !pipelinesQuery.isLoading && pipelines.length === 0

  return (
    <PermissionRequired permission={ContactsPermissions.opportunitiesRead}>
      <PageWrapper padded={false} className="flex flex-col">
        <div className="px-[var(--app-page-padding-x)] pt-[var(--app-page-padding-y)]">
          <PageHeader
            title="Satış Hattı"
            description="Fırsatlarınızı aşamalar arasında sürükleyerek yönetin."
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <Select value={pipelineId ?? undefined} onValueChange={setPipelineId}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Satış hattı seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {pipelines.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                        {p.isDefault ? ' (Varsayılan)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant={mine ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setMine((m) => !m)}
                >
                  <User className="size-4" />
                  Benim İşlerim
                </Button>

                <div className="relative">
                  <div className={cn('w-44', mine && 'pointer-events-none opacity-50')}>
                    <OwnerSelect
                      value={ownerId}
                      onChange={setOwnerId}
                      placeholder="Tüm sorumlular"
                      allowUnassigned={false}
                    />
                  </div>
                  {ownerId && !mine ? (
                    <button
                      type="button"
                      aria-label="Sorumlu filtresini temizle"
                      onClick={() => setOwnerId(null)}
                      className="absolute top-1/2 right-8 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <X className="size-3.5" />
                    </button>
                  ) : null}
                </div>

                {canWrite ? (
                  <Button onClick={() => setCreateOpen(true)}>
                    <Plus className="size-4" />
                    Yeni fırsat
                  </Button>
                ) : null}
              </div>
            }
          />
        </div>

        {/* Board */}
        <div className="min-h-0 flex-1 px-[var(--app-page-padding-x)] pb-[var(--app-page-padding-y)]">
          {noPipelines ? (
            <EmptyBoard message="Henüz bir satış hattı tanımlanmamış." />
          ) : stages.length === 0 ? (
            <EmptyBoard message="Bu satış hattında aşama bulunmuyor." />
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={pointerWithin}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={() => setActiveOpp(null)}
            >
              <div className="flex h-full gap-3 overflow-x-auto pb-2">
                {stages.map((stage) => (
                  <PipelineColumn
                    key={stage.id}
                    stage={stage}
                    opportunities={byStage.get(stage.id) ?? []}
                    onOpen={handleOpen}
                    dragDisabled={!canWrite}
                  />
                ))}
              </div>

              <DragOverlay dropAnimation={null}>
                {activeOpp ? (
                  <div className="w-72">
                    <OpportunityCard opportunity={activeOpp} overlay />
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>

        <OpportunityDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          editing={null}
          onSaved={() => void invalidate()}
        />

        <CloseOpportunityDialog
          open={!!closing}
          onOpenChange={(o) => !o && setClosing(null)}
          opportunity={closing}
          onClosed={() => {
            setClosing(null)
            void invalidate()
          }}
        />
      </PageWrapper>
    </PermissionRequired>
  )
}

function EmptyBoard({ message }: { message: string }) {
  return (
    <div className="flex h-full min-h-[40vh] items-center justify-center rounded-xl border border-dashed bg-muted/30 text-sm text-muted-foreground">
      {message}
    </div>
  )
}
