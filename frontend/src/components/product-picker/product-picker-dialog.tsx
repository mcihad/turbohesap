import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { GripHorizontal, Package, SlidersHorizontal, X } from 'lucide-react'

import {
  EMPTY_PRODUCT_FILTERS,
  advancedFilterCount,
  attrFacets,
  distinctValues,
  filterableFields,
  filterProducts,
  type ProductFilters,
  type SellableUnitDto,
} from '@turbohesap/shared'

import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataGrid, type ColumnDef } from '@/components/data-grid'
import { AdvancedFilterPanel } from '@/modules/inventory/components/advanced-filter-panel'

const PANEL_WIDTH = 300
const MIN_W = 640
const MIN_H = 420
const DEFAULT_W = 1040
const DEFAULT_H = 680

type Pos = { top: number; left: number }
type Size = { w: number; h: number }
type ResizeDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

function money(v: number | null | undefined, currency = 'TRY'): string {
  if (v == null) return '—'
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(v)
}

/**
 * A reusable, floating (draggable + resizable) product picker. Lazily loads the
 * full product/sellable data only while open, narrows it through the shared
 * advanced-filter pipeline, and lets the caller pick one or many sellable units.
 */
export function ProductPickerDialog({
  open,
  onOpenChange,
  mode,
  onConfirm,
  title = 'Ürün seç',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'single' | 'multi'
  onConfirm: (units: SellableUnitDto[]) => void
  title?: string
}) {
  // ── window geometry ───────────────────────────────────────────────────────
  const [size, setSize] = React.useState<Size>({ w: DEFAULT_W, h: DEFAULT_H })
  const [pos, setPos] = React.useState<Pos>({ top: 0, left: 0 })
  const [panelOpen, setPanelOpen] = React.useState(false)

  // Center the window the first time it opens.
  React.useEffect(() => {
    if (!open) return
    const w = Math.min(DEFAULT_W, window.innerWidth - 32)
    const h = Math.min(DEFAULT_H, window.innerHeight - 32)
    setSize({ w, h })
    setPos({ top: Math.max(16, (window.innerHeight - h) / 2), left: Math.max(16, (window.innerWidth - w) / 2) })
  }, [open])

  const dragRef = React.useRef<{ startX: number; startY: number; top: number; left: number } | null>(null)
  const onDragDown = (e: React.PointerEvent) => {
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    dragRef.current = { startX: e.clientX, startY: e.clientY, top: pos.top, left: pos.left }
  }
  const onDragMove = (e: React.PointerEvent) => {
    const d = dragRef.current
    if (!d) return
    const top = clamp(d.top + (e.clientY - d.startY), 8, window.innerHeight - 48)
    const left = clamp(d.left + (e.clientX - d.startX), 8 - size.w + 120, window.innerWidth - 120)
    setPos({ top, left })
  }
  const onDragUp = (e: React.PointerEvent) => {
    ;(e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId)
    dragRef.current = null
  }

  const resizeRef = React.useRef<
    { dir: ResizeDir; startX: number; startY: number; w: number; h: number; top: number; left: number } | null
  >(null)
  const onResizeDown = (dir: ResizeDir) => (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    resizeRef.current = { dir, startX: e.clientX, startY: e.clientY, w: size.w, h: size.h, top: pos.top, left: pos.left }
  }
  const onResizeMove = (e: React.PointerEvent) => {
    const r = resizeRef.current
    if (!r) return
    const dx = e.clientX - r.startX
    const dy = e.clientY - r.startY
    let { w, h, top, left } = r
    if (r.dir.includes('e')) w = clamp(r.w + dx, MIN_W, window.innerWidth - r.left - 8)
    if (r.dir.includes('s')) h = clamp(r.h + dy, MIN_H, window.innerHeight - r.top - 8)
    if (r.dir.includes('w')) {
      w = clamp(r.w - dx, MIN_W, r.left + r.w - 8)
      left = r.left + (r.w - w)
    }
    if (r.dir.includes('n')) {
      h = clamp(r.h - dy, MIN_H, r.top + r.h - 8)
      top = r.top + (r.h - h)
    }
    setSize({ w, h })
    setPos({ top, left })
  }
  const onResizeUp = (e: React.PointerEvent) => {
    ;(e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId)
    resizeRef.current = null
  }

  // ── data (lazy: only fetched while open) ──────────────────────────────────
  const productsQuery = useQuery({
    queryKey: ['inventory', 'products'],
    queryFn: () => api.inventory.products.list(),
    enabled: open,
  })
  const sellableQuery = useQuery({
    queryKey: ['inventory', 'products', 'sellable'],
    queryFn: () => api.inventory.products.sellable(),
    enabled: open,
  })
  const categoriesQuery = useQuery({
    queryKey: ['inventory', 'categories'],
    queryFn: () => api.inventory.categories.list(),
    enabled: open,
  })
  const channelsQuery = useQuery({
    queryKey: ['sales', 'channels'],
    queryFn: () => api.sales.channels.list(),
    enabled: open,
  })
  const lookupsQuery = useQuery({
    queryKey: ['lookups', 'items'],
    queryFn: () => api.lookups.list(),
    enabled: open,
  })

  const [filters, setFilters] = React.useState<ProductFilters>(EMPTY_PRODUCT_FILTERS)
  const [selected, setSelected] = React.useState<SellableUnitDto[]>([])

  // Reset transient state on each open.
  React.useEffect(() => {
    if (open) {
      setFilters(EMPTY_PRODUCT_FILTERS)
      setSelected([])
    }
  }, [open])

  const products = productsQuery.data ?? []
  const sellable = sellableQuery.data ?? []
  const categories = categoriesQuery.data ?? []
  const channels = (channelsQuery.data ?? []).map((c) => ({ id: c.id, name: c.name }))

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
  const baseSubset = React.useMemo(
    () =>
      filterProducts(
        products,
        { ...EMPTY_PRODUCT_FILTERS, search: filters.search, categoryIds: filters.categoryIds },
        categories,
      ),
    [products, filters.search, filters.categoryIds, categories],
  )
  const facets = React.useMemo(() => attrFacets(baseSubset, fields), [baseSubset, fields])

  const allowedIds = React.useMemo(
    () => new Set(filterProducts(products, { ...filters, search: '' }, categories).map((p) => p.id)),
    [products, filters, categories],
  )
  const q = filters.search.trim().toLocaleLowerCase('tr')
  const rows = React.useMemo(
    () =>
      sellable.filter((r) => {
        if (!allowedIds.has(r.productId)) return false
        if (q) {
          const hay = `${r.label} ${r.code} ${r.barcode} ${r.categoryName ?? ''}`.toLocaleLowerCase('tr')
          if (!hay.includes(q)) return false
        }
        return true
      }),
    [sellable, allowedIds, q],
  )

  const advCount = advancedFilterCount(filters)

  const columns = React.useMemo<ColumnDef<SellableUnitDto>[]>(
    () => [
      {
        id: 'code',
        accessorKey: 'code',
        header: 'Kod',
        size: 130,
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground/60">
              {row.original.imageUrl ? (
                <img src={row.original.imageUrl} alt="" className="size-full object-cover" />
              ) : (
                <Package className="size-3.5" />
              )}
            </span>
            <span className="font-mono text-xs">{row.original.code}</span>
          </span>
        ),
      },
      { id: 'label', accessorKey: 'label', header: 'Ad', size: 260, cell: ({ row }) => <span className="font-medium">{row.original.label}</span> },
      {
        id: 'category',
        accessorFn: (r) => r.categoryName ?? '',
        header: 'Kategori',
        size: 150,
        enableGrouping: true,
        cell: ({ row }) =>
          row.original.categoryName ? (
            <Badge variant="secondary">{row.original.categoryName}</Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      { id: 'barcode', accessorKey: 'barcode', header: 'Barkod', size: 140, cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.barcode || '—'}</span> },
      { id: 'unit', accessorKey: 'unit', header: 'Birim', size: 90, cell: ({ row }) => row.original.unit || '—' },
      {
        id: 'salePrice',
        accessorKey: 'salePrice',
        header: 'Satış',
        size: 120,
        cell: ({ row }) => <span className="tabular-nums">{money(row.original.salePrice, row.original.currency)}</span>,
      },
      {
        id: 'totalStock',
        accessorKey: 'totalStock',
        header: 'Stok',
        size: 110,
        cell: ({ row }) =>
          row.original.trackStock ? (
            <span className={cn('tabular-nums', row.original.totalStock <= row.original.minQuantity && 'text-destructive')}>
              {row.original.totalStock}
              {row.original.unit ? ` ${row.original.unit}` : ''}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
    ],
    [],
  )

  const confirm = () => {
    if (selected.length === 0) return
    onConfirm(selected)
    onOpenChange(false)
  }

  return (
    // Built on Radix Dialog primitives (non-modal) so the floating window stacks
    // correctly and — crucially — registers as a dismissable layer: launching it
    // from inside another dialog no longer dismisses that parent, and the filter
    // popovers opened inside it behave as nested layers.
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className="fixed z-50 flex flex-col overflow-hidden rounded-xl border bg-card shadow-2xl ring-1 ring-black/5 duration-150 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          style={{ top: pos.top, left: pos.left, width: size.w, height: size.h }}
        >
          <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
        {/* Title bar (drag affordance) */}
        <div
          onPointerDown={onDragDown}
          onPointerMove={onDragMove}
          onPointerUp={onDragUp}
          className="flex shrink-0 cursor-move touch-none items-center gap-2 border-b bg-gradient-to-b from-muted/60 to-transparent px-3 py-2.5"
        >
          <GripHorizontal className="size-4 text-muted-foreground" />
          <span className="text-sm font-semibold">{title}</span>
          <span className="text-2xs text-muted-foreground">· sürükleyerek taşıyın</span>
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant={panelOpen ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPanelOpen((v) => !v)}
              className="gap-1.5"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <SlidersHorizontal className="size-4" />
              <span className="hidden sm:inline">Filtre</span>
              {advCount ? <Badge variant="secondary" className="px-1.5">{advCount}</Badge> : null}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Kapat"
              onClick={() => onOpenChange(false)}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Body: grid + filter panel (filters on the right) */}
        <div className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col p-3">
            <DataGrid
              fillHeight
              gridId="product-picker"
              data={rows}
              columns={columns}
              getRowId={(r) => r.id}
              loading={productsQuery.isLoading || sellableQuery.isLoading}
              selection={mode}
              onSelectionChange={setSelected}
              emptyText={advCount || q ? 'Filtreyle eşleşen ürün yok.' : 'Ürün yok.'}
              search={{
                value: filters.search,
                onChange: (v) => setFilters((f) => ({ ...f, search: v })),
                placeholder: 'Ürün adı, kod veya barkod…',
              }}
            />
          </div>
          {panelOpen ? (
            <aside className="shrink-0 overflow-hidden border-l bg-card" style={{ width: PANEL_WIDTH }}>
              <AdvancedFilterPanel
                filters={filters}
                setFilters={setFilters}
                categories={categories}
                fields={fields}
                facets={facets}
                channels={channels}
                productFacets={productFacets}
                lookupLabels={lookupLabels}
                onClose={() => setPanelOpen(false)}
              />
            </aside>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t bg-muted/30 px-4 py-3">
          <span className="text-sm text-muted-foreground">
            {selected.length > 0 ? `${selected.length} ürün seçili` : 'Ürün seçilmedi'}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button disabled={selected.length === 0} onClick={confirm}>
              {mode === 'multi' ? `Ekle${selected.length ? ` (${selected.length})` : ''}` : 'Seç'}
            </Button>
          </div>
        </div>

        {/* Resize handles */}
        <ResizeHandle dir="n" onDown={onResizeDown} onMove={onResizeMove} onUp={onResizeUp} />
        <ResizeHandle dir="s" onDown={onResizeDown} onMove={onResizeMove} onUp={onResizeUp} />
        <ResizeHandle dir="e" onDown={onResizeDown} onMove={onResizeMove} onUp={onResizeUp} />
        <ResizeHandle dir="w" onDown={onResizeDown} onMove={onResizeMove} onUp={onResizeUp} />
        <ResizeHandle dir="ne" onDown={onResizeDown} onMove={onResizeMove} onUp={onResizeUp} />
        <ResizeHandle dir="nw" onDown={onResizeDown} onMove={onResizeMove} onUp={onResizeUp} />
        <ResizeHandle dir="se" onDown={onResizeDown} onMove={onResizeMove} onUp={onResizeUp} />
        <ResizeHandle dir="sw" onDown={onResizeDown} onMove={onResizeMove} onUp={onResizeUp} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

const HANDLE_CLASS: Record<ResizeDir, string> = {
  n: 'top-0 inset-x-0 h-1.5 cursor-ns-resize',
  s: 'bottom-0 inset-x-0 h-1.5 cursor-ns-resize',
  e: 'right-0 inset-y-0 w-1.5 cursor-ew-resize',
  w: 'left-0 inset-y-0 w-1.5 cursor-ew-resize',
  ne: 'top-0 right-0 size-3 cursor-nesw-resize',
  nw: 'top-0 left-0 size-3 cursor-nwse-resize',
  se: 'bottom-0 right-0 size-3 cursor-nwse-resize',
  sw: 'bottom-0 left-0 size-3 cursor-nesw-resize',
}

function ResizeHandle({
  dir,
  onDown,
  onMove,
  onUp,
}: {
  dir: ResizeDir
  onDown: (dir: ResizeDir) => (e: React.PointerEvent) => void
  onMove: (e: React.PointerEvent) => void
  onUp: (e: React.PointerEvent) => void
}) {
  return (
    <div
      onPointerDown={onDown(dir)}
      onPointerMove={onMove}
      onPointerUp={onUp}
      className={cn('absolute z-10 touch-none', HANDLE_CLASS[dir])}
    />
  )
}
