// CRM satış kontrol paneli — pipeline seçici + "Benim İşlerim" filtresi, üst
// metrik kartları, huni/çubuk/donut grafikleri ve etkinlik liderlik tablosu.
// Verileri api.contacts.crm.dashboard'tan toplar.

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import type { EChartsOption } from 'echarts'
import { Gauge, Target, Timer, TrendingUp } from 'lucide-react'

import { ContactsPermissions, type CrmStageBucket } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { PageWrapper, PageHeader } from '@/components/layout/page'
import { StatGrid, StatTile } from '@/components/layout/stat-tile'
import { ChartCard } from '@/components/dashboard/chart-card'
import { type Datum, donutOption } from '@/components/dashboard/echart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatMoney } from '../format'

const ALL_PIPELINES = '__all__'

/** Horizontal bar where each bar is tinted with its stage color. */
function coloredBarOption(buckets: CrmStageBucket[], pick: (b: CrmStageBucket) => number): EChartsOption {
  return {
    grid: { left: 8, right: 16, top: 16, bottom: 4, containLabel: true },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'value' },
    yAxis: { type: 'category', data: buckets.map((b) => b.name) },
    series: [
      {
        type: 'bar',
        barMaxWidth: 28,
        data: buckets.map((b) => ({
          value: pick(b),
          itemStyle: { color: b.color, borderRadius: [0, 4, 4, 0] },
        })),
      },
    ],
  }
}

export function CrmDashboardPage() {
  const { hasPermission } = useAuth()
  const canRead = hasPermission(ContactsPermissions.opportunitiesRead)

  const [pipelineId, setPipelineId] = React.useState<string>(ALL_PIPELINES)
  const [mine, setMine] = React.useState(false)

  const pipelinesQuery = useQuery({
    queryKey: ['contacts', 'pipelines'],
    queryFn: () => api.contacts.pipelines.list(),
    enabled: canRead,
  })

  const dashboardQuery = useQuery({
    queryKey: ['contacts', 'crm', 'dashboard', { pipelineId, mine }],
    queryFn: () =>
      api.contacts.crm.dashboard({
        pipelineId: pipelineId === ALL_PIPELINES ? undefined : pipelineId,
        mine: mine || undefined,
      }),
    enabled: canRead,
  })

  const loading = dashboardQuery.isLoading
  const data = dashboardQuery.data

  const lossReasons: Datum[] = (data?.lossReasons ?? []).map((r) => ({
    name: r.reason || 'Belirtilmemiş',
    value: r.count,
  }))
  const funnel = data?.funnel ?? []
  const byStage = data?.byStage ?? []
  const leaderboard = data?.activityLeaderboard ?? []

  return (
    <PermissionRequired permission={ContactsPermissions.opportunitiesRead}>
      <PageWrapper>
        <PageHeader
          title="Satış kontrol paneli"
          description="Pipeline performansı, huni ve etkinlik özeti"
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch id="crm-mine" checked={mine} onCheckedChange={setMine} />
                <Label htmlFor="crm-mine" className="text-sm">
                  Benim İşlerim
                </Label>
              </div>
              <Select value={pipelineId} onValueChange={setPipelineId}>
                <SelectTrigger className="w-52" size="sm">
                  <SelectValue placeholder="Pipeline seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_PIPELINES}>Tüm pipeline'lar</SelectItem>
                  {(pipelinesQuery.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
        />

        <div className="space-y-3">
          <StatGrid>
            <StatTile
              icon={Target}
              tone="primary"
              label="Açık fırsat"
              value={data?.openCount ?? 0}
              hint={formatMoney(data?.openValue ?? 0)}
              loading={loading}
            />
            <StatTile
              icon={TrendingUp}
              tone="info"
              label="Ağırlıklı tahmin"
              value={formatMoney(data?.weightedForecast ?? 0)}
              hint={`${data?.wonCount ?? 0} kazanılan`}
              loading={loading}
            />
            <StatTile
              icon={Gauge}
              tone="success"
              label="Kazanma oranı"
              value={`%${Math.round(data?.winRate ?? 0)}`}
              hint={`${data?.lostCount ?? 0} kaybedilen`}
              loading={loading}
            />
            <StatTile
              icon={Timer}
              tone="warning"
              label="Ort. satış döngüsü"
              value={`${Math.round(data?.avgSalesCycleDays ?? 0)} gün`}
              hint={formatMoney(data?.wonValue ?? 0)}
              loading={loading}
            />
          </StatGrid>

          <div className="grid gap-3 lg:grid-cols-2">
            <ChartCard
              title="Satış hunisi"
              subtitle="Açık aşamalar · fırsat sayısı"
              option={coloredBarOption(funnel, (b) => b.count)}
              loading={loading}
              isEmpty={funnel.length === 0}
            />
            <ChartCard
              title="Aşamaya göre değer"
              subtitle="Pipeline aşamaları · tutar"
              option={coloredBarOption(byStage, (b) => b.value)}
              loading={loading}
              isEmpty={byStage.length === 0}
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <ChartCard
              title="Kayıp nedenleri"
              subtitle="Kaybedilen fırsat sayısı"
              option={donutOption(lossReasons, 'Kayıp')}
              loading={loading}
              isEmpty={lossReasons.length === 0}
            />
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Etkinlik liderlik tablosu</CardTitle>
                <p className="text-xs text-muted-foreground">Sorumluya göre etkinlikler</p>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                ) : leaderboard.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Etkinlik kaydı yok
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-muted-foreground">
                        <th className="pb-2 font-medium">Sorumlu</th>
                        <th className="pb-2 text-right font-medium">Toplam</th>
                        <th className="pb-2 text-right font-medium">Tamamlanan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((row) => (
                        <tr key={row.ownerId ?? row.ownerName} className="border-b last:border-0">
                          <td className="py-2 font-medium">{row.ownerName}</td>
                          <td className="py-2 text-right tabular-nums">{row.total}</td>
                          <td className="py-2 text-right tabular-nums text-success">
                            {row.completed}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </PageWrapper>
    </PermissionRequired>
  )
}
