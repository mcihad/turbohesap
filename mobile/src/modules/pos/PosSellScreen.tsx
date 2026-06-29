// POS sell screen — the cashier's main surface. A searchable, category-filtered
// product grid feeds a cart; the cart total + actions live in a sticky footer.
//
// Add-to-cart decision (driven by the prefetched modifier map):
//   • product with NO modifier groups   → added directly (qty 1)
//   • product already in cart (no mods)  → its qty is incremented
//   • product WITH modifier groups       → opens the modifier sheet to configure
// Cart pricing uses the SHARED helpers (resolveUnitPrice/lineGross/taxBreakdown/
// modifierDeltaSum) so the preview matches the server to the kuruş, honouring the
// register's taxInclusive + salesChannelId.
//
// Order types: Paket/Teslimat sell immediately; Masa (dine_in) requires picking
// a table first — a free table starts a new order, an occupied one loads its open
// order back into the cart. "Tahsil Et" persists the order then opens the tender.

import * as React from 'react'
import { Alert, Modal, Pressable, ScrollView, View } from 'react-native'
import { Image } from 'expo-image'

import {
  lineGross,
  modifierDeltaSum,
  resolveUnitPrice,
  taxBreakdown,
  type PosOrderDto,
  type PosOrderType,
  type ProductBundleComponentDto,
  type ProductDto,
  type ProductModifierGroupDto,
  type PosFloorLayoutDto,
  type PosTableWithStatus,
} from '@turbohesap/shared'

import {
  Badge,
  Button,
  Card,
  EmptyState,
  Icon,
  type IconName,
  Input,
  Screen,
  SegmentedControl,
  Text,
} from '../../components'
import { api } from '../../lib/api'
import { useAsync } from '../../lib/use-async'
import { useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { formatMoney, ORDER_TYPE_LABELS } from './format'

interface CartModifier {
  groupId: string | null
  optionId: string | null
  groupName: string
  optionName: string
  priceDelta: number
}

interface CartLine {
  /** Unique within the cart (productId for plain lines; uid for configured ones). */
  key: string
  productId: string
  name: string
  unitPrice: number
  taxRate: number
  currency: string
  qty: number
  modifiers: CartModifier[]
}

let uidSeq = 0
const uid = () => `cl-${Date.now()}-${++uidSeq}`

/** Stable signature for merging cart lines: a line merges with another only
 *  when it's the same product with the same set of modifier options. */
function lineSignature(productId: string, modifiers: CartModifier[]): string {
  const mods = modifiers
    .map((m) => `${m.groupId ?? ''}:${m.optionId ?? ''}`)
    .sort()
    .join('|')
  return `${productId}#${mods}`
}

/** Map a persisted POS order's lines back into editable cart lines.
 *  Server-generated bundle children (isBundleChild) are excluded — they are
 *  re-derived for preview from the bundle map. Each real line stays a single
 *  merged qty-N cart line (NOT expanded into per-unit lines). */
function cartFromOrder(order: PosOrderDto): CartLine[] {
  const out: CartLine[] = []
  for (const line of order.lines) {
    if (line.isBundleChild) continue
    const modifiers = line.modifiers.map((m) => ({
      groupId: m.groupId,
      optionId: m.optionId,
      groupName: m.groupNameSnapshot,
      optionName: m.optionNameSnapshot,
      priceDelta: m.priceDelta,
    }))
    out.push({
      key: line.id,
      productId: line.productId ?? '',
      name: line.name,
      unitPrice: line.unitPrice,
      taxRate: line.taxRate,
      currency: order.currencyCode || 'TRY',
      qty: Math.max(1, Math.round(line.qty)),
      modifiers,
    })
  }
  return out
}

/** "14:32" from an ISO timestamp (best-effort). */
function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export function PosSellScreen() {
  const t = useTheme()
  const nav = useNav()
  const registerId = nav.current.params?.registerId ? String(nav.current.params.registerId) : null
  const { submit, busy } = useSubmit()

  const register = useAsync(() => api.pos.registers.get(registerId as string), [registerId], { enabled: !!registerId })
  const session = useAsync(() => api.pos.sessions.current(registerId as string), [registerId], { enabled: !!registerId })
  const products = useAsync(() => api.inventory.products.list(), [])
  const categories = useAsync(() => api.inventory.categories.list(), [])
  const modifierMap = useAsync(() => api.inventory.modifiers.productMap(), [])
  // Bundle components per product → preview them as indented child lines in the
  // cart. The server re-expands bundles authoritatively, so these are read-only.
  const bundleMap = useAsync(() => api.inventory.bundles.bundleMap(), [])

  const channelId = register.data?.salesChannelId ?? null
  const taxInclusive = register.data?.settings.taxInclusive ?? true
  const branchId = register.data?.branchId ?? null

  const [query, setQuery] = React.useState('')
  const [selectedCat, setSelectedCat] = React.useState<string | null>(null)
  const [cart, setCart] = React.useState<CartLine[]>([])
  const [orderType, setOrderType] = React.useState<PosOrderType>('takeaway')
  const [selectedTable, setSelectedTable] = React.useState<{ id: string; name: string } | null>(null)
  const [existingOrderId, setExistingOrderId] = React.useState<string | null>(null)
  const [modifierProduct, setModifierProduct] = React.useState<ProductDto | null>(null)
  const [tablePickerOpen, setTablePickerOpen] = React.useState(false)
  const [heldOrdersOpen, setHeldOrdersOpen] = React.useState(false)

  // Held (parked) orders = open, unpaid orders on this register. Refetched after
  // a park; remounting on return from the tender screen refetches after payment.
  const heldOrders = useAsync(
    () => api.pos.orders.list({ registerId: registerId as string, status: 'open' }),
    [registerId],
    { enabled: !!registerId },
  )
  // Resolve table names so dine-in held orders show a label (orders carry only tableId).
  const tablesLayout = useAsync(
    () => api.pos.tables.layout(branchId ?? undefined),
    [branchId],
    { enabled: !!branchId },
  )
  const tableNameById = React.useMemo(() => {
    const m = new Map<string, string>()
    for (const f of tablesLayout.data ?? []) for (const tb of f.tables) m.set(tb.id, tb.name)
    return m
  }, [tablesLayout.data])

  // Exclude the order currently loaded into the cart from the recall list.
  const heldList = React.useMemo(
    () => (heldOrders.data ?? []).filter((o) => o.id !== existingOrderId),
    [heldOrders.data, existingOrderId],
  )

  // Category → children, for descendant-aware filtering.
  const catChildren = React.useMemo(() => {
    const m = new Map<string, string[]>()
    for (const c of categories.data ?? []) {
      if (c.parentId) {
        const arr = m.get(c.parentId) ?? []
        arr.push(c.id)
        m.set(c.parentId, arr)
      }
    }
    return m
  }, [categories.data])

  const selectedCatIds = React.useMemo(() => {
    if (!selectedCat) return null
    const set = new Set<string>()
    const stack = [selectedCat]
    while (stack.length) {
      const id = stack.pop() as string
      if (set.has(id)) continue
      set.add(id)
      for (const ch of catChildren.get(id) ?? []) stack.push(ch)
    }
    return set
  }, [selectedCat, catChildren])

  const filtered = React.useMemo(() => {
    let list = (products.data ?? []).filter((p) => p.isActive)
    if (selectedCatIds) list = list.filter((p) => p.categoryId && selectedCatIds.has(p.categoryId))
    const q = query.trim().toLocaleLowerCase('tr')
    if (q) {
      list = list.filter((p) =>
        `${p.name} ${p.code} ${p.barcodes?.join(' ') ?? ''}`.toLocaleLowerCase('tr').includes(q),
      )
    }
    return list
  }, [products.data, selectedCatIds, query])

  const lineTotal = React.useCallback(
    (l: CartLine) => {
      const delta = modifierDeltaSum(l.modifiers.map((m) => m.priceDelta))
      const gross = lineGross(l.unitPrice, l.qty, 0, delta)
      return taxBreakdown(gross, l.taxRate, taxInclusive).total
    },
    [taxInclusive],
  )

  // Bundle components handed out with a product (preview only).
  const childrenFor = React.useCallback(
    (productId: string): ProductBundleComponentDto[] => bundleMap.data?.[productId] ?? [],
    [bundleMap.data],
  )
  const childPrice = React.useCallback(
    (c: ProductBundleComponentDto) => (c.isFree ? 0 : c.unitPrice ?? 0),
    [],
  )
  // Priced bundle components add to the preview total (free ones are ₺0).
  const lineExtras = React.useCallback(
    (l: CartLine) => childrenFor(l.productId).reduce((s, c) => s + childPrice(c) * c.qty, 0) * l.qty,
    [childrenFor, childPrice],
  )

  const grandTotal = React.useMemo(
    () => cart.reduce((s, l) => s + lineTotal(l) + lineExtras(l), 0),
    [cart, lineTotal, lineExtras],
  )
  const itemCount = cart.reduce((s, l) => s + l.qty, 0)
  const currency = cart[0]?.currency ?? 'TRY'

  // Merge a unit into the cart: same product + same modifiers bumps the qty of
  // the existing line; otherwise a new qty-N line is appended.
  const mergeIntoCart = (line: Omit<CartLine, 'key'>) =>
    setCart((cur) => {
      const sig = lineSignature(line.productId, line.modifiers)
      const idx = cur.findIndex((l) => lineSignature(l.productId, l.modifiers) === sig)
      if (idx >= 0) {
        const next = [...cur]
        next[idx] = { ...next[idx], qty: next[idx].qty + line.qty }
        return next
      }
      return [...cur, { ...line, key: uid() }]
    })

  // ── add-to-cart decision ──
  const onProductPress = (p: ProductDto) => {
    const groupIds = modifierMap.data?.[p.id] ?? []
    if (groupIds.length > 0) {
      setModifierProduct(p)
      return
    }
    // Plain product → merge into its existing line (qty +1) or start a new one.
    mergeIntoCart({
      productId: p.id,
      name: p.name,
      unitPrice: resolveUnitPrice(p, null, channelId),
      taxRate: p.taxRate ?? 0,
      currency: p.currency,
      qty: 1,
      modifiers: [],
    })
  }

  const addConfigured = (line: Omit<CartLine, 'key'>) => mergeIntoCart(line)
  // Adjust a line's qty by ±1; reaching 0 removes it from the cart.
  const changeQty = (key: string, delta: number) =>
    setCart((cur) =>
      cur
        .map((l) => (l.key === key ? { ...l, qty: l.qty + delta } : l))
        .filter((l) => l.qty > 0),
    )
  const removeLine = (key: string) => setCart((cur) => cur.filter((l) => l.key !== key))

  const resetOrder = () => {
    setCart([])
    setExistingOrderId(null)
    setSelectedTable(null)
  }

  const openShift = () =>
    void submit(
      async () => {
        await api.pos.sessions.open({ registerId: registerId as string, openingCash: 0 })
      },
      { onSuccess: session.refetch, errorTitle: 'Vardiya açılamadı' },
    )

  // Persist the cart as a POS order (create new, or update the table's open one).
  const persistOrder = async (): Promise<string> => {
    // One merged qty-N line per cart entry. Bundle children are never in the
    // cart — the server re-expands them from each parent product, so we don't
    // send them.
    const lines = cart.map((l) => ({
      productId: l.productId,
      qty: l.qty,
      modifiers: l.modifiers.map((m) => ({ groupId: m.groupId, optionId: m.optionId })),
    }))
    if (existingOrderId) {
      await api.pos.orders.update(existingOrderId, {
        orderType,
        tableId: selectedTable?.id ?? null,
        lines,
      })
      return existingOrderId
    }
    const order = await api.pos.orders.create({
      registerId: registerId as string,
      sessionId: session.data?.id ?? null,
      orderType,
      tableId: orderType === 'dine_in' ? selectedTable?.id ?? null : null,
      lines,
    })
    return order.id
  }

  const saveOrder = () =>
    void submit(async () => {
      await persistOrder()
    }, {
      onSuccess: () => {
        resetOrder()
        nav.goBack()
      },
      errorTitle: 'Sipariş kaydedilemedi',
    })

  const checkout = () => {
    if (cart.length === 0) return
    void submit(
      async () => {
        const orderId = await persistOrder()
        nav.navigate('pos.tender', { id: orderId, registerId }, 'Tahsilat')
      },
      { errorTitle: 'Tahsilat açılamadı' },
    )
  }

  // Load an occupied table's open order into the cart for editing/adding.
  const openTableOrder = (tbl: PosTableWithStatus) => {
    if (!tbl.openOrderId) return
    void submit(
      async () => {
        const order = await api.pos.orders.get(tbl.openOrderId as string)
        setExistingOrderId(order.id)
        setSelectedTable({ id: tbl.id, name: tbl.name })
        setOrderType('dine_in')
        setCart(cartFromOrder(order))
        setTablePickerOpen(false)
      },
      { errorTitle: 'Masa siparişi açılamadı' },
    )
  }

  // Beklet — park the cart as an open order, then clear the tab to start fresh.
  const parkOrder = () => {
    if (cart.length === 0) return
    void submit(
      async () => {
        await persistOrder()
      },
      {
        onSuccess: () => {
          resetOrder()
          heldOrders.refetch()
          Alert.alert('Beklemeye alındı', 'Sipariş bekleyen siparişlere eklendi.')
        },
        errorTitle: 'Sipariş beklemeye alınamadı',
      },
    )
  }

  // Recall — load a held order back into the cart for editing/checkout.
  const recallOrder = (order: PosOrderDto) => {
    setExistingOrderId(order.id)
    setOrderType(order.orderType)
    setSelectedTable(
      order.tableId ? { id: order.tableId, name: tableNameById.get(order.tableId) ?? 'Masa' } : null,
    )
    setCart(cartFromOrder(order))
    setHeldOrdersOpen(false)
  }

  const pickFreeTable = (tbl: PosTableWithStatus) => {
    setSelectedTable({ id: tbl.id, name: tbl.name })
    setExistingOrderId(null)
    setTablePickerOpen(false)
  }

  if (!registerId) {
    return (
      <Screen header={{ title: 'Satış', onBack: nav.goBack }}>
        <EmptyState icon="alert-triangle" title="Kasa seçilmedi" />
      </Screen>
    )
  }

  // No open shift → block selling.
  if (!session.loading && !session.data) {
    return (
      <Screen header={{ title: register.data?.name ?? 'Satış', onBack: nav.goBack }}>
        <Card style={{ gap: t.spacing[3], padding: t.spacing[5], alignItems: 'center' }}>
          <Icon name="clock" size={32} color={t.colors.mutedForeground} />
          <Text variant="title">Vardiya Kapalı</Text>
          <Text variant="body" tone="muted" style={{ textAlign: 'center' }}>
            Satışa başlamak için vardiya açın.
          </Text>
          <Button title="Vardiya Aç" fullWidth loading={busy} onPress={openShift} />
        </Card>
      </Screen>
    )
  }

  const needsTable = orderType === 'dine_in' && !selectedTable
  const canCheckout = cart.length > 0 && !needsTable

  return (
    <Screen
      header={{
        title: register.data?.name ?? 'Satış',
        subtitle: selectedTable ? `Masa: ${selectedTable.name}` : undefined,
        onBack: nav.goBack,
      }}
      footer={
        <View style={{ gap: t.spacing[2.5] }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="label" tone="muted">
              {itemCount} ürün
            </Text>
            <Text variant="h2" weight="bold">
              {formatMoney(grandTotal, currency)}
            </Text>
          </View>
          {needsTable ? (
            <Button title="Masa Seç" icon="grid" fullWidth onPress={() => setTablePickerOpen(true)} />
          ) : (
            <View style={{ flexDirection: 'row', gap: t.spacing[2] }}>
              {orderType === 'dine_in' ? (
                <Button
                  title="Kaydet"
                  icon="save"
                  variant="outline"
                  loading={busy}
                  disabled={cart.length === 0}
                  onPress={saveOrder}
                  style={{ flex: 1 }}
                />
              ) : (
                <Button
                  title="Beklet"
                  icon="pause-circle"
                  variant="outline"
                  loading={busy}
                  disabled={cart.length === 0}
                  onPress={parkOrder}
                  style={{ flex: 1 }}
                />
              )}
              <Button
                title="Tahsil Et"
                icon="credit-card"
                loading={busy}
                disabled={!canCheckout}
                onPress={checkout}
                style={{ flex: 1.4 }}
              />
            </View>
          )}
        </View>
      }
    >
      {/* Order type */}
      <SegmentedControl
        value={orderType}
        onChange={(v) => {
          setOrderType(v)
          if (v !== 'dine_in') setSelectedTable(null)
        }}
        options={[
          { value: 'takeaway', label: ORDER_TYPE_LABELS.takeaway, icon: 'shopping-bag' },
          { value: 'dine_in', label: ORDER_TYPE_LABELS.dine_in, icon: 'grid' },
          { value: 'delivery', label: ORDER_TYPE_LABELS.delivery, icon: 'truck' },
        ]}
      />

      {heldList.length > 0 ? (
        <Pressable
          onPress={() => setHeldOrdersOpen(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: t.spacing[2],
            padding: t.spacing[3],
            borderRadius: t.radius.lg,
            borderWidth: 1,
            borderColor: t.colors.inputBorder,
            backgroundColor: t.colors.card,
          }}
        >
          <Icon name="clock" size={18} color={t.colors.warning} />
          <Text variant="body" weight="medium" style={{ flex: 1 }}>
            Bekleyen Siparişler
          </Text>
          <Badge label={String(heldList.length)} tone="warning" />
          <Icon name="chevron-right" size={18} color={t.colors.mutedForeground} />
        </Pressable>
      ) : null}

      {orderType === 'dine_in' ? (
        <Pressable
          onPress={() => setTablePickerOpen(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: t.spacing[2],
            padding: t.spacing[3],
            borderRadius: t.radius.lg,
            borderWidth: 1,
            borderColor: selectedTable ? t.colors.primary : t.colors.inputBorder,
            backgroundColor: selectedTable ? t.colors.primarySoft : t.colors.card,
          }}
        >
          <Icon name="grid" size={18} color={selectedTable ? t.colors.primary : t.colors.mutedForeground} />
          <Text variant="body" weight="medium" style={{ flex: 1 }}>
            {selectedTable ? `Masa: ${selectedTable.name}` : 'Masa seçin'}
          </Text>
          {existingOrderId ? <Badge label="Açık sipariş" tone="warning" /> : null}
          <Icon name="chevron-right" size={18} color={t.colors.mutedForeground} />
        </Pressable>
      ) : null}

      <Input icon="search" placeholder="Ürün ara (ad / kod / barkod)…" value={query} onChangeText={setQuery} />

      {/* Category strip */}
      {(categories.data ?? []).length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: t.spacing[2], paddingVertical: t.spacing[0.5] }}
        >
          <CategoryPill label="Tümü" active={!selectedCat} onPress={() => setSelectedCat(null)} />
          {(categories.data ?? []).map((c) => (
            <CategoryPill
              key={c.id}
              label={c.name}
              imageUrl={c.imageUrl}
              active={selectedCat === c.id}
              onPress={() => setSelectedCat((cur) => (cur === c.id ? null : c.id))}
            />
          ))}
        </ScrollView>
      ) : null}

      {/* Cart */}
      {cart.length > 0 ? (
        <Card style={{ gap: t.spacing[2.5], padding: t.spacing[3] }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="overline" tone="muted">
              Sepet
            </Text>
            <Pressable onPress={resetOrder} hitSlop={8}>
              <Text variant="caption" tone="destructive" weight="medium">
                Temizle
              </Text>
            </Pressable>
          </View>
          {cart.map((l) => {
            const children = childrenFor(l.productId)
            return (
              <View key={l.key} style={{ gap: t.spacing[1] }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[2] }}>
                  <View style={{ flex: 1 }}>
                    <Text variant="body" weight="medium" numberOfLines={1}>
                      {l.name}
                    </Text>
                    {l.modifiers.length > 0 ? (
                      <Text variant="caption" tone="muted" numberOfLines={2}>
                        {l.modifiers.map((m) => m.optionName).join(', ')}
                      </Text>
                    ) : null}
                  </View>
                  <Text variant="label" weight="semibold" style={{ minWidth: 72, textAlign: 'right' }}>
                    {formatMoney(lineTotal(l), l.currency)}
                  </Text>
                </View>
                {/* Bundle components — read-only preview, indented under the parent. */}
                {children.map((c) => (
                  <View
                    key={c.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: t.spacing[2],
                      paddingLeft: t.spacing[3],
                    }}
                  >
                    <Icon name="corner-down-right" size={13} color={t.colors.mutedForeground} />
                    <Text variant="caption" tone="muted" style={{ flex: 1 }} numberOfLines={1}>
                      {c.qty}× {c.componentName}
                    </Text>
                    <Text variant="caption" tone={c.isFree ? 'success' : 'muted'} weight="medium">
                      {c.isFree ? 'Hediye' : formatMoney(childPrice(c) * c.qty, l.currency)}
                    </Text>
                  </View>
                ))}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[3] }}>
                  <Pressable onPress={() => changeQty(l.key, -1)} hitSlop={8}>
                    <Icon
                      name={l.qty <= 1 ? 'trash-2' : 'minus-circle'}
                      size={24}
                      color={l.qty <= 1 ? t.colors.mutedForeground : t.colors.mutedForeground}
                    />
                  </Pressable>
                  <Text variant="label" weight="bold" style={{ minWidth: 24, textAlign: 'center' }}>
                    {l.qty}
                  </Text>
                  <Pressable onPress={() => changeQty(l.key, 1)} hitSlop={8}>
                    <Icon name="plus-circle" size={24} color={t.colors.primary} />
                  </Pressable>
                  <View style={{ flex: 1 }} />
                  <Pressable onPress={() => removeLine(l.key)} hitSlop={8}>
                    <Icon name="trash-2" size={18} color={t.colors.mutedForeground} />
                  </Pressable>
                </View>
              </View>
            )
          })}
        </Card>
      ) : null}

      {/* Product grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[2.5] }}>
        {filtered.map((p) => {
          const hasMods = (modifierMap.data?.[p.id] ?? []).length > 0
          const hasBundle = (bundleMap.data?.[p.id] ?? []).length > 0
          return (
            <Pressable
              key={p.id}
              onPress={() => onProductPress(p)}
              style={({ pressed }) => ({
                width: '48%',
                flexGrow: 1,
                padding: t.spacing[2.5],
                borderRadius: t.radius.lg,
                borderWidth: 1,
                borderColor: t.colors.border,
                backgroundColor: pressed ? t.colors.muted : t.colors.card,
                gap: t.spacing[2],
                minHeight: 96,
              })}
            >
              <View style={{ position: 'relative' }}>
                <Thumb uri={p.imageUrl} fallback="package" size="tile" />
                {hasMods || hasBundle ? (
                  <View
                    style={{
                      position: 'absolute',
                      top: t.spacing[1],
                      right: t.spacing[1],
                      flexDirection: 'row',
                      gap: t.spacing[1],
                    }}
                  >
                    {hasBundle ? <TileBadge icon="gift" color={t.colors.success} /> : null}
                    {hasMods ? <TileBadge icon="sliders" color={t.colors.primary} /> : null}
                  </View>
                ) : null}
              </View>
              <Text variant="body" weight="medium" numberOfLines={2}>
                {p.name}
              </Text>
              <Text variant="label" weight="bold" tone="primary">
                {formatMoney(resolveUnitPrice(p, null, channelId), p.currency)}
              </Text>
            </Pressable>
          )
        })}
      </View>
      {filtered.length === 0 && !products.loading ? (
        <EmptyState icon="package" title="Ürün bulunamadı" />
      ) : null}
      <View style={{ height: t.spacing[4] }} />

      {modifierProduct ? (
        <ModifierSheet
          product={modifierProduct}
          channelId={channelId}
          taxInclusive={taxInclusive}
          onClose={() => setModifierProduct(null)}
          onAdd={(line) => {
            addConfigured(line)
            setModifierProduct(null)
          }}
        />
      ) : null}

      <TablePickerModal
        visible={tablePickerOpen}
        branchId={branchId}
        onClose={() => setTablePickerOpen(false)}
        onPickFree={pickFreeTable}
        onPickOccupied={openTableOrder}
      />

      <HeldOrdersModal
        visible={heldOrdersOpen}
        orders={heldList}
        loading={heldOrders.loading}
        tableNameById={tableNameById}
        onClose={() => setHeldOrdersOpen(false)}
        onPick={recallOrder}
      />
    </Screen>
  )
}

function CategoryPill({
  label,
  active,
  onPress,
  imageUrl,
}: {
  label: string
  active: boolean
  onPress: () => void
  imageUrl?: string
}) {
  const t = useTheme()
  const hasImage = !!imageUrl?.trim()
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.spacing[1.5],
        paddingLeft: hasImage ? t.spacing[1] : t.spacing[3.5],
        paddingRight: t.spacing[3.5],
        paddingVertical: hasImage ? t.spacing[1] : t.spacing[2],
        borderRadius: t.radius.full,
        borderWidth: 1,
        borderColor: active ? t.colors.primary : t.colors.inputBorder,
        backgroundColor: active ? t.colors.primary : t.colors.card,
      }}
    >
      {hasImage ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: 24, height: 24, borderRadius: 999 }}
          contentFit="cover"
          transition={120}
        />
      ) : null}
      <Text variant="label" weight={active ? 'semibold' : 'medium'} tone={active ? 'onPrimary' : 'default'}>
        {label}
      </Text>
    </Pressable>
  )
}

// Product/category thumbnail with a graceful icon fallback when no image URL.
function Thumb({
  uri,
  fallback,
  size,
}: {
  uri?: string
  fallback: IconName
  size: 'tile' | 'sm'
}) {
  const t = useTheme()
  const has = !!uri?.trim()
  const dim = size === 'tile' ? undefined : 44
  const radius = t.radius.md
  const common = {
    borderRadius: radius,
    backgroundColor: t.colors.muted,
  } as const
  if (size === 'tile') {
    return has ? (
      <Image
        source={{ uri }}
        style={{ width: '100%', aspectRatio: 1.4, ...common }}
        contentFit="cover"
        transition={150}
      />
    ) : (
      <View style={{ width: '100%', aspectRatio: 1.4, alignItems: 'center', justifyContent: 'center', ...common }}>
        <Icon name={fallback} size={26} color={t.colors.mutedForeground} />
      </View>
    )
  }
  return has ? (
    <Image source={{ uri }} style={{ width: dim, height: dim, ...common }} contentFit="cover" transition={150} />
  ) : (
    <View style={{ width: dim, height: dim, alignItems: 'center', justifyContent: 'center', ...common }}>
      <Icon name={fallback} size={20} color={t.colors.mutedForeground} />
    </View>
  )
}

// Small floating glyph chip shown over a product thumbnail (mods / bundle).
function TileBadge({ icon, color }: { icon: IconName; color: string }) {
  const t = useTheme()
  return (
    <View
      style={{
        width: 22,
        height: 22,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: t.colors.card,
        borderWidth: 1,
        borderColor: t.colors.border,
      }}
    >
      <Icon name={icon} size={12} color={color} />
    </View>
  )
}

// ── Modifier selection sheet ──────────────────────────────────────────────
function ModifierSheet({
  product,
  channelId,
  taxInclusive,
  onClose,
  onAdd,
}: {
  product: ProductDto
  channelId: string | null
  taxInclusive: boolean
  onClose: () => void
  onAdd: (line: Omit<CartLine, 'key'>) => void
}) {
  const t = useTheme()
  const groupsQ = useAsync(() => api.inventory.modifiers.listForProduct(product.id), [product.id])
  const groups = React.useMemo(
    () => (groupsQ.data ?? []).filter((g) => g.isActive).sort((a, b) => a.sortOrder - b.sortOrder),
    [groupsQ.data],
  )

  const base = resolveUnitPrice(product, null, channelId)
  const taxRate = product.taxRate ?? 0
  const [selected, setSelected] = React.useState<Record<string, string[]>>({})
  const [qty, setQty] = React.useState(1)

  // Seed with each group's default options once loaded.
  React.useEffect(() => {
    if (!groupsQ.data) return
    const init: Record<string, string[]> = {}
    for (const g of groups) {
      init[g.id] = g.options.filter((o) => o.isDefault && o.isActive).map((o) => o.id)
    }
    setSelected(init)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupsQ.data])

  const toggle = (group: ProductModifierGroupDto, optionId: string) => {
    setSelected((cur) => {
      const sel = cur[group.id] ?? []
      if (group.selectionType === 'single') {
        return { ...cur, [group.id]: sel[0] === optionId ? [] : [optionId] }
      }
      if (sel.includes(optionId)) {
        return { ...cur, [group.id]: sel.filter((id) => id !== optionId) }
      }
      if (group.maxSelect != null && sel.length >= group.maxSelect) return cur
      return { ...cur, [group.id]: [...sel, optionId] }
    })
  }

  const deltas = React.useMemo(() => {
    const out: number[] = []
    for (const g of groups) {
      for (const optId of selected[g.id] ?? []) {
        const opt = g.options.find((o) => o.id === optId)
        if (opt) out.push(opt.priceDelta)
      }
    }
    return out
  }, [groups, selected])

  const lineTotalPreview = taxBreakdown(
    lineGross(base, qty, 0, modifierDeltaSum(deltas)),
    taxRate,
    taxInclusive,
  ).total

  const missing = groups.filter((g) => {
    const count = (selected[g.id] ?? []).length
    return g.required && count < Math.max(g.minSelect, 1)
  })
  const valid = missing.length === 0

  const handleAdd = () => {
    const modifiers: CartModifier[] = []
    for (const g of groups) {
      for (const optId of selected[g.id] ?? []) {
        const opt = g.options.find((o) => o.id === optId)
        if (opt) {
          modifiers.push({
            groupId: g.id,
            optionId: opt.id,
            groupName: g.name,
            optionName: opt.name,
            priceDelta: opt.priceDelta,
          })
        }
      }
    }
    // Emit one merged qty-N line; the cart merges it with any identical
    // (same product + same modifiers) line already present.
    onAdd({
      productId: product.id,
      name: product.name,
      unitPrice: base,
      taxRate,
      currency: product.currency,
      qty,
      modifiers,
    })
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'flex-end' }}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: t.colors.background,
            borderTopLeftRadius: t.radius['2xl'],
            borderTopRightRadius: t.radius['2xl'],
            maxHeight: '88%',
          }}
        >
          <View style={{ alignItems: 'center', paddingTop: t.spacing[3] }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.colors.border }} />
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: t.spacing[4],
              paddingVertical: t.spacing[3],
            }}
          >
            <View style={{ flex: 1 }}>
              <Text variant="title" weight="bold" numberOfLines={1}>
                {product.name}
              </Text>
              <Text variant="caption" tone="muted">
                {formatMoney(base, product.currency)} başlangıç
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Icon name="x" size={24} color={t.colors.mutedForeground} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: t.spacing[4], paddingBottom: t.spacing[4], gap: t.spacing[4] }}>
            {groupsQ.loading ? (
              <Text variant="body" tone="muted">
                Seçenekler yükleniyor…
              </Text>
            ) : (
              groups.map((g) => {
                const sel = selected[g.id] ?? []
                return (
                  <View key={g.id} style={{ gap: t.spacing[2] }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[2] }}>
                      <Text variant="label" weight="bold" style={{ flex: 1 }}>
                        {g.name}
                      </Text>
                      {g.required ? <Badge label="Zorunlu" tone="warning" /> : null}
                      <Badge
                        label={g.selectionType === 'single' ? 'Tek seçim' : `Çoklu${g.maxSelect != null ? ` · max ${g.maxSelect}` : ''}`}
                        tone="muted"
                      />
                    </View>
                    {g.options
                      .filter((o) => o.isActive)
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((o) => {
                        const on = sel.includes(o.id)
                        return (
                          <Pressable
                            key={o.id}
                            onPress={() => toggle(g, o.id)}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              gap: t.spacing[3],
                              padding: t.spacing[3],
                              borderRadius: t.radius.md,
                              borderWidth: 1,
                              borderColor: on ? t.colors.primary : t.colors.inputBorder,
                              backgroundColor: on ? t.colors.primarySoft : t.colors.card,
                            }}
                          >
                            <Icon
                              name={
                                g.selectionType === 'single'
                                  ? on
                                    ? 'check-circle'
                                    : 'circle'
                                  : on
                                    ? 'check-square'
                                    : 'square'
                              }
                              size={20}
                              color={on ? t.colors.primary : t.colors.mutedForeground}
                            />
                            <Text variant="body" weight="medium" style={{ flex: 1 }}>
                              {o.name}
                            </Text>
                            {o.priceDelta !== 0 ? (
                              <Text variant="label" weight="semibold" tone={o.priceDelta > 0 ? 'default' : 'success'}>
                                {o.priceDelta > 0 ? '+' : ''}
                                {formatMoney(o.priceDelta, product.currency)}
                              </Text>
                            ) : null}
                          </Pressable>
                        )
                      })}
                  </View>
                )
              })
            )}
          </ScrollView>

          <View
            style={{
              padding: t.spacing[4],
              borderTopWidth: 1,
              borderTopColor: t.colors.border,
              gap: t.spacing[3],
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[3] }}>
                <Pressable onPress={() => setQty((q) => Math.max(1, q - 1))} hitSlop={8}>
                  <Icon name="minus-circle" size={30} color={t.colors.mutedForeground} />
                </Pressable>
                <Text variant="title" weight="bold" style={{ minWidth: 28, textAlign: 'center' }}>
                  {qty}
                </Text>
                <Pressable onPress={() => setQty((q) => q + 1)} hitSlop={8}>
                  <Icon name="plus-circle" size={30} color={t.colors.primary} />
                </Pressable>
              </View>
              <Text variant="h2" weight="bold">
                {formatMoney(lineTotalPreview, product.currency)}
              </Text>
            </View>
            <Button
              title="Sepete Ekle"
              icon="plus"
              fullWidth
              disabled={!valid}
              onPress={handleAdd}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

// ── Held (parked) orders — recall sheet ───────────────────────────────────
function HeldOrdersModal({
  visible,
  orders,
  loading,
  tableNameById,
  onClose,
  onPick,
}: {
  visible: boolean
  orders: PosOrderDto[]
  loading: boolean
  tableNameById: Map<string, string>
  onClose: () => void
  onPick: (order: PosOrderDto) => void
}) {
  const t = useTheme()

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'flex-end' }}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: t.colors.background,
            borderTopLeftRadius: t.radius['2xl'],
            borderTopRightRadius: t.radius['2xl'],
            maxHeight: '85%',
          }}
        >
          <View style={{ alignItems: 'center', paddingTop: t.spacing[3] }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.colors.border }} />
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: t.spacing[4],
              paddingVertical: t.spacing[3],
            }}
          >
            <Text variant="title" weight="bold" style={{ flex: 1 }}>
              Bekleyen Siparişler
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Icon name="x" size={24} color={t.colors.mutedForeground} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: t.spacing[4], paddingBottom: t.spacing[8], gap: t.spacing[2.5] }}>
            {loading ? (
              <Text variant="body" tone="muted">
                Yükleniyor…
              </Text>
            ) : orders.length === 0 ? (
              <EmptyState icon="clock" title="Bekleyen sipariş yok" />
            ) : (
              orders.map((order) => {
                const items = order.lines.reduce((s, l) => s + l.qty, 0)
                const typeLabel =
                  order.orderType === 'dine_in'
                    ? `${ORDER_TYPE_LABELS.dine_in}${
                        order.tableId ? ` · ${tableNameById.get(order.tableId) ?? 'Masa'}` : ''
                      }`
                    : ORDER_TYPE_LABELS[order.orderType]
                return (
                  <Pressable
                    key={order.id}
                    onPress={() => onPick(order)}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: t.spacing[3],
                      padding: t.spacing[3],
                      borderRadius: t.radius.lg,
                      borderWidth: 1,
                      borderColor: t.colors.border,
                      backgroundColor: pressed ? t.colors.muted : t.colors.card,
                    })}
                  >
                    <View style={{ flex: 1, gap: t.spacing[0.5] }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[2] }}>
                        <Text variant="body" weight="bold" numberOfLines={1}>
                          #{order.orderNo}
                        </Text>
                        <Badge label={typeLabel} tone="muted" />
                      </View>
                      <Text variant="caption" tone="muted">
                        {items} ürün · {formatTime(order.createdAt)}
                      </Text>
                    </View>
                    <Text variant="label" weight="bold">
                      {formatMoney(order.grandTotal, order.currencyCode)}
                    </Text>
                    <Icon name="chevron-right" size={18} color={t.colors.mutedForeground} />
                  </Pressable>
                )
              })
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

// ── Table picker (dine-in) ────────────────────────────────────────────────
function TablePickerModal({
  visible,
  branchId,
  onClose,
  onPickFree,
  onPickOccupied,
}: {
  visible: boolean
  branchId: string | null
  onClose: () => void
  onPickFree: (tbl: PosTableWithStatus) => void
  onPickOccupied: (tbl: PosTableWithStatus) => void
}) {
  const t = useTheme()
  const layout = useAsync<PosFloorLayoutDto[]>(
    () => api.pos.tables.layout(branchId ?? undefined),
    [branchId, visible],
    { enabled: visible },
  )
  const floors = layout.data ?? []

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'flex-end' }}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: t.colors.background,
            borderTopLeftRadius: t.radius['2xl'],
            borderTopRightRadius: t.radius['2xl'],
            maxHeight: '85%',
          }}
        >
          <View style={{ alignItems: 'center', paddingTop: t.spacing[3] }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.colors.border }} />
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: t.spacing[4],
              paddingVertical: t.spacing[3],
            }}
          >
            <Text variant="title" weight="bold" style={{ flex: 1 }}>
              Masa Seç
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Icon name="x" size={24} color={t.colors.mutedForeground} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ paddingHorizontal: t.spacing[4], paddingBottom: t.spacing[8], gap: t.spacing[4] }}>
            {layout.loading ? (
              <Text variant="body" tone="muted">
                Yükleniyor…
              </Text>
            ) : floors.length === 0 ? (
              <EmptyState icon="grid" title="Masa yok" description="Önce kat ve masa tanımlayın." />
            ) : (
              floors.map((floor) => (
                <View key={floor.id} style={{ gap: t.spacing[2] }}>
                  <Text variant="overline" tone="muted">
                    {floor.name}
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[2.5] }}>
                    {floor.tables.map((tbl) => {
                      const occupied = !!tbl.openOrderId
                      return (
                        <Pressable
                          key={tbl.id}
                          onPress={() => (occupied ? onPickOccupied(tbl) : onPickFree(tbl))}
                          style={{
                            width: '30%',
                            flexGrow: 1,
                            minHeight: 76,
                            padding: t.spacing[2.5],
                            borderRadius: t.radius.lg,
                            borderWidth: 1,
                            borderColor: occupied ? t.colors.warning : t.colors.success,
                            backgroundColor: occupied ? t.colors.card : t.colors.card,
                            gap: t.spacing[1],
                            justifyContent: 'space-between',
                          }}
                        >
                          <Text variant="body" weight="bold" numberOfLines={1}>
                            {tbl.name}
                          </Text>
                          {occupied ? (
                            <Text variant="caption" weight="semibold" tone="warning" numberOfLines={1}>
                              {formatMoney(tbl.openTotal)}
                            </Text>
                          ) : (
                            <Text variant="caption" tone="success" weight="medium">
                              Boş
                            </Text>
                          )}
                        </Pressable>
                      )
                    })}
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
