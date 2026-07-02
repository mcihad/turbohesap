// Üretim gösterge paneli — Üretim Emri (MO) sayıları, durum dağılımı, hızlı
// işlemler ve son emirler. Orders/stocktake dashboard şeklini yansıtır.

import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Factory,
  ListTree,
  Loader2,
  Plus,
  Wrench,
} from 'lucide-react'

import {
  PRODUCTION_ORDER_STATUS_LABELS,
  ProductionPermissions,
  type ProductionOrderStatus,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatGrid, StatTile } from '@/components/layout/stat-tile'
import { ChartCard } from '@/components/dashboard/chart-card'
import { RecentTable, type RecentRow } from '@/components/dashboard/recent-table'
import { type Datum, donutOption } from '@/components/dashboard/echart'
import { formatQty } from '../format'

export function ProductionDashboard() {
  const { hasPermission } = useAuth()
  const canRead = hasPermission(ProductionPermissions.read)
  const canOrdersWrite = hasPermission(ProductionPermissions.ordersWrite)
  const canWrite = hasPermission(ProductionPermissions.write)
  const canPlan = hasPermission(ProductionPermissions.planningRun)

  const ordersQuery = useQuery({
    queryKey: ['production', 'orders', 'list'],
    queryFn: () => api.production.orders.list(),
    enabled: canRead,
  })

  const list = ordersQuery.data ?? []
  const loading = ordersQuery.isLoading

  const countBy = (s: ProductionOrderStatus) => list.filter((o) => o.status === s).length
  const openCount = countBy('confirmed') + countBy('in_progress')

  const byStatus: Datum[] = (
    ['draft', 'confirmed', 'in_progress', 'done', 'cancelled'] as ProductionOrderStatus[]
  )
    .map((s) => ({ name: PRODUCTION_ORDER_STATUS_LABELS[s], value: countBy(s) }))
    .filter((d) => d.value > 0)

  const recent: RecentRow[] = [...list]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 6)
    .map((o) => ({
      id: o.id,
      name: `${o.orderNo} · ${o.productName}`,
      sub: PRODUCTION_ORDER_STATUS_LABELS[o.status],
      value: `${formatQty(o.producedQuantity)} / ${formatQty(o.plannedQuantity)}`,
      at: o.createdAt,
      to: '/production/orders/$id',
      params: { id: o.id },
    }))

  return (
    <>
      <StatGrid>
        <StatTile icon={Factory} tone="primary" label="Toplam Emir" value={list.length} loading={loading} />
        <StatTile icon={Loader2} tone="warning" label="Açık / Üretimde" value={openCount} loading={loading} />
        <StatTile icon={ClipboardList} tone="info" label="Onaylandı" value={countBy('confirmed')} loading={loading} />
        <StatTile icon={CheckCircle2} tone="success" label="Tamamlandı" value={countBy('done')} loading={loading} />
      </StatGrid>

      {/* Hızlı işlemler */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Hızlı İşlemler</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {canOrdersWrite ? (
            <Button asChild size="sm">
              <Link to="/production/orders">
                <Plus /> Üretim Emri
              </Link>
            </Button>
          ) : null}
          {canWrite ? (
            <Button asChild variant="outline" size="sm">
              <Link to="/production/boms/new">
                <ListTree /> Yeni Reçete
              </Link>
            </Button>
          ) : null}
          <Button asChild variant="outline" size="sm">
            <Link to="/production/work-orders">
              <Wrench /> Saha Terminali
            </Link>
          </Button>
          {canPlan ? (
            <Button asChild variant="outline" size="sm">
              <Link to="/production/planning">
                <CalendarClock /> Planlama
              </Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard
          title="Emir dağılımı"
          subtitle="Duruma göre"
          option={donutOption(byStatus, 'Emir')}
          loading={loading}
          isEmpty={byStatus.length === 0}
        />
        <RecentTable
          title="Son üretim emirleri"
          icon={Factory}
          valueHeader="Üretilen/Planlanan"
          rows={recent}
          loading={loading}
          emptyText="Henüz üretim emri yok"
        />
      </div>
    </>
  )
}
