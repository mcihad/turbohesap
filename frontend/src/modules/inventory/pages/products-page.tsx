import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Layers, Pencil, Plus, SlidersHorizontal, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

import {
  EMPTY_PRODUCT_FILTERS,
  InventoryPermissions,
  LookupsPermissions,
  SalesPermissions,
  advancedFilterCount,
  attrFacets,
  distinctValues,
  filterProducts,
  filterableFields,
  toApiError,
  type ProductDto,
  type ProductFilters,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { PageWrapper } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataGrid, type ColumnDef } from '@/components/data-grid'
import { ProductFormDialog } from '../components/product-form-dialog'
import { AdvancedFilterPanel } from '../components/advanced-filter-panel'
import { money, productTypeLabel } from '../labels'

const PANEL_DEFAULT = 340
const PANEL_MIN = 280
const PANEL_MAX = 560

export function ProductsPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canWrite = hasPermission(InventoryPermissions.productsWrite)
  const canDelete = hasPermission(InventoryPermissions.productsDelete)

  const productsQuery = useQuery({
    queryKey: ['inventory', 'products'],
    queryFn: () => api.inventory.products.list(),
    enabled: hasPermission(InventoryPermissions.productsRead),
  })
  const categoriesQuery = useQuery({
    queryKey: ['inventory', 'categories'],
    queryFn: () => api.inventory.categories.list(),
    enabled: hasPermission(InventoryPermissions.categoriesRead),
  })
  const channelsQuery = useQuery({
    queryKey: ['sales', 'channels'],
    queryFn: () => api.sales.channels.list(),
    enabled: hasPermission(SalesPermissions.channelsRead),
  })
  const lookupsQuery = useQuery({
    queryKey: ['lookups', 'items'],
    queryFn: () => api.lookups.list(),
    enabled: hasPermission(LookupsPermissions.read),
  })

  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<ProductDto | null>(null)
  const [filters, setFilters] = React.useState<ProductFilters>(EMPTY_PRODUCT_FILTERS)

  // Full-height filter sidebar (a splitter, not an overlay drawer) — closed by
  // default; the toggle / drag handle opens it.
  const [panelWidth, setPanelWidth] = React.useState(0)
  const drag = React.useRef<{ startX: number; startW: number } | null>(null)
  const onHandleDown = (e: React.PointerEvent) => {
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    drag.current = { startX: e.clientX, startW: panelWidth }
  }
  const onHandleMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    const next = drag.current.startW + (drag.current.startX - e.clientX)
    setPanelWidth(Math.max(0, Math.min(PANEL_MAX, next)))
  }
  const onHandleUp = (e: React.PointerEvent) => {
    if (!drag.current) return
    ;(e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId)
    drag.current = null
    setPanelWidth((w) => (w === 0 ? 0 : w < PANEL_MIN ? (w < PANEL_MIN / 2 ? 0 : PANEL_MIN) : w))
  }
  const togglePanel = () => setPanelWidth((w) => (w > 0 ? 0 : PANEL_DEFAULT))

  const invalidate = () => qc.invalidateQueries({ queryKey: ['inventory', 'products'] })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.inventory.products.remove(id),
    onSuccess: () => { toast.success('Ürün silindi'); void invalidate() },
    onError: (e) => toast.error('Silme başarısız', { description: toApiError(e).message }),
  })

  const products = productsQuery.data ?? []
  const categories = categoriesQuery.data ?? []
  const channels = (channelsQuery.data ?? []).map((c) => ({ id: c.id, name: c.name }))

  // list → key → display label, so lookup-keyed attribute/unit values render as
  // readable text in the facets (e.g. "mavi" → "Mavi").
  const lookupLabels = React.useMemo(() => {
    const map: Record<string, Record<string, string>> = {}
    for (const it of lookupsQuery.data ?? []) {
      ;(map[it.list] ??= {})[it.key] = it.value
    }
    return map
  }, [lookupsQuery.data])

  const productFacets = React.useMemo(
    () => ({
      brands: distinctValues(products, (p) => p.brand),
      units: distinctValues(products, (p) => p.unit),
      currencies: distinctValues(products, (p) => p.currency),
    }),
    [products],
  )

  const fields = React.useMemo(
    () => filterableFields(filters.categoryIds, categories),
    [filters.categoryIds, categories],
  )
  // Facet options reflect the search/category-filtered subset.
  const baseSubset = React.useMemo(
    () => filterProducts(products, { ...EMPTY_PRODUCT_FILTERS, search: filters.search, categoryIds: filters.categoryIds }, categories),
    [products, filters.search, filters.categoryIds, categories],
  )
  const facets = React.useMemo(() => attrFacets(baseSubset, fields), [baseSubset, fields])
  const filtered = React.useMemo(
    () => filterProducts(products, filters, categories),
    [products, filters, categories],
  )

  const advCount = advancedFilterCount(filters)
  const anyFilter = !!filters.search.trim() || advCount > 0

  // All stock-card fields as grid columns (users hide/reorder/pin/persist).
  const columns: ColumnDef<ProductDto>[] = [
    { id: 'code', accessorKey: 'code', header: 'Kod', size: 120, cell: ({ row }) => <span className="font-mono text-xs">{row.original.code}</span> },
    {
      id: 'name', accessorKey: 'name', header: 'Ad', size: 240,
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1.5 font-medium">
          {row.original.name}
          {row.original.hasVariants ? <Badge variant="outline" className="gap-1 px-1.5 py-0 text-2xs font-normal"><Layers className="size-3" />{row.original.variantCount}</Badge> : null}
        </span>
      ),
    },
    { id: 'category', accessorFn: (p) => p.category?.name ?? '', header: 'Kategori', size: 160, enableGrouping: true, cell: ({ row }) => row.original.category ? <Badge variant="secondary">{row.original.category.name}</Badge> : <span className="text-muted-foreground">—</span> },
    { id: 'type', accessorKey: 'type', header: 'Tür', size: 120, enableGrouping: true, cell: ({ row }) => productTypeLabel(row.original.type) },
    { id: 'brand', accessorKey: 'brand', header: 'Marka', size: 130, enableGrouping: true, cell: ({ row }) => row.original.brand || '—' },
    { id: 'barcode', accessorKey: 'barcode', header: 'Barkod', size: 140, cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.barcode || '—'}</span> },
    { id: 'unit', accessorKey: 'unit', header: 'Birim', size: 90, cell: ({ row }) => row.original.unit || '—' },
    { id: 'salePrice', accessorKey: 'salePrice', header: 'Satış', size: 120, cell: ({ row }) => <span className="tabular-nums">{money(row.original.salePrice, row.original.currency)}</span> },
    { id: 'purchasePrice', accessorKey: 'purchasePrice', header: 'Alış', size: 120, cell: ({ row }) => <span className="tabular-nums">{money(row.original.purchasePrice, row.original.currency)}</span> },
    { id: 'taxRate', accessorKey: 'taxRate', header: 'KDV', size: 80, cell: ({ row }) => row.original.taxRate == null ? '—' : `%${row.original.taxRate}` },
    { id: 'currency', accessorKey: 'currency', header: 'Döviz', size: 80, enableGrouping: true },
    { id: 'totalStock', accessorKey: 'totalStock', header: 'Stok', size: 110, cell: ({ row }) => row.original.trackStock ? <span className={`tabular-nums ${row.original.totalStock <= row.original.minQuantity ? 'text-destructive' : ''}`}>{row.original.totalStock}{row.original.unit ? ` ${row.original.unit}` : ''}</span> : <span className="text-muted-foreground">—</span> },
    { id: 'minQuantity', accessorKey: 'minQuantity', header: 'Min', size: 80, cell: ({ row }) => <span className="tabular-nums">{row.original.minQuantity}</span> },
    { id: 'weight', accessorKey: 'weight', header: 'Ağırlık', size: 100, cell: ({ row }) => row.original.weight == null ? '—' : `${row.original.weight} kg` },
    { id: 'isActive', accessorKey: 'isActive', header: 'Durum', size: 100, enableGrouping: true, cell: ({ row }) => <Badge variant={row.original.isActive ? 'success' : 'outline'}>{row.original.isActive ? 'Aktif' : 'Pasif'}</Badge> },
    ...(canWrite || canDelete
      ? [{
          id: 'actions', header: '', size: 90, enableSorting: false, enableHiding: false, enableColumnFilter: false, enableGrouping: false,
          cell: ({ row }) => (
            <div className="flex justify-end gap-1">
              {canWrite ? <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); setEditing(row.original); setOpen(true) }} aria-label="Düzenle"><Pencil className="size-4" /></Button> : null}
              {canDelete ? <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); if (confirm(`"${row.original.name}" silinsin mi?`)) deleteMutation.mutate(row.original.id) }} aria-label="Sil"><Trash2 className="size-4 text-destructive" /></Button> : null}
            </div>
          ),
        } as ColumnDef<ProductDto>]
      : []),
  ]

  return (
    <PermissionRequired permission={InventoryPermissions.productsRead}>
      <PageWrapper className="flex h-full flex-col gap-3">
        {/* Body — table (toolbar fixed, body scrolls) + filter panel. */}
        <div className="flex min-h-0 flex-1 items-stretch gap-0">
          <div className="flex min-w-0 flex-1 flex-col">
            <DataGrid
              fillHeight
              gridId="inventory.products"
              data={filtered}
              columns={columns}
              getRowId={(p) => p.id}
              loading={productsQuery.isLoading}
              onRowClick={(p) => navigate({ to: '/inventory/products/$id', params: { id: p.id } })}
              emptyText={anyFilter ? 'Filtreyle eşleşen ürün yok.' : 'Ürün yok.'}
              search={{
                value: filters.search,
                onChange: (v) => setFilters((f) => ({ ...f, search: v })),
                placeholder: 'Ürün adı, açıklama veya barkod…',
              }}
              toolbar={
                <>
                  {anyFilter ? (
                    <Button variant="ghost" size="sm" onClick={() => setFilters(EMPTY_PRODUCT_FILTERS)} className="gap-1.5">
                      <X className="size-4" />
                      <span className="hidden sm:inline">Filtreleri temizle</span>
                    </Button>
                  ) : null}
                  <Button variant={panelWidth > 0 ? 'default' : 'outline'} size="sm" onClick={togglePanel} className="gap-1.5">
                    <SlidersHorizontal className="size-4" />
                    <span className="hidden sm:inline">Gelişmiş filtre</span>
                    {advCount ? <Badge variant="secondary" className="px-1.5">{advCount}</Badge> : null}
                  </Button>
                  {canWrite ? (
                    <Button size="sm" onClick={() => { setEditing(null); setOpen(true) }}>
                      <Plus />
                      <span className="hidden sm:inline">Yeni ürün</span>
                    </Button>
                  ) : null}
                </>
              }
            />
          </div>

          {/* Drag handle (splitter) — drag left to open/grow, right to close. */}
          <div
            onPointerDown={onHandleDown}
            onPointerMove={onHandleMove}
            onPointerUp={onHandleUp}
            title="Sürükleyerek aç / boyutlandır"
            className="group flex w-2 shrink-0 cursor-col-resize touch-none items-stretch justify-center self-stretch"
          >
            <div className={`w-px transition-colors ${panelWidth > 0 ? 'bg-border' : 'bg-border/50'} group-hover:bg-primary`} />
          </div>

          <aside className="shrink-0 overflow-hidden" style={{ width: panelWidth }}>
            <div
              className="h-full overflow-hidden rounded-lg border bg-card"
              style={{ width: Math.max(panelWidth, PANEL_MIN) }}
            >
              <AdvancedFilterPanel
                filters={filters}
                setFilters={setFilters}
                categories={categories}
                fields={fields}
                facets={facets}
                channels={channels}
                productFacets={productFacets}
                lookupLabels={lookupLabels}
                onClose={() => setPanelWidth(0)}
              />
            </div>
          </aside>
        </div>

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
