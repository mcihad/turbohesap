// Genel (overview) dashboard body — a cross-module glance: system health, totals
// across the modules the user can access, a distribution chart, and recent audit
// activity.

import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  Boxes,
  Building2,
  ListChecks,
  Store,
  Users,
} from 'lucide-react'

import {
  IamPermissions,
  InventoryPermissions,
  LookupsPermissions,
  OrgPermissions,
  SalesPermissions,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { ChartCard } from '@/components/dashboard/chart-card'
import { Timeline, type DotTone, type TimelineItem } from '@/components/dashboard/timeline'
import { barOption, type Datum, lineOption } from '@/components/dashboard/echart'
import { StatGrid, StatTile } from '@/components/layout/stat-tile'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

const ACTION_TR: Record<string, string> = { Insert: 'eklendi', Update: 'güncellendi', Delete: 'silindi' }

export function GenelDashboard() {
  const { hasPermission } = useAuth()

  const health = useQuery({ queryKey: ['health'], queryFn: () => api.health.getHealth() })
  const products = useQuery({ queryKey: ['inventory', 'products'], queryFn: () => api.inventory.products.list(), enabled: hasPermission(InventoryPermissions.productsRead) })
  const branches = useQuery({ queryKey: ['org', 'branches'], queryFn: () => api.org.branches.list(), enabled: hasPermission(OrgPermissions.branchesRead) })
  const channels = useQuery({ queryKey: ['sales', 'channels'], queryFn: () => api.sales.channels.list(), enabled: hasPermission(SalesPermissions.channelsRead) })
  const users = useQuery({ queryKey: ['iam', 'users'], queryFn: () => api.iam.users.list(), enabled: hasPermission(IamPermissions.usersRead) })
  const lists = useQuery({ queryKey: ['lookups', 'lists'], queryFn: () => api.lookups.lists(), enabled: hasPermission(LookupsPermissions.read) })
  const audit = useQuery({
    queryKey: ['iam', 'audit-logs', { page: 1, pageSize: 8 }],
    queryFn: () => api.iam.auditLogs.list({ page: 1, pageSize: 8 }),
    enabled: hasPermission(IamPermissions.auditRead),
  })

  const dist: Datum[] = [
    { name: 'Ürün', value: products.data?.length ?? 0 },
    { name: 'Şube', value: branches.data?.length ?? 0 },
    { name: 'Kanal', value: channels.data?.length ?? 0 },
    { name: 'Kullanıcı', value: users.data?.length ?? 0 },
    { name: 'Liste', value: lists.data?.length ?? 0 },
  ].filter((d) => d.value > 0)

  const tone: Record<string, DotTone> = { Insert: 'success', Update: 'info', Delete: 'destructive' }
  const recent: TimelineItem[] = (audit.data?.items ?? []).map((a) => ({
    id: a.id,
    title: `${a.entityType} ${ACTION_TR[a.action] ?? a.action}`,
    subtitle: a.userName ?? 'sistem',
    at: a.createdAt,
    tone: tone[a.action] ?? 'primary',
  }))

  return (
    <>
      {/* Health */}
      <Card>
        <CardContent className="flex items-center justify-between gap-3 pt-6">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Activity className="size-5" />
            </span>
            <div>
              <p className="text-sm font-medium">Sistem durumu</p>
              <p className="text-xs text-muted-foreground">backend · /api/health</p>
            </div>
          </div>
          <Badge variant={health.data?.status === 'ok' ? 'success' : health.isLoading ? 'secondary' : 'destructive'}>
            {health.isLoading ? '…' : health.data?.status === 'ok' ? 'Çevrimiçi' : 'Erişilemiyor'}
          </Badge>
        </CardContent>
      </Card>

      <StatGrid>
        {hasPermission(InventoryPermissions.productsRead) ? <StatTile icon={Boxes} tone="primary" label="Ürün" value={products.data?.length ?? 0} loading={products.isLoading} /> : null}
        {hasPermission(OrgPermissions.branchesRead) ? <StatTile icon={Building2} tone="info" label="Şube" value={branches.data?.length ?? 0} loading={branches.isLoading} /> : null}
        {hasPermission(SalesPermissions.channelsRead) ? <StatTile icon={Store} tone="success" label="Satış kanalı" value={channels.data?.length ?? 0} loading={channels.isLoading} /> : null}
        {hasPermission(IamPermissions.usersRead) ? <StatTile icon={Users} tone="warning" label="Kullanıcı" value={users.data?.length ?? 0} loading={users.isLoading} /> : null}
        {hasPermission(LookupsPermissions.read) ? <StatTile icon={ListChecks} tone="muted" label="Tanım listesi" value={lists.data?.length ?? 0} loading={lists.isLoading} /> : null}
      </StatGrid>

      <ChartCard title="Haftalık etkinlik" subtitle="Son 7 gün · örnek veri" option={lineOption(['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'], [12, 18, 9, 22, 16, 7, 20])} height={200} />

      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard title="Varlık dağılımı" subtitle="Erişilebilir modüllerdeki kayıt sayıları" option={barOption(dist)} isEmpty={dist.length === 0} />
        {hasPermission(IamPermissions.auditRead) ? (
          <Timeline title="Son hareketler" icon={Activity} items={recent} loading={audit.isLoading} emptyText="Henüz hareket yok" />
        ) : (
          <ChartCard title="Hareketler" subtitle="Denetim erişimi gerekiyor" option={{}} isEmpty emptyText="Denetim kaydı yetkiniz yok" />
        )}
      </div>
    </>
  )
}
