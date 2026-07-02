import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { Package, Pencil, Plus, Trash2 } from 'lucide-react'

import {
  InventoryPermissions,
  PRODUCT_TYPES,
  type ListQuery,
  type ProductDto,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { PageWrapper } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataGrid, type ColumnDef } from '@/components/data-grid'
import type { QueryBuilderField } from '@/components/query-builder'
import { ProductFormDialog } from '../components/product-form-dialog'
import { money, productTypeLabel } from '../labels'

const TYPE_OPTIONS = PRODUCT_TYPES.map((t) => ({ value: t, label: productTypeLabel(t) }))
const BOOL_FIELDS: { key: string; label: string }[] = [
  { key: 'isActive', label: 'Aktif' },
  { key: 'trackStock', label: 'Stok takibi' },
  { key: 'hasVariants', label: 'Varyantlı' },
  { key: 'canBeSold', label: 'Satılabilir' },
  { key: 'canBePurchased', label: 'Satın alınabilir' },
  { key: 'canBeManufactured', label: 'Üretilebilir' },
]
const PRODUCT_QB_FIELDS: QueryBuilderField[] = [
  { key: 'code', label: 'Kod', type: 'text' },
  { key: 'name', label: 'Ad', type: 'text' },
  { key: 'brand', label: 'Marka', type: 'text' },
  { key: 'type', label: 'Tür', type: 'select', options: TYPE_OPTIONS },
  { key: 'unit', label: 'Birim', type: 'lookup', lookupList: 'birim' },
  { key: 'salePrice', label: 'Satış fiyatı', type: 'number' },
  { key: 'purchasePrice', label: 'Alış fiyatı', type: 'number' },
  { key: 'taxRate', label: 'KDV', type: 'number' },
  ...BOOL_FIELDS.map((b) => ({ key: b.key, label: b.label, type: 'boolean' as const })),
]

export function ProductsPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canWrite = hasPermission(InventoryPermissions.productsWrite)

  const [serverQuery, setServerQuery] = React.useState<ListQuery>({ page: 1, pageSize: 25 })
  const productsQuery = useQuery({
    queryKey: ['inventory', 'products', 'page', serverQuery],
    queryFn: () => api.inventory.products.listPage(serverQuery),
    enabled: hasPermission(InventoryPermissions.productsRead),
    placeholderData: keepPreviousData,
  })
  const categoriesQuery = useQuery({
    queryKey: ['inventory', 'categories'],
    queryFn: () => api.inventory.categories.list(),
    enabled: hasPermission(InventoryPermissions.categoriesRead),
  })

  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<ProductDto | null>(null)

  const invalidate = () => qc.invalidateQueries({ queryKey: ['inventory', 'products'] })

  const rows = productsQuery.data?.items ?? []
  const categories = categoriesQuery.data ?? []

  const columns: ColumnDef<ProductDto>[] = [
    {
      id: 'code', accessorKey: 'code', header: 'Kod', size: 130, meta: { filter: { type: 'text' } },
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground/60">
            {row.original.imageUrl ? <img src={row.original.imageUrl} alt="" className="size-full object-cover" /> : <Package className="size-3.5" />}
          </span>
          <span className="font-mono text-xs">{row.original.code}</span>
        </span>
      ),
    },
    { id: 'name', accessorKey: 'name', header: 'Ad', size: 260, meta: { filter: { type: 'text' } }, cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { id: 'category', accessorFn: (r) => r.category?.name ?? '', header: 'Kategori', size: 160, enableGrouping: true, enableColumnFilter: false, enableSorting: false, cell: ({ row }) => row.original.category ? <Badge variant="secondary">{row.original.category.name}</Badge> : <span className="text-muted-foreground">—</span> },
    { id: 'type', accessorKey: 'type', header: 'Tür', size: 120, enableGrouping: true, meta: { filter: { type: 'select', options: TYPE_OPTIONS } }, cell: ({ row }) => productTypeLabel(row.original.type) },
    { id: 'brand', accessorKey: 'brand', header: 'Marka', size: 130, enableGrouping: true, meta: { filter: { type: 'text' } }, cell: ({ row }) => row.original.brand || '—' },
    { id: 'unit', accessorKey: 'unit', header: 'Birim', size: 90, meta: { filter: { type: 'lookup', lookupList: 'birim' } }, cell: ({ row }) => row.original.unit || '—' },
    { id: 'salePrice', accessorKey: 'salePrice', header: 'Satış', size: 120, meta: { filter: { type: 'number' } }, cell: ({ row }) => <span className="tabular-nums">{row.original.salePrice == null ? '—' : money(row.original.salePrice, row.original.currency)}</span> },
    { id: 'purchasePrice', accessorKey: 'purchasePrice', header: 'Alış', size: 120, meta: { filter: { type: 'number' } }, cell: ({ row }) => <span className="tabular-nums">{row.original.purchasePrice == null ? '—' : money(row.original.purchasePrice, row.original.currency)}</span> },
    { id: 'taxRate', accessorKey: 'taxRate', header: 'KDV', size: 80, meta: { filter: { type: 'number' } }, cell: ({ row }) => row.original.taxRate == null ? '—' : `%${row.original.taxRate}` },
    { id: 'currency', accessorKey: 'currency', header: 'Döviz', size: 80, enableGrouping: true, enableColumnFilter: false },
    {
      id: 'totalStock', accessorKey: 'totalStock', header: 'Stok', size: 110, enableColumnFilter: false,
      cell: ({ row }) => row.original.trackStock
        ? <span className={`tabular-nums ${row.original.totalStock <= row.original.minQuantity ? 'text-destructive' : ''}`}>{row.original.totalStock}{row.original.unit ? ` ${row.original.unit}` : ''}</span>
        : <span className="text-muted-foreground">—</span>,
    },
    { id: 'variantCount', accessorKey: 'variantCount', header: 'Varyant', size: 90, enableColumnFilter: false, cell: ({ row }) => row.original.hasVariants ? <Badge variant="outline">{row.original.variantCount}</Badge> : <span className="text-muted-foreground">—</span> },
    { id: 'isActive', accessorKey: 'isActive', header: 'Durum', size: 100, enableGrouping: true, meta: { filter: { type: 'boolean' } }, cell: ({ row }) => <Badge variant={row.original.isActive ? 'success' : 'outline'}>{row.original.isActive ? 'Aktif' : 'Pasif'}</Badge> },
    ...(canWrite
      ? [{
          id: 'actions', header: '', size: 90, enableSorting: false, enableHiding: false, enableColumnFilter: false, enableGrouping: false,
          cell: ({ row }) => (
            <div className="flex justify-end gap-1">
              <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); setEditing(row.original); setOpen(true) }} aria-label="Düzenle"><Pencil className="size-4" /></Button>
              {/* Silme henüz aktif değil — stok/hareket etkileri netleşene kadar disabled. */}
              <Button variant="ghost" size="icon-sm" disabled onClick={(e) => e.stopPropagation()} aria-label="Sil"><Trash2 className="size-4 text-destructive" /></Button>
            </div>
          ),
        } as ColumnDef<ProductDto>]
      : []),
  ]

  return (
    <PermissionRequired permission={InventoryPermissions.productsRead}>
      <PageWrapper className="flex h-full flex-col gap-3">
        <DataGrid
          fillHeight
          gridId="inventory.products"
          data={rows}
          columns={columns}
          getRowId={(r) => r.id}
          loading={productsQuery.isLoading}
          onRowClick={(r) => navigate({ to: '/inventory/products/$id', params: { id: r.id } })}
          emptyText="Ürün yok."
          server={{ total: productsQuery.data?.total ?? 0, onQueryChange: setServerQuery }}
          queryBuilder={{ fields: PRODUCT_QB_FIELDS }}
          toolbar={
            canWrite ? (
              <Button size="sm" onClick={() => { setEditing(null); setOpen(true) }}>
                <Plus />
                <span className="hidden sm:inline">Yeni ürün</span>
              </Button>
            ) : null
          }
        />

        <ProductFormDialog
          open={open}
          onOpenChange={setOpen}
          editing={editing}
          categories={categories}
          onSaved={invalidate}
        />
      </PageWrapper>
    </PermissionRequired>
  )
}
