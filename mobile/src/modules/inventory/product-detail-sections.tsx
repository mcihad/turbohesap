// Sub-resource sections for the product detail screen: variants, per-branch
// stock, per-channel prices and packagings (unit multipliers). Each lists the
// embedded rows and — when the user has the right permission — offers inline
// management (generate / upsert / delete). Mirrors the web product detail tabs.

import * as React from 'react'
import { Modal, Pressable, ScrollView, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  InventoryPermissions,
  OrgPermissions,
  SalesPermissions,
  type BranchDto,
  type ProductDto,
} from '@turbohesap/shared'

import {
  Badge,
  Button,
  Card,
  EmptyState,
  Icon,
  Input,
  ListCard,
  ListRow,
  LookupSelect,
  Section,
  Text,
  withAlpha,
} from '../../components'
import { FormDatePicker, FormSelect, type SelectOption } from '../../components/form'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { formatDate } from '../../lib/datetime'
import { useAsync } from '../../lib/use-async'
import { confirmDestructive, useSubmit } from '../../lib/use-submit'
import { useTheme } from '../../theme/theme-context'
import { money } from './labels'
import { BulkChannelPriceModal, BulkVariantPriceModal } from './product-bulk-price'

const NONE = '__none__'

const cellKey = (variantId: string | null, branchId: string | null) =>
  `${variantId ?? 'none'}|${branchId ?? 'none'}`

// A compact list row: primary text + caption on the left, a right node, and an
// optional inline delete.
function Row({
  title,
  caption,
  right,
  onDelete,
  dim,
}: {
  title: string
  caption?: string
  right?: React.ReactNode
  onDelete?: () => void
  dim?: boolean
}) {
  const t = useTheme()
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.spacing[3],
        paddingVertical: t.spacing[2.5],
        opacity: dim ? 0.5 : 1,
      }}
    >
      <View style={{ flex: 1, gap: 1 }}>
        <Text variant="label" weight="medium" numberOfLines={1}>
          {title}
        </Text>
        {caption ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {caption}
          </Text>
        ) : null}
      </View>
      {right}
      {onDelete ? (
        <Pressable onPress={onDelete} hitSlop={8} style={{ padding: t.spacing[1] }}>
          <Icon name="trash-2" size={17} color={t.colors.destructive} />
        </Pressable>
      ) : null}
    </View>
  )
}

function Rows({ children }: { children: React.ReactNode }) {
  const t = useTheme()
  const items = React.Children.toArray(children)
  return (
    <Card>
      {items.map((child, i) => (
        <View
          key={i}
          style={{
            borderTopWidth: i === 0 ? 0 : 1,
            borderTopColor: t.colors.border,
          }}
        >
          {child}
        </View>
      ))}
    </Card>
  )
}

// --- Variants ------------------------------------------------------------
export function VariantsSection({
  product,
  onChanged,
}: {
  product: ProductDto
  onChanged: () => void
}) {
  const { hasPermission } = useAuth()
  const canWrite = hasPermission(InventoryPermissions.productsWrite)
  const { submit, busy } = useSubmit()
  const axes = product.variantAttributes ?? []
  const variants = product.variants ?? []
  const [bulk, setBulk] = React.useState(false)

  return (
    <Section
      title={`Varyantlar${variants.length ? ` (${variants.length})` : ''}`}
    >
      <Card style={{ gap: 12, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
        {axes.length === 0 ? (
          <Text variant="caption" tone="muted">
            Varyant ekseni yok. Ürünü düzenleyip “Varyantlı ürün”ü açın.
          </Text>
        ) : (
          axes.map((a) => <Badge key={a.name} label={`${a.name} · ${a.values.length}`} tone="muted" />)
        )}
      </Card>

      {canWrite && (axes.length > 0 || variants.length > 0) ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {variants.length > 0 ? (
            <Button title="Toplu fiyat" variant="outline" icon="tag" size="sm" onPress={() => setBulk(true)} />
          ) : null}
          {axes.length > 0 ? (
            <Button
              title="Varyantları üret"
              icon="zap"
              size="sm"
              loading={busy}
              onPress={() => submit(async () => { await api.inventory.products.generateVariants(product.id, {}) }, { onSuccess: onChanged })}
            />
          ) : null}
        </View>
      ) : null}

      {bulk ? (
        <BulkVariantPriceModal
          product={product}
          onClose={() => setBulk(false)}
          onSaved={() => { setBulk(false); onChanged() }}
        />
      ) : null}

      {variants.length > 0 ? (
        <Rows>
          {variants.map((v) => (
            <Row
              key={v.id}
              dim={!v.isActive}
              title={v.label || v.code}
              caption={`${v.code}${v.barcode ? ` · ${v.barcode}` : ''}`}
              right={
                <Text variant="label" weight="semibold">
                  {money(v.effectiveSalePrice, product.currency)}
                </Text>
              }
              onDelete={
                canWrite
                  ? () =>
                      confirmDestructive('Varyantı sil', `"${v.label || v.code}" silinsin mi?`, () =>
                        submit(() => api.inventory.products.removeVariant(product.id, v.id), { onSuccess: onChanged }),
                      )
                  : undefined
              }
            />
          ))}
        </Rows>
      ) : null}
    </Section>
  )
}

// --- Per-branch stock ----------------------------------------------------
export function StockSection({
  product,
  onChanged,
}: {
  product: ProductDto
  onChanged: () => void
}) {
  const t = useTheme()
  const { hasPermission } = useAuth()
  const canStock = hasPermission(InventoryPermissions.productsStock)
  const canRead = hasPermission(InventoryPermissions.productsRead)
  const branches = useAsync(() => api.org.branches.list(), [], {
    enabled: hasPermission(OrgPermissions.branchesRead),
  })
  const movementTypes = useAsync(() => api.inventory.movementTypes.list(), [], {
    enabled: canStock,
  })
  const movements = useAsync(
    () => api.inventory.stockMovements.list({ productId: product.id }),
    [product.id],
    { enabled: canRead },
  )
  const [sheetOpen, setSheetOpen] = React.useState(false)

  // Movement-sheet options: a "Genel" branch + each user-defined movement type
  // labelled with its direction (Giriş / Çıkış).
  const movementBranchOpts: SelectOption<string>[] = [
    { value: NONE, label: 'Genel' },
    ...(branches.data ?? []).map((b) => ({ value: b.id, label: b.name })),
  ]
  const movementTypeOpts: SelectOption<string>[] = [
    { value: '', label: 'Hareket tipi seçin' },
    ...(movementTypes.data ?? []).map((mt) => ({
      value: mt.id,
      label: `${mt.name} (${mt.direction === 'in' ? 'Giriş' : 'Çıkış'})`,
    })),
  ]

  const movementRows = movements.data ?? []

  return (
    <Section
      title="Stok"
      action={
        canStock ? (
          <Button
            title="Stok Hareketi"
            icon="activity"
            size="sm"
            variant="ghost"
            onPress={() => setSheetOpen(true)}
          />
        ) : undefined
      }
    >
      <StockMatrix
        product={product}
        branches={branches.data ?? []}
        canStock={canStock}
        onChanged={onChanged}
      />

      <Section title="Stok Hareketleri">
        {movementRows.length > 0 ? (
          <ListCard>
            {movementRows.map((m) => (
              <ListRow
                key={m.id}
                title={m.movementTypeName}
                subtitle={`${formatDate(m.date)} · ${m.branchName ?? 'Genel'}${m.description ? ` · ${m.description}` : ''}`}
                trailing={
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[2] }}>
                    {m.sourceModule === 'invoices' ? <Badge label="Fatura" tone="info" /> : null}
                    <Text
                      variant="label"
                      weight="semibold"
                      style={{ color: m.direction === 'in' ? t.colors.success : t.colors.destructive }}
                    >
                      {(m.direction === 'in' ? '+' : '−')}
                      {m.quantity}
                    </Text>
                  </View>
                }
              />
            ))}
          </ListCard>
        ) : (
          <EmptyState icon="activity" title="Hareket yok" description="Bu ürün için henüz stok hareketi yok." />
        )}
      </Section>

      <MovementSheet
        visible={sheetOpen}
        productId={product.id}
        typeOptions={movementTypeOpts}
        branchOptions={movementBranchOpts}
        onClose={() => setSheetOpen(false)}
        onSaved={() => {
          setSheetOpen(false)
          onChanged()
          movements.refetch()
        }}
      />
    </Section>
  )
}

// Şube × Varyant stok matrisi — varyant başına bir kart, her şube için
// düzenlenebilir miktar; değişen hücreler tek "Kaydet" ile toplu uygulanır.
function StockMatrix({
  product,
  branches,
  canStock,
  onChanged,
}: {
  product: ProductDto
  branches: BranchDto[]
  canStock: boolean
  onChanged: () => void
}) {
  const t = useTheme()
  const { submit, busy } = useSubmit()
  const variants = product.variants ?? []

  const rows =
    variants.length > 0
      ? variants.map((v) => ({ key: v.id, label: v.label || v.code, variantId: v.id as string | null }))
      : [{ key: 'none', label: 'Tüm ürün', variantId: null as string | null }]

  const cols = [
    { key: 'none', branchId: null as string | null, name: 'Genel' },
    ...branches.map((b) => ({ key: b.id, branchId: b.id as string | null, name: b.name })),
  ]

  const original = React.useMemo(() => {
    const m: Record<string, number> = {}
    for (const s of product.stock ?? []) m[cellKey(s.variantId, s.branchId)] = s.quantity
    return m
  }, [product.stock])

  const [values, setValues] = React.useState<Record<string, string>>({})

  const seed = React.useCallback(() => {
    const init: Record<string, string> = {}
    for (const r of rows) for (const c of cols) {
      const k = cellKey(r.variantId, c.branchId)
      init[k] = String(original[k] ?? 0)
    }
    setValues(init)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id, product.updatedAt, rows.length, cols.length])

  React.useEffect(() => {
    seed()
  }, [seed])

  const isDirty = (k: string) => (values[k] ?? '') !== String(original[k] ?? 0)
  const dirtyKeys = Object.keys(values).filter(isDirty)
  const num = (k: string) => Number(values[k]) || 0
  const rowTotal = (variantId: string | null) =>
    cols.reduce((s, c) => s + num(cellKey(variantId, c.branchId)), 0)

  const save = () =>
    submit(
      async () => {
        for (const k of dirtyKeys) {
          const [vid, bid] = k.split('|')
          await api.inventory.products.setStock(product.id, {
            variantId: vid === 'none' ? null : vid,
            branchId: bid === 'none' ? null : bid,
            quantity: Number(values[k]) || 0,
          })
        }
      },
      { onSuccess: onChanged, errorTitle: 'Kaydetme başarısız' },
    )

  return (
    <View style={{ gap: t.spacing[3] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="overline" tone="muted">
          Şube × Varyant Matrisi
        </Text>
        {canStock && dirtyKeys.length > 0 ? (
          <View style={{ flexDirection: 'row', gap: t.spacing[2] }}>
            <Button title="Sıfırla" variant="ghost" size="sm" onPress={seed} disabled={busy} />
            <Button title={`Kaydet (${dirtyKeys.length})`} size="sm" loading={busy} onPress={save} />
          </View>
        ) : null}
      </View>

      {rows.map((r) => (
        <Card key={r.key} style={{ gap: t.spacing[2] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text weight="semibold" numberOfLines={1} style={{ flex: 1 }}>
              {r.label}
            </Text>
            <Text variant="caption" tone="muted">
              Σ {rowTotal(r.variantId)}
              {product.unit ? ` ${product.unit}` : ''}
            </Text>
          </View>
          {cols.map((c) => {
            const k = cellKey(r.variantId, c.branchId)
            const dirty = isDirty(k)
            return (
              <View key={c.key} style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[3] }}>
                <Text variant="label" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
                  {c.name}
                </Text>
                <TextInput
                  value={values[k] ?? ''}
                  editable={canStock && !busy}
                  onChangeText={(txt) => setValues((v) => ({ ...v, [k]: txt }))}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                  style={{
                    width: 100,
                    textAlign: 'right',
                    paddingVertical: t.spacing[2],
                    paddingHorizontal: t.spacing[3],
                    borderRadius: t.radius.md,
                    borderWidth: 1,
                    borderColor: dirty ? t.colors.warning : t.colors.border,
                    backgroundColor: dirty ? withAlpha(t.colors.warning, 0.12) : t.colors.background,
                    color: t.colors.foreground,
                    fontVariant: ['tabular-nums'],
                    fontWeight: dirty ? '600' : '400',
                  }}
                />
              </View>
            )
          })}
        </Card>
      ))}
    </View>
  )
}

// Bottom sheet to record a stock movement (Stok Hareketi). Mirrors the invoice
// LineSheet: a slide-up Modal with a handle, a scrollable body of fields, and a
// pinned footer. "Kaydet" stays disabled until a movement type and a positive
// quantity are chosen; on success it posts the movement and lets the caller
// refresh the on-hand totals and the movements list.
function MovementSheet({
  visible,
  productId,
  typeOptions,
  branchOptions,
  onClose,
  onSaved,
}: {
  visible: boolean
  productId: string
  typeOptions: SelectOption<string>[]
  branchOptions: SelectOption<string>[]
  onClose: () => void
  onSaved: () => void
}) {
  const t = useTheme()
  const insets = useSafeAreaInsets()
  const { submit, busy } = useSubmit()

  const [movementTypeId, setMovementTypeId] = React.useState('')
  const [branchId, setBranchId] = React.useState(NONE)
  const [qty, setQty] = React.useState('1')
  const [date, setDate] = React.useState(() => new Date().toISOString())
  const [description, setDescription] = React.useState('')

  React.useEffect(() => {
    if (!visible) return
    setMovementTypeId('')
    setBranchId(NONE)
    setQty('1')
    setDate(new Date().toISOString())
    setDescription('')
  }, [visible])

  const valid = !!movementTypeId && (Number(qty) || 0) > 0

  const save = () =>
    submit(
      async () => {
        await api.inventory.stockMovements.create({
          productId,
          movementTypeId,
          quantity: Number(qty) || 0,
          branchId: branchId === NONE ? null : branchId,
          date,
          description: description.trim() || null,
        })
      },
      { onSuccess: onSaved },
    )

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: t.colors.background,
            borderTopLeftRadius: t.radius['2xl'],
            borderTopRightRadius: t.radius['2xl'],
            maxHeight: '92%',
            paddingTop: t.spacing[3],
          }}
        >
          <View style={{ alignItems: 'center', paddingBottom: t.spacing[2] }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.colors.border }} />
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: t.spacing[5],
              paddingBottom: t.spacing[2],
            }}
          >
            <Text variant="title" weight="semibold">Stok hareketi</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Icon name="x" size={22} color={t.colors.mutedForeground} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: t.spacing[5], paddingBottom: t.spacing[4], gap: t.spacing[3] }}
          >
            <FormSelect label="Hareket Tipi" value={movementTypeId} options={typeOptions} onChange={setMovementTypeId} />
            <FormSelect label="Şube" value={branchId} options={branchOptions} onChange={setBranchId} />
            <Input label="Miktar" value={qty} onChangeText={setQty} keyboardType="decimal-pad" />
            <FormDatePicker label="Tarih" value={date} onChange={setDate} mode="date" />
            <Input label="Açıklama" value={description} onChangeText={setDescription} placeholder="Opsiyonel" />
          </ScrollView>

          <View
            style={{
              paddingHorizontal: t.spacing[5],
              paddingTop: t.spacing[3],
              paddingBottom: insets.bottom + t.spacing[3],
              borderTopWidth: 1,
              borderTopColor: t.colors.border,
            }}
          >
            <Button title="Kaydet" icon="check" fullWidth loading={busy} disabled={!valid} onPress={save} />
          </View>
        </View>
      </View>
    </Modal>
  )
}

// --- Per-channel prices --------------------------------------------------
export function ChannelPricesSection({
  product,
  onChanged,
}: {
  product: ProductDto
  onChanged: () => void
}) {
  const { hasPermission } = useAuth()
  const canWrite = hasPermission(InventoryPermissions.productsWrite)
  const { submit, busy } = useSubmit()
  const channels = useAsync(() => api.sales.channels.list(), [], {
    enabled: hasPermission(SalesPermissions.channelsRead),
  })
  const variants = product.variants ?? []
  const rows = product.channelPrices ?? []

  const [variantId, setVariantId] = React.useState<string>(NONE)
  const [channelId, setChannelId] = React.useState<string>('')
  const [price, setPrice] = React.useState('')
  const [bulk, setBulk] = React.useState(false)

  const variantOpts: SelectOption<string>[] = [
    { value: NONE, label: 'Tüm ürün' },
    ...variants.map((v) => ({ value: v.id, label: v.label || v.code })),
  ]
  const channelOpts: SelectOption<string>[] = [
    { value: '', label: 'Kanal seçin' },
    ...(channels.data ?? []).map((c) => ({ value: c.id, label: c.name })),
  ]

  return (
    <Section title="Kanal fiyatları">
      <Card style={{ gap: 8 }}>
        <Text variant="caption" tone="muted">
          Taban satış: {money(product.salePrice, product.currency)}. Girilen kanallarda bu fiyat geçersiz kılınır.
        </Text>
      </Card>

      {canWrite && variants.length > 0 ? (
        <Button title="Kanala göre toplu" variant="outline" icon="layers" size="sm" onPress={() => setBulk(true)} />
      ) : null}

      {bulk ? (
        <BulkChannelPriceModal
          product={product}
          onClose={() => setBulk(false)}
          onSaved={() => { setBulk(false); onChanged() }}
        />
      ) : null}

      {canWrite ? (
        <Card style={{ gap: 12 }}>
          {variants.length > 0 ? (
            <FormSelect label="Varyant" value={variantId} options={variantOpts} onChange={setVariantId} />
          ) : null}
          <FormSelect label="Kanal" value={channelId} options={channelOpts} onChange={setChannelId} />
          <Input label={`Fiyat (${product.currency})`} value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
          <Button
            title="Fiyat kaydet"
            size="sm"
            loading={busy}
            disabled={!channelId}
            onPress={() =>
              submit(
                async () => {
                  await api.inventory.products.setChannelPrice(product.id, {
                    variantId: variantId === NONE ? null : variantId,
                    channelId,
                    salePrice: Number(price) || 0,
                  })
                },
                { onSuccess: () => { setPrice(''); onChanged() } },
              )
            }
          />
        </Card>
      ) : null}

      {rows.length > 0 ? (
        <Rows>
          {rows.map((c) => (
            <Row
              key={c.id}
              title={c.channel?.name || '—'}
              caption={c.variantLabel || 'Tüm ürün'}
              right={
                <Text variant="label" weight="semibold">
                  {money(c.salePrice, c.currency || product.currency)}
                </Text>
              }
              onDelete={
                canWrite
                  ? () => submit(() => api.inventory.products.removeChannelPrice(product.id, c.id), { onSuccess: onChanged })
                  : undefined
              }
            />
          ))}
        </Rows>
      ) : (
        <Card>
          <Text variant="caption" tone="muted">Kanal fiyatı yok.</Text>
        </Card>
      )}
    </Section>
  )
}

// --- Packagings (unit multipliers) ---------------------------------------
export function PackagingsSection({
  product,
  onChanged,
}: {
  product: ProductDto
  onChanged: () => void
}) {
  const { hasPermission } = useAuth()
  const canWrite = hasPermission(InventoryPermissions.productsWrite)
  const { submit, busy } = useSubmit()
  const rows = product.packagings ?? []

  // Un-discounted total = pack quantity × base unit price — shown struck-through
  // next to the pack price so the saving is visible (6 × 10 = 60 vs 50).
  const rawTotal = (pk: (typeof rows)[number]): number | null => {
    const base = pk.variantId
      ? product.variants.find((v) => v.id === pk.variantId)?.effectiveSalePrice ?? product.salePrice
      : product.salePrice
    return base == null ? null : base * pk.quantity
  }

  const [name, setName] = React.useState('')
  const [unit, setUnit] = React.useState<string | null>(null)
  const [qty, setQty] = React.useState('6')
  const [price, setPrice] = React.useState('')

  const preview =
    price.trim() === '' && product.salePrice != null
      ? `Otomatik: ${money((Number(qty) || 0) * product.salePrice, product.currency)}`
      : null

  return (
    <Section title="Paketler">
      {canWrite ? (
        <Card style={{ gap: 12 }}>
          <Input label="Ad" value={name} onChangeText={setName} placeholder="6'lı Koli" />
          <LookupSelect list="birim" label="Birim" value={unit} onChange={setUnit} placeholder="Birim" />
          <Input label="Çarpan (adet)" value={qty} onChangeText={setQty} keyboardType="decimal-pad" />
          <Input label={`Sabit fiyat (${product.currency})`} value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="Otomatik" />
          {preview ? <Text variant="caption" tone="muted">{preview}</Text> : null}
          <Button
            title="Paket ekle"
            size="sm"
            loading={busy}
            disabled={!name.trim()}
            onPress={() =>
              submit(
                async () => {
                  await api.inventory.products.createPackaging(product.id, {
                    name: name.trim(),
                    quantity: Number(qty) || 1,
                    unit: unit ?? '',
                    salePrice: price.trim() === '' ? null : Number(price),
                  })
                },
                { onSuccess: () => { setName(''); setQty('6'); setPrice(''); setUnit(null); onChanged() } },
              )
            }
          />
        </Card>
      ) : null}

      {rows.length > 0 ? (
        <Rows>
          {rows.map((pk) => (
            <Row
              key={pk.id}
              dim={!pk.isActive}
              title={pk.name}
              caption={`×${pk.quantity}${pk.unit ? ` ${pk.unit}` : ''}${pk.variantLabel ? ` · ${pk.variantLabel}` : ''}`}
              right={(() => {
                const raw = rawTotal(pk)
                const show = raw != null && pk.effectiveSalePrice != null && Math.abs(raw - pk.effectiveSalePrice) > 0.001
                return (
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text variant="label" weight="semibold">
                      {money(pk.effectiveSalePrice, product.currency)}
                    </Text>
                    {show ? (
                      <Text variant="caption" tone="muted" style={{ textDecorationLine: 'line-through' }}>
                        {money(raw, product.currency)}
                      </Text>
                    ) : null}
                  </View>
                )
              })()}
              onDelete={
                canWrite
                  ? () =>
                      confirmDestructive('Paketi sil', `"${pk.name}" silinsin mi?`, () =>
                        submit(() => api.inventory.products.removePackaging(product.id, pk.id), { onSuccess: onChanged }),
                      )
                  : undefined
              }
            />
          ))}
        </Rows>
      ) : (
        <Card>
          <Text variant="caption" tone="muted">Paket yok.</Text>
        </Card>
      )}
    </Section>
  )
}
