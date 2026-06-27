import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Boxes, Layers, Pencil, Plus, Search, SlidersHorizontal, Trash2 } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ProductFormDialog } from '../components/product-form-dialog'
import { AdvancedFilterPanel } from '../components/advanced-filter-panel'
import { money } from '../labels'

const PANEL_DEFAULT = 340
const PANEL_MIN = 280
const PANEL_MAX = 560

export function ProductsPage() {
  const qc = useQueryClient()
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
  const colSpan = canWrite || canDelete ? 7 : 6

  return (
    <PermissionRequired permission={InventoryPermissions.productsRead}>
      <PageWrapper className="flex h-full flex-col gap-3">
        {/* Toolbar — search only; filtering lives in the side panel */}
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1 sm:max-w-md">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              placeholder="Ürün adı, açıklama veya barkod…"
              className="pl-8"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant={panelWidth > 0 ? 'default' : 'outline'} onClick={togglePanel} className="gap-2">
              <SlidersHorizontal className="size-4" />
              <span className="hidden sm:inline">Filtrele</span>
              {advCount ? <Badge variant="secondary" className="px-1.5">{advCount}</Badge> : null}
            </Button>
            {canWrite ? (
              <Button onClick={() => { setEditing(null); setOpen(true) }}>
                <Plus />
                <span className="hidden sm:inline">Yeni ürün</span>
              </Button>
            ) : null}
          </div>
        </div>

        {/* Result meta */}
        <div className="flex shrink-0 items-center justify-between text-sm text-muted-foreground">
          <span>
            {filtered.length} ürün
            {filtered.length !== products.length ? ` · ${products.length} içinde` : ''}
          </span>
          {anyFilter ? (
            <Button variant="ghost" size="sm" onClick={() => setFilters(EMPTY_PRODUCT_FILTERS)}>
              Filtreleri temizle
            </Button>
          ) : null}
        </div>

        {/* Body — table (scrolls) + filter panel; both fill down to the footer. */}
        <div className="flex min-h-0 flex-1 items-stretch gap-0">
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="h-full overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kod</TableHead>
                    <TableHead>Ad</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead className="text-right">Satış</TableHead>
                    <TableHead className="text-right">Stok</TableHead>
                    <TableHead>Durum</TableHead>
                    {canWrite || canDelete ? <TableHead className="w-24 text-right">İşlem</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.code}</TableCell>
                      <TableCell className="font-medium">
                        <Link
                          to="/inventory/products/$id"
                          params={{ id: p.id }}
                          className="inline-flex items-center gap-1.5 hover:underline"
                        >
                          {p.name}
                          {p.hasVariants ? (
                            <Badge variant="outline" className="gap-1 px-1.5 py-0 text-2xs font-normal">
                              <Layers className="size-3" />
                              {p.variantCount}
                            </Badge>
                          ) : null}
                        </Link>
                      </TableCell>
                      <TableCell>{p.category ? <Badge variant="secondary">{p.category.name}</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-right tabular-nums">{money(p.salePrice, p.currency)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {p.trackStock ? (
                          <>
                            <span className={p.totalStock <= p.minQuantity ? 'text-destructive' : ''}>{p.totalStock}</span>
                            {p.unit ? <span className="ml-1 text-xs text-muted-foreground">{p.unit}</span> : null}
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell><Badge variant={p.isActive ? 'success' : 'outline'}>{p.isActive ? 'Aktif' : 'Pasif'}</Badge></TableCell>
                      {canWrite || canDelete ? (
                        <TableCell className="text-right">
                          {canWrite ? (
                            <Button variant="ghost" size="icon-sm" onClick={() => { setEditing(p); setOpen(true) }} aria-label="Düzenle">
                              <Pencil className="size-4" />
                            </Button>
                          ) : null}
                          {canDelete ? (
                            <Button variant="ghost" size="icon-sm" onClick={() => { if (confirm(`"${p.name}" silinsin mi?`)) deleteMutation.mutate(p.id) }} aria-label="Sil">
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          ) : null}
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                  {!productsQuery.isLoading && filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={colSpan} className="py-10 text-center text-muted-foreground">
                        <Boxes className="mx-auto mb-2 size-6 opacity-40" />
                        {anyFilter ? 'Filtreyle eşleşen ürün yok.' : 'Ürün yok.'}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
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
