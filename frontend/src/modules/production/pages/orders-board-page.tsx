import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Factory, Plus } from 'lucide-react'

import {
  PRODUCTION_ORDER_STATUS_LABELS,
  ProductionPermissions,
  type ManufacturingOrderDto,
  type ProductionOrderStatus,
} from '@turbohesap/shared'

import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { formatDate } from '@/lib/datetime'
import { PageHeader, PageWrapper } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { MoCreateDialog } from '../components/mo-create-dialog'
import { PriorityBadge } from '../components/status-badge'
import { formatQty } from '../format'

const COLUMNS: ProductionOrderStatus[] = ['draft', 'confirmed', 'in_progress', 'done', 'cancelled']

const COLUMN_ACCENT: Record<ProductionOrderStatus, string> = {
  draft: 'border-t-muted-foreground/40',
  confirmed: 'border-t-info',
  in_progress: 'border-t-warning',
  done: 'border-t-success',
  cancelled: 'border-t-destructive',
}

export function OrdersBoardPage() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(ProductionPermissions.read)
  const canWrite = hasPermission(ProductionPermissions.ordersWrite)
  const [createOpen, setCreateOpen] = React.useState(false)

  const query = useQuery({
    queryKey: ['production', 'orders', 'list'],
    queryFn: () => api.production.orders.list(),
    enabled: canRead,
  })

  const list = query.data ?? []
  const byStatus = (s: ProductionOrderStatus) => list.filter((o) => o.status === s)

  return (
    <PermissionRequired permission={ProductionPermissions.read}>
      <PageWrapper>
        <PageHeader
          title="Üretim Emirleri"
          description="Duruma göre pano — kart açmak için tıklayın"
          actions={
            canWrite ? (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus /> Yeni Emir
              </Button>
            ) : null
          }
        />

        {query.isLoading ? (
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
            {COLUMNS.map((s) => (
              <Skeleton key={s} className="h-64 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {COLUMNS.map((status) => {
              const items = byStatus(status)
              return (
                <div key={status} className="flex w-72 shrink-0 flex-col">
                  <div
                    className={cn(
                      'mb-2 flex items-center justify-between rounded-lg border border-t-2 bg-card px-3 py-2',
                      COLUMN_ACCENT[status],
                    )}
                  >
                    <span className="text-sm font-medium">{PRODUCTION_ORDER_STATUS_LABELS[status]}</span>
                    <Badge variant="secondary">{items.length}</Badge>
                  </div>
                  <div className="flex flex-col gap-2">
                    {items.length === 0 ? (
                      <p className="rounded-lg border border-dashed py-6 text-center text-xs text-muted-foreground">
                        Kayıt yok
                      </p>
                    ) : (
                      items.map((mo) => <MoCard key={mo.id} mo={mo} onClick={() => navigate({ to: '/production/orders/$id', params: { id: mo.id } })} />)
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {canWrite ? (
          <MoCreateDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            onCreated={(mo) => navigate({ to: '/production/orders/$id', params: { id: mo.id } })}
          />
        ) : null}
      </PageWrapper>
    </PermissionRequired>
  )
}

function MoCard({ mo, onClick }: { mo: ManufacturingOrderDto; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg border bg-card p-3 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/30"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
          <Factory className="size-3.5" />
          {mo.orderNo}
        </span>
        <PriorityBadge priority={mo.priority} />
      </div>
      <p className="mt-1 line-clamp-2 text-sm font-medium">{mo.productName}</p>
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span className="tabular-nums">
          {formatQty(mo.producedQuantity)} / {formatQty(mo.plannedQuantity)} {mo.unit}
        </span>
        {mo.dueDate ? <span>{formatDate(mo.dueDate)}</span> : null}
      </div>
    </button>
  )
}
