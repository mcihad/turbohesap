// Inventory dashboard statistics (mobile) — products, low stock, stock value,
// categories. Same metrics as the web module dashboard.

import * as React from 'react'
import { View } from 'react-native'

import { InventoryPermissions } from '@turbohesap/shared'

import { Section, StatCard } from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useTheme } from '../../theme/theme-context'

export function InventoryStats() {
  const t = useTheme()
  const { hasPermission } = useAuth()
  const canProducts = hasPermission(InventoryPermissions.productsRead)
  const canCategories = hasPermission(InventoryPermissions.categoriesRead)
  const products = useAsync(() => api.inventory.products.list(), [], { enabled: canProducts })
  const categories = useAsync(() => api.inventory.categories.list(), [], { enabled: canCategories })

  const list = products.data ?? []
  const low = list.filter((p) => p.quantity <= p.minQuantity).length
  const stockValue = list.reduce((s, p) => s + p.quantity * (p.salePrice ?? 0), 0)

  return (
    <Section title="Stok Özetleri">
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[3] }}>
        <Cell><StatCard icon="box" tone="primary" label="Ürün" value={String(list.length)} /></Cell>
        <Cell><StatCard icon="alert-triangle" tone="warning" label="Düşük stok" value={String(low)} /></Cell>
        <Cell><StatCard icon="dollar-sign" tone="success" label="Stok değeri" value={stockValue.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} /></Cell>
        {canCategories ? (
          <Cell><StatCard icon="folder" tone="info" label="Kategori" value={String((categories.data ?? []).length)} /></Cell>
        ) : null}
      </View>
    </Section>
  )
}

function Cell({ children }: { children: React.ReactNode }) {
  return <View style={{ width: '47%', flexGrow: 1, flexDirection: 'row' }}>{children}</View>
}
