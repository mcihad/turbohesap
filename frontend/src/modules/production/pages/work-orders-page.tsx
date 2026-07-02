import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Pause, Play, ShieldCheck, Timer } from 'lucide-react'
import { toast } from 'sonner'

import {
  ProductionPermissions,
  toApiError,
  type WorkOrderDto,
  type WorkOrderStatus,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { PageHeader, PageWrapper } from '@/components/layout/page'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { QualityRecordDialog } from '../components/quality-record-dialog'
import { WoFinishDialog } from '../components/wo-finish-dialog'
import { WoStatusBadge } from '../components/status-badge'
import { formatMinutes, formatQty } from '../format'

const ACTIVE: WorkOrderStatus[] = ['pending', 'ready', 'in_progress', 'paused']

export function WorkOrdersPage() {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(ProductionPermissions.read)
  const canExecute = hasPermission(ProductionPermissions.workordersExecute)
  const canQuality = hasPermission(ProductionPermissions.qualityManage)

  const [scope, setScope] = React.useState<'active' | 'all'>('active')
  const [finishWo, setFinishWo] = React.useState<WorkOrderDto | null>(null)
  const [qualityWo, setQualityWo] = React.useState<WorkOrderDto | null>(null)

  const query = useQuery({
    queryKey: ['production', 'work-orders', 'list'],
    queryFn: () => api.production.workOrders.list(),
    enabled: canRead,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['production'] })

  const startM = useMutation({
    mutationFn: (id: string) => api.production.workOrders.start(id),
    onSuccess: () => {
      toast.success('İş emri başlatıldı')
      void invalidate()
    },
    onError: (e) => toast.error('Başlatılamadı', { description: toApiError(e).message }),
  })
  const pauseM = useMutation({
    mutationFn: (id: string) => api.production.workOrders.pause(id),
    onSuccess: () => {
      toast.success('Duraklatıldı')
      void invalidate()
    },
    onError: (e) => toast.error('İşlem başarısız', { description: toApiError(e).message }),
  })
  const resumeM = useMutation({
    mutationFn: (id: string) => api.production.workOrders.resume(id),
    onSuccess: () => {
      toast.success('Devam ediliyor')
      void invalidate()
    },
    onError: (e) => toast.error('İşlem başarısız', { description: toApiError(e).message }),
  })

  const all = query.data ?? []
  const list = scope === 'active' ? all.filter((w) => ACTIVE.includes(w.status)) : all

  return (
    <PermissionRequired permission={ProductionPermissions.read}>
      <PageWrapper>
        <PageHeader
          title="İş Emirleri — Saha Terminali"
          description="Operasyonları başlat, duraklat ve bitir"
          actions={
            <ToggleGroup
              type="single"
              variant="outline"
              value={scope}
              onValueChange={(v) => {
                if (v) setScope(v as 'active' | 'all')
              }}
            >
              <ToggleGroupItem value="active">Aktif</ToggleGroupItem>
              <ToggleGroupItem value="all">Tümü</ToggleGroupItem>
            </ToggleGroup>
          }
        />

        {query.isLoading ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full rounded-xl" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <p className="py-20 text-center text-muted-foreground">
            {scope === 'active' ? 'Aktif iş emri yok.' : 'İş emri yok.'}
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {list.map((w) => (
              <div key={w.id} className="flex flex-col rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-2xs text-muted-foreground">{w.manufacturingOrderNo}</p>
                    <p className="truncate text-sm font-semibold">
                      #{w.sequence} {w.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{w.workCenterName}</p>
                  </div>
                  <WoStatusBadge status={w.status} />
                </div>

                <p className="mt-2 truncate text-xs text-muted-foreground">{w.productName}</p>

                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="tabular-nums">
                    {formatQty(w.producedQuantity)} / {formatQty(w.plannedQuantity)} {w.unit}
                  </span>
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Timer className="size-3.5" />
                    {formatMinutes(w.actualMinutes)}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {canExecute && (w.status === 'pending' || w.status === 'ready') ? (
                    <Button size="sm" className="flex-1" disabled={startM.isPending} onClick={() => startM.mutate(w.id)}>
                      <Play /> Başlat
                    </Button>
                  ) : null}
                  {canExecute && w.status === 'in_progress' ? (
                    <>
                      <Button variant="outline" size="sm" disabled={pauseM.isPending} onClick={() => pauseM.mutate(w.id)}>
                        <Pause /> Duraklat
                      </Button>
                      <Button size="sm" className="flex-1" onClick={() => setFinishWo(w)}>
                        <CheckCircle2 /> Bitir
                      </Button>
                    </>
                  ) : null}
                  {canExecute && w.status === 'paused' ? (
                    <>
                      <Button variant="outline" size="sm" disabled={resumeM.isPending} onClick={() => resumeM.mutate(w.id)}>
                        <Play /> Devam
                      </Button>
                      <Button size="sm" className="flex-1" onClick={() => setFinishWo(w)}>
                        <CheckCircle2 /> Bitir
                      </Button>
                    </>
                  ) : null}
                  {canQuality && w.qualityCheckRequired && w.status !== 'done' && w.status !== 'cancelled' ? (
                    <Button variant="outline" size="sm" onClick={() => setQualityWo(w)}>
                      <ShieldCheck /> Kalite
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}

        {finishWo ? (
          <WoFinishDialog
            open={!!finishWo}
            onOpenChange={(o) => {
              if (!o) setFinishWo(null)
            }}
            workOrder={finishWo}
            onFinished={() => setFinishWo(null)}
          />
        ) : null}
        {qualityWo ? (
          <QualityRecordDialog
            open={!!qualityWo}
            onOpenChange={(o) => {
              if (!o) setQualityWo(null)
            }}
            manufacturingOrderId={qualityWo.manufacturingOrderId}
            workOrderId={qualityWo.id}
            defaultCheckType="operation"
            defaultQuantity={qualityWo.producedQuantity || qualityWo.plannedQuantity}
            onRecorded={() => setQualityWo(null)}
          />
        ) : null}
      </PageWrapper>
    </PermissionRequired>
  )
}
