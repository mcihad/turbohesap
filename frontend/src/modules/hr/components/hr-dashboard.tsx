// İK & Bordro dashboard — headcount stats, an employment-type distribution
// donut, and the most recent payroll runs. Mirrors the orders dashboard shape.

import { useQuery } from '@tanstack/react-query'
import { BadgeDollarSign, CalendarClock, UserCheck, Users } from 'lucide-react'

import {
  EMPLOYMENT_TYPE_LABELS,
  HrPermissions,
  PAYROLL_RUN_STATUS_LABELS,
  type EmploymentType,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { StatGrid, StatTile } from '@/components/layout/stat-tile'
import { ChartCard } from '@/components/dashboard/chart-card'
import { RecentTable, type RecentRow } from '@/components/dashboard/recent-table'
import { type Datum, donutOption } from '@/components/dashboard/echart'
import { formatMoney, periodLabel } from '../format'

export function HrDashboard() {
  const { hasPermission } = useAuth()
  const canRead = hasPermission(HrPermissions.read)

  const employeesQuery = useQuery({
    queryKey: ['hr', 'employees', 'list'],
    queryFn: () => api.hr.employees.list(),
    enabled: canRead,
  })
  const runsQuery = useQuery({
    queryKey: ['hr', 'payroll', 'runs'],
    queryFn: () => api.hr.payroll.listRuns(),
    enabled: canRead,
  })

  const employees = employeesQuery.data ?? []
  const runs = runsQuery.data ?? []
  const loading = employeesQuery.isLoading || runsQuery.isLoading

  const active = employees.filter((e) => e.isActive)
  const sortedRuns = [...runs].sort((a, b) => b.year - a.year || b.month - a.month)
  const latestRun = sortedRuns[0]

  const byType: Datum[] = Object.entries(
    active.reduce<Record<string, number>>(
      (m, e) => ({ ...m, [e.employmentType]: (m[e.employmentType] ?? 0) + 1 }),
      {},
    ),
  ).map(([k, v]) => ({ name: EMPLOYMENT_TYPE_LABELS[k as EmploymentType] ?? k, value: v }))

  const recent: RecentRow[] = sortedRuns.slice(0, 6).map((r) => ({
    id: r.id,
    name: periodLabel(r.year, r.month),
    sub: `${PAYROLL_RUN_STATUS_LABELS[r.status]} · ${r.payslipCount} pusula`,
    value: formatMoney(r.totalNet),
    at: r.createdAt,
    to: '/hr/payroll/$id',
    params: { id: r.id },
  }))

  return (
    <>
      <StatGrid>
        <StatTile icon={Users} tone="primary" label="Toplam Personel" value={employees.length} loading={loading} />
        <StatTile icon={UserCheck} tone="success" label="Aktif Personel" value={active.length} loading={loading} />
        <StatTile
          icon={BadgeDollarSign}
          tone="info"
          label={latestRun ? `Bordro (${periodLabel(latestRun.year, latestRun.month)})` : 'Son Bordro'}
          value={latestRun ? formatMoney(latestRun.totalNet) : '—'}
          hint={latestRun ? `Maliyet ${formatMoney(latestRun.totalCost)}` : undefined}
          loading={loading}
        />
        <StatTile icon={CalendarClock} tone="warning" label="Bordro Dönemi" value={runs.length} loading={loading} />
      </StatGrid>

      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard
          title="Personel dağılımı"
          subtitle="Çalışma türüne göre"
          option={donutOption(byType, 'Personel')}
          loading={loading}
          isEmpty={byType.length === 0}
        />
        <RecentTable
          title="Son bordro dönemleri"
          icon={BadgeDollarSign}
          valueHeader="Net Toplam"
          rows={recent}
          loading={loading}
          emptyText="Henüz bordro yok"
        />
      </div>
    </>
  )
}
