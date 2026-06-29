import * as React from 'react'
import { useParams } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Clock, ScanBarcode, Table2, Undo2, UtensilsCrossed, Wallet } from 'lucide-react'
import { toast } from 'sonner'

import {
  toApiError,
  type PosOrderDto,
  type PosOrderType,
  type PosTableWithStatus,
  type ProductDto,
} from '@turbohesap/shared'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PosHeader } from '../components/pos-header'
import { CategoryStrip } from '../components/category-strip'
import { ProductGrid } from '../components/product-grid'
import { CartPanel } from '../components/cart-panel'
import { ModifierSheet } from '../components/modifier-sheet'
import { TenderDialog } from '../components/tender-dialog'
import { TablePicker } from '../components/table-picker'
import { HeldOrdersDialog } from '../components/held-orders-dialog'
import { ReturnDialog } from '../components/return-dialog'
import { SessionDialog } from '../components/session-dialog'
import { ORDER_TYPE_LABELS, money } from '../labels'
import { addLine, fromOrderLines, makeLine, toOrderLines, type CartLine } from '../lib/pos-cart'

const SELL_ROUTE = '/_pos/pos/sell/$registerId'

export function PosSellPage() {
  const { registerId } = useParams({ from: SELL_ROUTE })
  const qc = useQueryClient()

  const registerQuery = useQuery({ queryKey: ['pos', 'register', registerId], queryFn: () => api.pos.registers.get(registerId) })
  const sessionQuery = useQuery({ queryKey: ['pos', 'session', 'current', registerId], queryFn: () => api.pos.sessions.current(registerId) })
  const productsQuery = useQuery({ queryKey: ['inventory', 'products'], queryFn: () => api.inventory.products.list() })
  const categoriesQuery = useQuery({ queryKey: ['inventory', 'categories'], queryFn: () => api.inventory.categories.list() })
  // productId → group ids: decides whether a tap needs the options sheet.
  const modifierMapQuery = useQuery({ queryKey: ['inventory', 'modifier-map'], queryFn: () => api.inventory.modifiers.productMap() })
  // productId → bundle components: previewed as indented child lines in the cart.
  const bundleMapQuery = useQuery({ queryKey: ['inventory', 'bundle-map'], queryFn: () => api.inventory.bundles.bundleMap() })

  const register = registerQuery.data
  const session = sessionQuery.data
  const settings = register?.settings
  const taxInclusive = settings?.taxInclusive ?? true
  const cartSide = settings?.cartSide ?? 'right'
  const channelId = register?.salesChannelId ?? null
  const branchId = register?.branchId ?? null

  const [activeCategory, setActiveCategory] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState('')
  const [lines, setLines] = React.useState<CartLine[]>([])
  const [modifierProduct, setModifierProduct] = React.useState<ProductDto | null>(null)
  const [tenderOrder, setTenderOrder] = React.useState<PosOrderDto | null>(null)
  const [orderType, setOrderType] = React.useState<PosOrderType>('takeaway')
  // dine-in tab context
  const [table, setTable] = React.useState<PosTableWithStatus | null>(null)
  const [currentOrderId, setCurrentOrderId] = React.useState<string | null>(null)
  const [tablePickerOpen, setTablePickerOpen] = React.useState(false)
  const [heldOpen, setHeldOpen] = React.useState(false)
  const [returnOpen, setReturnOpen] = React.useState(false)
  const [sessionOpen, setSessionOpen] = React.useState(false)

  // Held (open, unpaid) orders for this register — drives the "Bekleyenler" count.
  const heldQuery = useQuery({
    queryKey: ['pos', 'orders', 'held', registerId],
    queryFn: () => api.pos.orders.list({ registerId, status: 'open' }),
  })
  const heldCount = heldQuery.data?.length ?? 0

  const products = React.useMemo(() => productsQuery.data ?? [], [productsQuery.data])
  const categories = React.useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data])
  const modifierMap = modifierMapQuery.data ?? {}
  const bundleMap = bundleMapQuery.data ?? {}

  const resetTab = () => {
    setLines([])
    setTable(null)
    setCurrentOrderId(null)
  }

  // Tap a product: no options → add straight (merge/increment); has options → sheet.
  const pickProduct = (p: ProductDto) => {
    if ((modifierMap[p.id]?.length ?? 0) > 0) {
      setModifierProduct(p)
    } else {
      setLines((cur) => addLine(cur, makeLine(p, channelId, [], 1, bundleMap[p.id])))
    }
  }

  // The workspace search box doubles as a scanner target: pressing Enter (or a
  // scanner's trailing return) adds the product whose code/barcode matches
  // exactly, then clears. A typed name with no exact match just stays a filter.
  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const code = search.trim()
    if (!code) return
    const lc = code.toLocaleLowerCase('tr')
    const found = products.find(
      (p) => p.code.toLocaleLowerCase('tr') === lc || p.barcodes?.some((b) => b.toLocaleLowerCase('tr') === lc),
    )
    if (found) {
      pickProduct(found)
      setSearch('')
    }
  }

  const changeQty = (key: string, delta: number) =>
    setLines((cur) => cur.map((l) => (l.key === key ? { ...l, qty: l.qty + delta } : l)).filter((l) => l.qty > 0))
  const removeLine = (key: string) => setLines((cur) => cur.filter((l) => l.key !== key))

  // Reopen / start a tab when a table is chosen.
  const onPickTable = useMutation({
    mutationFn: async (tb: PosTableWithStatus) => {
      if (tb.openOrderId) {
        const order = await api.pos.orders.get(tb.openOrderId)
        return { tb, order }
      }
      return { tb, order: null as PosOrderDto | null }
    },
    onSuccess: ({ tb, order }) => {
      setTable(tb)
      setOrderType('dine_in')
      setTablePickerOpen(false)
      if (order) {
        setCurrentOrderId(order.id)
        setLines(fromOrderLines(order.lines))
        toast.success(`${tb.name} açıldı`, { description: `Açık adisyon ${order.orderNo}` })
      } else {
        setCurrentOrderId(null)
        setLines([])
      }
    },
    onError: (e) => toast.error('Masa açılamadı', { description: toApiError(e).message }),
  })

  // Recall a held order (from "Bekleyenler") back into the cart to continue.
  const recallHeld = (order: PosOrderDto) => {
    setCurrentOrderId(order.id)
    setLines(fromOrderLines(order.lines))
    setOrderType(order.orderType)
    setTable(
      order.tableId
        ? { id: order.tableId, name: 'Masa', floorId: '', branchId: null, seats: 0, posX: 0, posY: 0, sortOrder: 0, isActive: true, createdAt: '', updatedAt: '', openOrderId: order.id, openOrderNo: order.orderNo, openTotal: order.grandTotal }
        : null,
    )
    setHeldOpen(false)
    toast.success(`${order.orderNo} geri çağrıldı`)
  }

  // Persist the cart to an order (create new or update the reopened tab).
  const persist = async (): Promise<PosOrderDto> => {
    if (currentOrderId) {
      return api.pos.orders.update(currentOrderId, { orderType, tableId: table?.id ?? null, lines: toOrderLines(lines) })
    }
    return api.pos.orders.create({
      clientRef: crypto.randomUUID(),
      registerId,
      sessionId: session?.id ?? null,
      orderType,
      tableId: orderType === 'dine_in' ? table?.id ?? null : null,
      lines: toOrderLines(lines),
    })
  }

  const checkout = useMutation({
    mutationFn: persist,
    onSuccess: (order) => {
      setTenderOrder(order)
      qc.invalidateQueries({ queryKey: ['pos', 'orders'] })
    },
    onError: (e) => toast.error('Sipariş oluşturulamadı', { description: toApiError(e).message }),
  })

  // "Beklet": for dine-in, save the tab to the table and leave it open.
  const park = useMutation({
    mutationFn: persist,
    onSuccess: (order) => {
      toast.success(table ? `${table.name} adisyonu kaydedildi` : `Sipariş bekletildi · ${order.orderNo}`)
      resetTab()
      qc.invalidateQueries({ queryKey: ['pos', 'orders'] })
      qc.invalidateQueries({ queryKey: ['pos', 'orders', 'held', registerId] })
      qc.invalidateQueries({ queryKey: ['pos', 'floors', 'layout'] })
    },
    onError: (e) => toast.error('Kaydedilemedi', { description: toApiError(e).message }),
  })

  const openSession = useMutation({
    mutationFn: (openingCash: number) => api.pos.sessions.open({ registerId, openingCash }),
    onSuccess: () => {
      toast.success('Vardiya açıldı')
      qc.invalidateQueries({ queryKey: ['pos', 'session', 'current', registerId] })
    },
    onError: (e) => toast.error('Vardiya açılamadı', { description: toApiError(e).message }),
  })

  if (registerQuery.isLoading || sessionQuery.isLoading) return <CenterMessage>Yükleniyor…</CenterMessage>
  if (!register) return <CenterMessage>Kasa bulunamadı.</CenterMessage>

  const headerLeft = (
    <div className="flex min-w-0 items-center gap-2">
      <span className="truncate text-base font-semibold">{register.name}</span>
      <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">{register.code}</span>
      {register.salesChannel ? (
        <span className="hidden truncate text-xs text-muted-foreground sm:inline">· {register.salesChannel.name}</span>
      ) : null}
      {session ? (
        <Button variant="outline" className="ml-1 h-11" onClick={() => setSessionOpen(true)}>
          <Wallet className="size-5" />
          <span className="hidden sm:inline">Vardiya</span>
        </Button>
      ) : null}
    </div>
  )

  if (!session) {
    return (
      <div className="flex h-full flex-col">
        <PosHeader left={headerLeft} />
        <OpenSessionCard onOpen={(c) => openSession.mutate(c)} busy={openSession.isPending} />
      </div>
    )
  }

  const onChangeOrderType = (t: PosOrderType) => {
    setOrderType(t)
    if (t === 'dine_in' && !table) setTablePickerOpen(true)
    if (t !== 'dine_in') {
      setTable(null)
      setCurrentOrderId(null)
    }
  }

  // Context bar: order type segmented control + (dine-in) table + recall.
  const contextBar = (
    <div className="space-y-2.5">
      <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-muted p-1.5">
        {(['dine_in', 'takeaway', 'delivery'] as PosOrderType[]).map((tp) => (
          <button
            key={tp}
            type="button"
            onClick={() => onChangeOrderType(tp)}
            className={cn(
              'rounded-xl py-3 text-sm font-semibold transition-all',
              orderType === tp
                ? 'bg-card text-foreground shadow-sm ring-1 ring-border'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {ORDER_TYPE_LABELS[tp]}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        {orderType === 'dine_in' ? (
          <Button
            variant={table ? 'secondary' : 'outline'}
            className="h-12 flex-1 text-sm"
            onClick={() => setTablePickerOpen(true)}
          >
            <Table2 className="size-5" />
            {table ? table.name : 'Masa Seç'}
          </Button>
        ) : null}
        <Button variant="outline" className="relative h-12 flex-1 text-sm" onClick={() => setHeldOpen(true)}>
          <Clock className="size-5" />
          Bekleyenler
          {heldCount > 0 ? (
            <span className="ml-1 flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-2xs font-semibold text-primary-foreground">
              {heldCount}
            </span>
          ) : null}
        </Button>
        <Button variant="outline" className="h-12 flex-1 text-sm" onClick={() => setReturnOpen(true)}>
          <Undo2 className="size-5" />
          İade
        </Button>
      </div>
    </div>
  )

  const cartPanel = (
    <CartPanel
      lines={lines}
      taxInclusive={taxInclusive}
      currency="TRY"
      context={contextBar}
      onQty={changeQty}
      onRemove={removeLine}
      onClear={resetTab}
      onCheckout={() => checkout.mutate()}
      onPark={() => park.mutate()}
      busy={checkout.isPending || park.isPending || onPickTable.isPending}
      checkoutDisabled={orderType === 'dine_in' && !table}
    />
  )

  const productArea = (
    <div className="flex min-w-0 flex-1 flex-col bg-muted/30">
      <form onSubmit={onSearchSubmit} className="border-b bg-card p-3">
        <div className="relative">
          <ScanBarcode className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ürün ara veya barkod okut…"
            className="h-12 pl-10 text-base"
            autoFocus
          />
        </div>
      </form>
      <CategoryStrip categories={categories} activeId={activeCategory} onSelect={setActiveCategory} />
      <ProductGrid
        products={products}
        categories={categories}
        activeCategoryId={activeCategory}
        search={search}
        channelId={channelId}
        onPick={pickProduct}
      />
    </div>
  )

  return (
    <div className="flex h-full flex-col">
      <PosHeader left={headerLeft} />
      <div className="flex min-h-0 flex-1">
        {cartSide === 'left' ? (
          <>
            <div className="w-full max-w-[27rem] shrink-0 border-r bg-card shadow-sm">{cartPanel}</div>
            {productArea}
          </>
        ) : (
          <>
            {productArea}
            <div className="w-full max-w-[27rem] shrink-0 border-l bg-card shadow-sm">{cartPanel}</div>
          </>
        )}
      </div>

      <ModifierSheet
        product={modifierProduct}
        channelId={channelId}
        taxInclusive={taxInclusive}
        bundle={modifierProduct ? bundleMap[modifierProduct.id] : undefined}
        onClose={() => setModifierProduct(null)}
        onAdd={(line) => setLines((cur) => addLine(cur, line))}
      />
      <TenderDialog
        order={tenderOrder}
        onClose={() => setTenderOrder(null)}
        onPaid={() => {
          setTenderOrder(null)
          resetTab()
          qc.invalidateQueries({ queryKey: ['pos', 'orders', 'held', registerId] })
          qc.invalidateQueries({ queryKey: ['pos', 'floors', 'layout'] })
        }}
      />
      <HeldOrdersDialog
        open={heldOpen}
        registerId={registerId}
        onClose={() => setHeldOpen(false)}
        onPick={recallHeld}
      />
      <ReturnDialog open={returnOpen} registerId={registerId} onClose={() => setReturnOpen(false)} />
      <SessionDialog open={sessionOpen} session={session} registerId={registerId} onClose={() => setSessionOpen(false)} />
      <TablePicker
        open={tablePickerOpen}
        branchId={branchId}
        onClose={() => {
          setTablePickerOpen(false)
          if (!table) setOrderType('takeaway')
        }}
        onPick={(tb) => onPickTable.mutate(tb)}
      />
    </div>
  )
}

function CenterMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
      <UtensilsCrossed className="size-8 opacity-40" />
      {children}
    </div>
  )
}

function OpenSessionCard({ onOpen, busy }: { onOpen: (cash: number) => void; busy: boolean }) {
  const [cash, setCash] = React.useState('0')
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4 rounded-xl border bg-card p-6 shadow-sm">
        <div className="space-y-1 text-center">
          <h2 className="text-lg font-semibold">Vardiya Kapalı</h2>
          <p className="text-sm text-muted-foreground">Satışa başlamak için vardiya açın.</p>
        </div>
        <label className="block space-y-1">
          <span className="text-2xs text-muted-foreground">Açılış kasa tutarı</span>
          <Input type="number" step="0.01" value={cash} onChange={(e) => setCash(e.target.value)} className="h-11 text-base tabular-nums" />
        </label>
        <Button className="w-full" disabled={busy} onClick={() => onOpen(Number(cash) || 0)}>
          Vardiya Aç · {money(Number(cash) || 0)}
        </Button>
      </div>
    </div>
  )
}
