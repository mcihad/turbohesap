// Pipeline ayarları — pipeline'ları listele/oluştur, seçili pipeline'ın
// aşamalarını satır içi düzenle (ad, olasılık, tür, renk, çürüme günü), aşama
// ekle/sil ve sıralamayı yukarı/aşağı taşı (reorderStages). pipelinesWrite gated.

import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  ContactsPermissions,
  STAGE_TYPES,
  toApiError,
  type PipelineDto,
  type PipelineStageDto,
  type StageType,
  type UpdatePipelineStageRequest,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { PageWrapper, PageHeader } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const STAGE_TYPE_LABEL: Record<StageType, string> = {
  open: 'Açık',
  won: 'Kazanıldı',
  lost: 'Kaybedildi',
}

export function PipelineSettingsPage() {
  const qc = useQueryClient()
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [newPipelineName, setNewPipelineName] = React.useState('')
  const [newStageName, setNewStageName] = React.useState('')

  const invalidate = () => qc.invalidateQueries({ queryKey: ['contacts', 'pipelines'] })

  const pipelinesQuery = useQuery({
    queryKey: ['contacts', 'pipelines'],
    queryFn: () => api.contacts.pipelines.list(),
  })

  const pipelines = pipelinesQuery.data ?? []
  const selected = pipelines.find((p) => p.id === selectedId) ?? pipelines[0] ?? null

  const createPipeline = useMutation({
    mutationFn: (name: string) => api.contacts.pipelines.create({ name }),
    onSuccess: (created) => {
      toast.success('Pipeline oluşturuldu')
      setNewPipelineName('')
      setSelectedId(created.id)
      void invalidate()
    },
    onError: (e) => toast.error('Oluşturma başarısız', { description: toApiError(e).message }),
  })

  const removePipeline = useMutation({
    mutationFn: (id: string) => api.contacts.pipelines.remove(id),
    onSuccess: () => {
      toast.success('Pipeline silindi')
      setSelectedId(null)
      void invalidate()
    },
    onError: (e) => toast.error('Silme başarısız', { description: toApiError(e).message }),
  })

  const addStage = useMutation({
    mutationFn: ({ pipelineId, name }: { pipelineId: string; name: string }) =>
      api.contacts.pipelines.addStage(pipelineId, { name }),
    onSuccess: () => {
      toast.success('Aşama eklendi')
      setNewStageName('')
      void invalidate()
    },
    onError: (e) => toast.error('Aşama eklenemedi', { description: toApiError(e).message }),
  })

  const removeStage = useMutation({
    mutationFn: ({ pipelineId, stageId }: { pipelineId: string; stageId: string }) =>
      api.contacts.pipelines.removeStage(pipelineId, stageId),
    onSuccess: () => {
      toast.success('Aşama silindi')
      void invalidate()
    },
    onError: (e) => toast.error('Aşama silinemedi', { description: toApiError(e).message }),
  })

  const updateStage = useMutation({
    mutationFn: ({
      pipelineId,
      stageId,
      input,
    }: {
      pipelineId: string
      stageId: string
      input: UpdatePipelineStageRequest
    }) => api.contacts.pipelines.updateStage(pipelineId, stageId, input),
    onSuccess: () => {
      toast.success('Aşama güncellendi')
      void invalidate()
    },
    onError: (e) => toast.error('Güncelleme başarısız', { description: toApiError(e).message }),
  })

  const reorder = useMutation({
    mutationFn: ({ pipelineId, stageIds }: { pipelineId: string; stageIds: string[] }) =>
      api.contacts.pipelines.reorderStages(pipelineId, { stageIds }),
    onSuccess: () => void invalidate(),
    onError: (e) => toast.error('Sıralama başarısız', { description: toApiError(e).message }),
  })

  const move = (pipeline: PipelineDto, index: number, dir: -1 | 1) => {
    const ids = [...pipeline.stages].sort((a, b) => a.sortOrder - b.sortOrder).map((s) => s.id)
    const target = index + dir
    if (target < 0 || target >= ids.length) return
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    reorder.mutate({ pipelineId: pipeline.id, stageIds: ids })
  }

  return (
    <PermissionRequired permission={ContactsPermissions.pipelinesWrite}>
      <PageWrapper>
        <PageHeader
          title="Pipeline ayarları"
          description="Satış pipeline'larını ve aşamalarını yönetin"
        />

        <div className="grid gap-3 lg:grid-cols-[280px_1fr]">
          {/* Pipeline list */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Pipeline'lar</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pipelinesQuery.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 w-full" />
                  ))}
                </div>
              ) : pipelines.length === 0 ? (
                <p className="py-2 text-sm text-muted-foreground">Henüz pipeline yok</p>
              ) : (
                <ul className="space-y-1">
                  {pipelines.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(p.id)}
                        className={
                          'flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ' +
                          (selected?.id === p.id
                            ? 'bg-accent text-accent-foreground'
                            : 'hover:bg-accent/50')
                        }
                      >
                        <span className="min-w-0 truncate font-medium">{p.name}</span>
                        {p.isDefault ? (
                          <Badge variant="secondary" className="text-2xs">
                            Varsayılan
                          </Badge>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="space-y-2 border-t pt-3">
                <Label htmlFor="new-pipeline" className="text-xs">
                  Yeni pipeline
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="new-pipeline"
                    value={newPipelineName}
                    onChange={(e) => setNewPipelineName(e.target.value)}
                    placeholder="Pipeline adı"
                    className="h-9"
                  />
                  <Button
                    size="icon"
                    onClick={() => createPipeline.mutate(newPipelineName.trim())}
                    disabled={!newPipelineName.trim() || createPipeline.isPending}
                    aria-label="Pipeline ekle"
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stages of the selected pipeline */}
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm">
                {selected ? `${selected.name} aşamaları` : 'Aşamalar'}
              </CardTitle>
              {selected && !selected.isDefault ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm(`"${selected.name}" pipeline silinsin mi?`)) {
                      removePipeline.mutate(selected.id)
                    }
                  }}
                >
                  <Trash2 className="size-4 text-destructive" />
                  Pipeline sil
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-3">
              {!selected ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Düzenlemek için bir pipeline seçin
                </p>
              ) : (
                <>
                  <div className="space-y-2">
                    {[...selected.stages]
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((stage, i, arr) => (
                        <StageRow
                          key={stage.id}
                          stage={stage}
                          isFirst={i === 0}
                          isLast={i === arr.length - 1}
                          saving={updateStage.isPending}
                          onMove={(dir) => move(selected, i, dir)}
                          onSave={(input) =>
                            updateStage.mutate({
                              pipelineId: selected.id,
                              stageId: stage.id,
                              input,
                            })
                          }
                          onRemove={() => {
                            if (confirm(`"${stage.name}" aşaması silinsin mi?`)) {
                              removeStage.mutate({ pipelineId: selected.id, stageId: stage.id })
                            }
                          }}
                        />
                      ))}
                  </div>

                  <div className="flex gap-2 border-t pt-3">
                    <Input
                      value={newStageName}
                      onChange={(e) => setNewStageName(e.target.value)}
                      placeholder="Yeni aşama adı"
                      className="h-9"
                    />
                    <Button
                      onClick={() =>
                        addStage.mutate({ pipelineId: selected.id, name: newStageName.trim() })
                      }
                      disabled={!newStageName.trim() || addStage.isPending}
                    >
                      <Plus className="size-4" />
                      Aşama ekle
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </PageWrapper>
    </PermissionRequired>
  )
}

function StageRow({
  stage,
  isFirst,
  isLast,
  saving,
  onMove,
  onSave,
  onRemove,
}: {
  stage: PipelineStageDto
  isFirst: boolean
  isLast: boolean
  saving: boolean
  onMove: (dir: -1 | 1) => void
  onSave: (input: UpdatePipelineStageRequest) => void
  onRemove: () => void
}) {
  const [name, setName] = React.useState(stage.name)
  const [probability, setProbability] = React.useState(String(stage.probability))
  const [type, setType] = React.useState<StageType>(stage.type)
  const [color, setColor] = React.useState(stage.color)
  const [rottingDays, setRottingDays] = React.useState(String(stage.rottingDays))

  const dirty =
    name !== stage.name ||
    Number(probability) !== stage.probability ||
    type !== stage.type ||
    color !== stage.color ||
    Number(rottingDays) !== stage.rottingDays

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border bg-card p-3">
      <div className="flex flex-col gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onMove(-1)}
          disabled={isFirst}
          aria-label="Yukarı taşı"
        >
          <ArrowUp className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onMove(1)}
          disabled={isLast}
          aria-label="Aşağı taşı"
        >
          <ArrowDown className="size-4" />
        </Button>
      </div>

      <div className="min-w-[140px] flex-1 space-y-1">
        <Label className="text-2xs text-muted-foreground">Ad</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9" />
      </div>

      <div className="w-24 space-y-1">
        <Label className="text-2xs text-muted-foreground">Olasılık %</Label>
        <Input
          type="number"
          min={0}
          max={100}
          value={probability}
          onChange={(e) => setProbability(e.target.value)}
          className="h-9"
        />
      </div>

      <div className="w-36 space-y-1">
        <Label className="text-2xs text-muted-foreground">Tür</Label>
        <Select value={type} onValueChange={(v) => setType(v as StageType)}>
          <SelectTrigger className="h-9 w-full" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STAGE_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {STAGE_TYPE_LABEL[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-16 space-y-1">
        <Label className="text-2xs text-muted-foreground">Renk</Label>
        <Input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-9 p-1"
        />
      </div>

      <div className="w-24 space-y-1">
        <Label className="text-2xs text-muted-foreground">Çürüme (gün)</Label>
        <Input
          type="number"
          min={0}
          value={rottingDays}
          onChange={(e) => setRottingDays(e.target.value)}
          className="h-9"
        />
      </div>

      <div className="flex gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          disabled={!dirty || saving}
          onClick={() =>
            onSave({
              name,
              probability: Number(probability),
              type,
              color,
              rottingDays: Number(rottingDays),
            })
          }
          aria-label="Kaydet"
        >
          <Save className="size-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={onRemove} aria-label="Aşamayı sil">
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </div>
    </div>
  )
}
