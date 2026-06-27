// Sub-resource sections for the product detail screen: variants, per-branch
// stock, per-channel prices and packagings (unit multipliers). Each lists the
// embedded rows and — when the user has the right permission — offers inline
// management (generate / upsert / delete). Mirrors the web product detail tabs.

import * as React from 'react'
import { Pressable, View } from 'react-native'

import {
  InventoryPermissions,
  OrgPermissions,
  SalesPermissions,
  type ProductDto,
} from '@turbohesap/shared'

import {
  Badge,
  Button,
  Card,
  Icon,
  Input,
  LookupSelect,
  Section,
  Text,
} from '../../components'
import { FormSelect, type SelectOption } from '../../components/form'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { confirmDestructive, useSubmit } from '../../lib/use-submit'
import { useTheme } from '../../theme/theme-context'
import { money } from './labels'
import { BulkChannelPriceModal, BulkVariantPriceModal } from './product-bulk-price'

const NONE = '__none__'

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
  const { hasPermission } = useAuth()
  const canStock = hasPermission(InventoryPermissions.productsStock)
  const { submit, busy } = useSubmit()
  const branches = useAsync(() => api.org.branches.list(), [], {
    enabled: hasPermission(OrgPermissions.branchesRead),
  })
  const variants = product.variants ?? []
  const rows = product.stock ?? []
  const total = rows.length ? rows.reduce((s, r) => s + r.quantity, 0) : product.quantity

  const [variantId, setVariantId] = React.useState<string>(NONE)
  const [branchId, setBranchId] = React.useState<string>(NONE)
  const [qty, setQty] = React.useState('0')

  const variantOpts: SelectOption<string>[] = [
    { value: NONE, label: 'Tüm ürün' },
    ...variants.map((v) => ({ value: v.id, label: v.label || v.code })),
  ]
  const branchOpts: SelectOption<string>[] = [
    { value: NONE, label: 'Genel (şubesiz)' },
    ...(branches.data ?? []).map((b) => ({ value: b.id, label: b.name })),
  ]

  return (
    <Section title="Stok">
      {canStock ? (
        <Card style={{ gap: 12 }}>
          {variants.length > 0 ? (
            <FormSelect label="Varyant" value={variantId} options={variantOpts} onChange={setVariantId} />
          ) : null}
          <FormSelect label="Şube" value={branchId} options={branchOpts} onChange={setBranchId} />
          <Input label="Miktar" value={qty} onChangeText={setQty} keyboardType="decimal-pad" />
          <Button
            title="Stok kaydet"
            size="sm"
            loading={busy}
            onPress={() =>
              submit(
                async () => {
                  await api.inventory.products.setStock(product.id, {
                    variantId: variantId === NONE ? null : variantId,
                    branchId: branchId === NONE ? null : branchId,
                    quantity: Number(qty) || 0,
                  })
                },
                { onSuccess: () => { setQty('0'); onChanged() } },
              )
            }
          />
        </Card>
      ) : null}

      {rows.length > 0 ? (
        <Rows>
          {rows.map((s) => (
            <Row
              key={s.id}
              title={s.variantLabel || 'Tüm ürün'}
              caption={s.branch?.name || 'Genel'}
              right={
                <Text variant="label" weight="semibold">
                  {s.quantity}
                  {product.unit ? ` ${product.unit}` : ''}
                </Text>
              }
              onDelete={
                canStock
                  ? () => submit(() => api.inventory.products.removeStock(product.id, s.id), { onSuccess: onChanged })
                  : undefined
              }
            />
          ))}
        </Rows>
      ) : (
        <Card>
          <Text variant="caption" tone="muted">Henüz stok kaydı yok.</Text>
        </Card>
      )}

      <Text variant="caption" tone="muted" style={{ textAlign: 'right' }}>
        Toplam: {total}{product.unit ? ` ${product.unit}` : ''}
      </Text>
    </Section>
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
