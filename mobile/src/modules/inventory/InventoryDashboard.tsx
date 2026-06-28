// Inventory dashboard body (mobile) — stats, product distribution, stock value,
// and recent products.

import * as React from 'react'

import { InventoryPermissions, type ProductDto } from '@turbohesap/shared'

import { ChartCard, type Datum, MiniBarChart, RecentCard, Section, SegmentBar } from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useNav } from '../../navigation/nav-context'
import { InventoryStats } from './InventoryStats'

function group<T>(items: T[], key: (i: T) => string, val: (i: T) => number): Datum[] {
  const m = new Map<string, number>()
  for (const it of items) m.set(key(it), (m.get(key(it)) ?? 0) + val(it))
  return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
}

export function InventoryDashboard() {
  const nav = useNav()
  const { hasPermission } = useAuth()
  const products = useAsync(() => api.inventory.products.list(), [], {
    enabled: hasPermission(InventoryPermissions.productsRead),
  })
  const list = products.data ?? []
  const cat = (p: ProductDto) => p.category?.name ?? 'Kategorisiz'
  const byCat = group(list, cat, () => 1).slice(0, 5)
  const valueByCat = group(list, cat, (p) => p.quantity * (p.salePrice ?? 0)).filter((d) => d.value > 0).slice(0, 5)
  const recent = [...list]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 5)
    .map((p) => ({ id: p.id, title: p.name, subtitle: `${p.code}${p.category ? ` · ${p.category.name}` : ''}`, at: p.createdAt, onPress: () => nav.navigate('inventory.products.detail', { id: p.id }, p.name) }))

  return (
    <>
      <InventoryStats />
      
      <Section title="Grafikler & Dağılım">
        <ChartCard title="Ürün dağılımı" subtitle="Kategoriye göre" isEmpty={byCat.length === 0}>
          <SegmentBar data={byCat} />
        </ChartCard>
        
        <ChartCard title="Stok değeri" subtitle="Kategoriye göre (satış fiyatına göre)" isEmpty={valueByCat.length === 0}>
          <MiniBarChart data={valueByCat} format={(n) => n.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} />
        </ChartCard>
      </Section>

      <RecentCard title="Son eklenen ürünler" icon="box" items={recent} emptyText="Henüz ürün yok" />
    </>
  )
}
