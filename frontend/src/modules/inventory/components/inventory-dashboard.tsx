// Inventory dashboard — stats, charts (distribution + value + a mock weekly
// trend) and a recent-products table.

import { useQuery } from '@tanstack/react-query'
import { Package } from 'lucide-react'

import { InventoryPermissions, type ProductDto } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { ChartCard } from '@/components/dashboard/chart-card'
import { RecentTable, type RecentRow } from '@/components/dashboard/recent-table'
import { barOption, type Datum, donutOption, lineOption } from '@/components/dashboard/echart'
import { InventoryStats } from './inventory-stats'

const WEEK = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

function groupBy<T>(items: T[], key: (i: T) => string, val: (i: T) => number): Datum[] {
  const m = new Map<string, number>()
  for (const it of items) m.set(key(it), (m.get(key(it)) ?? 0) + val(it))
  return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
}

export function InventoryDashboard() {
  const { hasPermission } = useAuth()
  const products = useQuery({
    queryKey: ['inventory', 'products'],
    queryFn: () => api.inventory.products.list(),
    enabled: hasPermission(InventoryPermissions.productsRead),
  })

  const list = products.data ?? []
  const catName = (p: ProductDto) => p.category?.name ?? 'Kategorisiz'
  const byCategory = groupBy(list, catName, () => 1).slice(0, 7)
  const valueByCategory = groupBy(list, catName, (p) => p.quantity * (p.salePrice ?? 0)).filter((d) => d.value > 0).slice(0, 7)

  const recent: RecentRow[] = [...list]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 6)
    .map((p) => ({ id: p.id, name: p.name, sub: `${p.code}${p.category ? ` · ${p.category.name}` : ''}`, value: `${p.quantity}${p.unit ? ` ${p.unit}` : ''}`, at: p.createdAt }))

  return (
    <>
      <InventoryStats />
      <div className="grid gap-3 lg:grid-cols-2">
        <ChartCard title="Ürün dağılımı" subtitle="Kategoriye göre ürün sayısı" option={donutOption(byCategory, 'Ürün')} loading={products.isLoading} isEmpty={byCategory.length === 0} />
        <ChartCard title="Stok değeri" subtitle="Kategoriye göre (satış fiyatına göre)" option={barOption(valueByCategory, { horizontal: true })} loading={products.isLoading} isEmpty={valueByCategory.length === 0} />
      </div>
      <ChartCard title="Haftalık hareket" subtitle="Son 7 gün · örnek veri" option={lineOption(WEEK, [4, 7, 5, 9, 6, 3, 8])} height={200} />
      <RecentTable title="Son eklenen ürünler" icon={Package} valueHeader="Stok" rows={recent} loading={products.isLoading} emptyText="Henüz ürün yok" />
    </>
  )
}
