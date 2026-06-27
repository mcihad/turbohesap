// Inventory dashboard statistics — products, categories, low stock, stock value.

import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, FolderTree, Package, Wallet } from 'lucide-react'

import { InventoryPermissions } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { StatGrid, StatTile } from '@/components/layout/stat-tile'

export function InventoryStats() {
  const { hasPermission } = useAuth()
  const canProducts = hasPermission(InventoryPermissions.productsRead)
  const canCategories = hasPermission(InventoryPermissions.categoriesRead)

  const productsQuery = useQuery({
    queryKey: ['inventory', 'products'],
    queryFn: () => api.inventory.products.list(),
    enabled: canProducts,
  })
  const categoriesQuery = useQuery({
    queryKey: ['inventory', 'categories'],
    queryFn: () => api.inventory.categories.list(),
    enabled: canCategories,
  })

  const products = productsQuery.data ?? []
  const active = products.filter((p) => p.isActive).length
  const lowStock = products.filter((p) => p.quantity <= p.minQuantity).length
  const stockValue = products.reduce((s, p) => s + p.quantity * (p.salePrice ?? 0), 0)
  const loading = productsQuery.isLoading

  return (
    <StatGrid>
      <StatTile icon={Package} tone="primary" label="Ürün" value={products.length} hint={`${active} aktif`} loading={loading} />
      <StatTile icon={AlertTriangle} tone="warning" label="Düşük stok" value={lowStock} hint="min. altında" loading={loading} />
      <StatTile icon={Wallet} tone="success" label="Stok değeri" value={stockValue.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} hint="satış fiyatına göre" loading={loading} />
      {canCategories ? (
        <StatTile icon={FolderTree} tone="info" label="Kategori" value={(categoriesQuery.data ?? []).length} loading={categoriesQuery.isLoading} />
      ) : null}
    </StatGrid>
  )
}
