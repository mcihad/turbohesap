import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  Banknote,
  LayoutGrid,
  Monitor,
  Receipt,
  ShoppingCart,
} from 'lucide-react'

import { PosPermissions } from '@turbohesap/shared'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { PageWrapper } from '@/components/layout/page'
import { Button } from '@/components/ui/button'
import { ChartCard } from '@/components/dashboard/chart-card'
import { barOption, donutOption, type Datum } from '@/components/dashboard/echart'
import { money, PAYMENT_METHOD_LABELS } from '../labels'

// POS module home — a dashboard inside the app shell (keeps the sidebar
// reachable). Big CTA launches the full-screen terminal; charts summarise sales
// by register, top products, and the payment mix (Apache ECharts).
export function PosDashboardPage() {
  const { hasPermission } = useAuth()
  const registersQuery = useQuery({
    queryKey: ['pos', 'registers'],
    queryFn: () => api.pos.registers.list(),
    enabled: hasPermission(PosPermissions.registersRead),
  })
  const sessionsQuery = useQuery({
    queryKey: ['pos', 'sessions', 'open'],
    queryFn: () => api.pos.sessions.list({ status: 'open' }),
    enabled: hasPermission(PosPermissions.sell),
  })
  const ordersQuery = useQuery({
    queryKey: ['pos', 'orders'],
    queryFn: () => api.pos.orders.list(),
    enabled: hasPermission(PosPermissions.sell),
  })

  const registers = registersQuery.data ?? []
  const openSessions = sessionsQuery.data ?? []
  const orders = React.useMemo(() => ordersQuery.data ?? [], [ordersQuery.data])
  const paid = React.useMemo(() => orders.filter((o) => o.status === 'paid'), [orders])

  const salesTotal = paid.reduce((s, o) => s + o.grandTotal, 0)

  // ── chart data (computed from recent orders) ──
  const byRegister = React.useMemo<Datum[]>(() => {
    const names = new Map(registers.map((r) => [r.id, r.name]))
    const sums = new Map<string, number>()
    for (const o of paid) sums.set(o.registerId, (sums.get(o.registerId) ?? 0) + o.grandTotal)
    return [...sums.entries()]
      .map(([id, value]) => ({ name: names.get(id) ?? '—', value: round2(value) }))
      .sort((a, b) => b.value - a.value)
  }, [paid, registers])

  const byProduct = React.useMemo<Datum[]>(() => {
    const sums = new Map<string, number>()
    for (const o of paid) for (const l of o.lines) sums.set(l.name, (sums.get(l.name) ?? 0) + l.lineTotal)
    return [...sums.entries()]
      .map(([name, value]) => ({ name, value: round2(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
      .reverse() // horizontal bar reads bottom→top
  }, [paid])

  const byMethod = React.useMemo<Datum[]>(() => {
    const sums = new Map<string, number>()
    for (const o of paid) for (const p of o.payments) sums.set(p.method, (sums.get(p.method) ?? 0) + p.amount)
    return [...sums.entries()].map(([m, value]) => ({
      name: PAYMENT_METHOD_LABELS[m] ?? m,
      value: round2(value),
    }))
  }, [paid])

  const loading = ordersQuery.isLoading

  return (
    <PermissionRequired permission={PosPermissions.sell}>
      <PageWrapper className="space-y-6">
        {/* Hero — opens the screen, no separate page title */}
        <div className="overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-2xs font-medium text-primary">
                <ShoppingCart className="size-3.5" />
                Satış Noktası
              </span>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Satışa başla</h1>
              <p className="max-w-md text-sm text-muted-foreground">
                Tam ekran satış terminalini aç, bir kasa seç ve hızlıca satış yap.
              </p>
            </div>
            <Button size="lg" asChild>
              <Link to="/pos">
                <ShoppingCart className="size-5" />
                Satış Ekranını Aç
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Toplam satış" value={money(salesTotal)} icon={Banknote} />
          <Stat label="Fiş (ödenen)" value={String(paid.length)} icon={Receipt} />
          <Stat label="Açık vardiya" value={String(openSessions.length)} icon={LayoutGrid} />
          <Stat label="Kasa" value={String(registers.length)} icon={Monitor} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <ChartCard
            title="Kasaya göre satış"
            subtitle="Ödenen fişlerin kasa bazında cirosu"
            className="lg:col-span-1"
            loading={loading}
            isEmpty={byRegister.length === 0}
            option={barOption(byRegister, { color: '#6d34d6' })}
          />
          <ChartCard
            title="En çok satan ürünler"
            subtitle="Ciroya göre ilk 8 ürün"
            className="lg:col-span-1"
            loading={loading}
            isEmpty={byProduct.length === 0}
            option={barOption(byProduct, { horizontal: true, color: '#2e74e6' })}
          />
          <ChartCard
            title="Ödeme dağılımı"
            subtitle="Tahsilat yöntemi kırılımı"
            className="lg:col-span-1"
            loading={loading}
            isEmpty={byMethod.length === 0}
            option={donutOption(byMethod, 'Tahsilat')}
          />
        </div>
      </PageWrapper>
    </PermissionRequired>
  )
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Monitor }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xl font-bold tabular-nums leading-tight">{value}</p>
        <p className="text-2xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}
