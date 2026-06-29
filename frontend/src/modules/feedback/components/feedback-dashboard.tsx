// Geri Bildirimler dashboard — counts by status, a type breakdown chart, and the
// most recently submitted feedback.

import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Inbox, Loader2, MessageSquareDot } from 'lucide-react'

import {
  FEEDBACK_STATUS_LABELS,
  FEEDBACK_TYPE_LABELS,
  FEEDBACK_TYPES,
  FeedbackPermissions,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { StatGrid, StatTile } from '@/components/layout/stat-tile'
import { ChartCard } from '@/components/dashboard/chart-card'
import { RecentTable, type RecentRow } from '@/components/dashboard/recent-table'
import { donutOption, type Datum } from '@/components/dashboard/echart'

export function FeedbackDashboard() {
  const { hasPermission } = useAuth()
  const canRead = hasPermission(FeedbackPermissions.read)
  const query = useQuery({
    queryKey: ['feedback', 'list'],
    queryFn: () => api.feedback.list(),
    enabled: canRead,
  })

  const items = query.data ?? []
  const loading = query.isLoading
  const count = (s: string) => items.filter((f) => f.status === s).length

  const byType: Datum[] = FEEDBACK_TYPES.map((t) => ({
    name: FEEDBACK_TYPE_LABELS[t],
    value: items.filter((f) => f.type === t).length,
  })).filter((d) => d.value > 0)

  const recent: RecentRow[] = [...items]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 6)
    .map((f) => ({
      id: f.id,
      name: f.title?.trim() || f.message.slice(0, 50) || FEEDBACK_TYPE_LABELS[f.type],
      sub: `${FEEDBACK_TYPE_LABELS[f.type]} · ${FEEDBACK_STATUS_LABELS[f.status]}`,
      at: f.createdAt,
      to: '/feedback/items',
    }))

  return (
    <>
      <StatGrid>
        <StatTile icon={Inbox} tone="primary" label="Toplam" value={items.length} loading={loading} />
        <StatTile icon={MessageSquareDot} tone="info" label="Yeni" value={count('new')} loading={loading} />
        <StatTile icon={Loader2} tone="warning" label="İnceleniyor" value={count('in_progress')} loading={loading} />
        <StatTile icon={CheckCircle2} tone="success" label="Tamamlandı" value={count('done')} loading={loading} />
      </StatGrid>
      <ChartCard
        title="Tipe göre dağılım"
        subtitle="Geri bildirim tiplerinin oranı"
        option={donutOption(byType)}
        height={260}
        loading={loading}
        isEmpty={byType.length === 0}
      />
      <RecentTable
        title="Son geri bildirimler"
        icon={MessageSquareDot}
        rows={recent}
        loading={loading}
        emptyText="Henüz geri bildirim yok"
      />
    </>
  )
}
