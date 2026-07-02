// Product detail "POS" sections — mirror the web product detail POS tab:
//  • attach reusable modifier groups (Ekstra Soslar, Pişme Derecesi…)
//  • define a "birlikte verilen ürünler (paket)" bundle.
// Both save via the same shared clients the web app uses.

import * as React from 'react'
import { FlatList, Modal, Pressable, Switch, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  InventoryPermissions,
  type ProductBundleComponentDto,
  type ProductDto,
  type RecipeComponentDto,
  type SellableUnitDto,
  type SetBundleComponentInput,
  type SetRecipeComponentInput,
} from '@turbohesap/shared'

import {
  Badge,
  Button,
  Card,
  EmptyState,
  Icon,
  Input,
  Section,
  Text,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useSubmit } from '../../lib/use-submit'
import { useTheme } from '../../theme/theme-context'

export function PosSection({ product, onChanged }: { product: ProductDto; onChanged: () => void }) {
  return (
    <>
      <ModifierAttachSection product={product} />
      <BundleSection product={product} onChanged={onChanged} />
      <RecipeSection product={product} onChanged={onChanged} />
    </>
  )
}

// A labelled toggle row using RN's native Switch (no mobile Switch component).
function SwitchRow({
  label,
  value,
  onValueChange,
  disabled,
}: {
  label: string
  value: boolean
  onValueChange: (v: boolean) => void
  disabled?: boolean
}) {
  const t = useTheme()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: t.spacing[3] }}>
      <Text variant="label" tone="muted" style={{ flex: 1 }}>
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ true: t.colors.primary, false: t.colors.border }}
        thumbColor={t.colors.card}
      />
    </View>
  )
}

// --- Modifier groups (attach) -------------------------------------------------
function ModifierAttachSection({ product }: { product: ProductDto }) {
  const t = useTheme()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(InventoryPermissions.modifiersRead)
  const canWrite = hasPermission(InventoryPermissions.modifiersWrite)
  const { submit, busy } = useSubmit()

  const groupsQ = useAsync(() => api.inventory.modifiers.listGroups(), [], { enabled: canRead })
  const attachedQ = useAsync(() => api.inventory.modifiers.listForProduct(product.id), [product.id], { enabled: canRead })

  const [selected, setSelected] = React.useState<string[] | null>(null)
  React.useEffect(() => {
    if (attachedQ.data && selected === null) setSelected(attachedQ.data.map((g) => g.id))
  }, [attachedQ.data, selected])

  const sel = selected ?? []
  const groups = groupsQ.data ?? []
  const toggle = (id: string) =>
    setSelected((cur) => {
      const base = cur ?? []
      return base.includes(id) ? base.filter((x) => x !== id) : [...base, id]
    })

  const dirty =
    attachedQ.data != null &&
    JSON.stringify([...sel].sort()) !== JSON.stringify(attachedQ.data.map((g) => g.id).sort())

  const save = () =>
    submit(
      async () => {
        await api.inventory.modifiers.setForProduct(product.id, { groupIds: sel })
      },
      { onSuccess: () => attachedQ.refetch() },
    )

  if (!canRead) return null

  return (
    <Section
      title="POS ürün seçenekleri"
      action={canWrite && dirty ? <Button title="Kaydet" icon="check" size="sm" loading={busy} onPress={save} /> : undefined}
    >
      <Card>
        <Text variant="caption" tone="muted">
          Bu ürün satışta hangi seçenek gruplarını göstersin?
        </Text>
      </Card>

      {groups.length === 0 ? (
        <Card>
          <Text variant="caption" tone="muted">
            Tanımlı seçenek grubu yok. POS · Ürün seçenekleri bölümünden ekleyin.
          </Text>
        </Card>
      ) : (
        <Card style={{ gap: t.spacing[3] }}>
          {groups.map((g, i) => (
            <View
              key={g.id}
              style={{
                gap: 2,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: t.colors.border,
                paddingTop: i === 0 ? 0 : t.spacing[3],
              }}
            >
              <SwitchRow
                label={g.name}
                value={sel.includes(g.id)}
                onValueChange={() => canWrite && toggle(g.id)}
                disabled={!canWrite}
              />
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {g.selectionType === 'single' ? 'Tek seçim' : 'Çok seçim'}
                {g.required ? ' · zorunlu' : ''} · {g.options.map((o) => o.name).join(', ') || 'seçenek yok'}
              </Text>
            </View>
          ))}
        </Card>
      )}
    </Section>
  )
}

// --- Bundle (birlikte verilen ürünler) ---------------------------------------
interface DraftComponent {
  id?: string
  componentProductId: string
  componentVariantId: string | null
  componentName: string
  qty: number
  isFree: boolean
  unitPrice: number | null
  deductStock: boolean
  returnable: boolean
}

function toDraft(c: ProductBundleComponentDto): DraftComponent {
  return {
    id: c.id,
    componentProductId: c.componentProductId,
    componentVariantId: c.componentVariantId,
    componentName: c.componentName,
    qty: c.qty,
    isFree: c.isFree,
    unitPrice: c.unitPrice,
    deductStock: c.deductStock,
    returnable: c.returnable,
  }
}

function BundleSection({ product, onChanged }: { product: ProductDto; onChanged: () => void }) {
  const t = useTheme()
  const { hasPermission } = useAuth()
  const canWrite = hasPermission(InventoryPermissions.productsWrite)
  const { submit, busy } = useSubmit()

  const bundleQ = useAsync(() => api.inventory.bundles.getForProduct(product.id), [product.id])
  // Sellable units power the component picker (so variants are pickable too).
  const sellableQ = useAsync(() => api.inventory.products.sellable(), [], { enabled: canWrite })

  const [rows, setRows] = React.useState<DraftComponent[] | null>(null)
  const [pickerOpen, setPickerOpen] = React.useState(false)
  React.useEffect(() => {
    if (bundleQ.data && rows === null) setRows(bundleQ.data.map(toDraft))
  }, [bundleQ.data, rows])
  const list = rows ?? []

  const update = (i: number, patch: Partial<DraftComponent>) =>
    setRows((cur) => (cur ?? []).map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const remove = (i: number) => setRows((cur) => (cur ?? []).filter((_, idx) => idx !== i))
  const addUnit = (u: SellableUnitDto) => {
    setRows((cur) => [
      ...(cur ?? []),
      {
        componentProductId: u.productId,
        componentVariantId: u.variantId,
        componentName: u.label,
        qty: 1,
        isFree: true,
        unitPrice: null,
        deductStock: true,
        returnable: false,
      },
    ])
  }

  const dirty =
    bundleQ.data != null && JSON.stringify(list) !== JSON.stringify(bundleQ.data.map(toDraft))

  const save = () =>
    submit(
      async () => {
        const components: SetBundleComponentInput[] = list
          .filter((r) => r.componentProductId)
          .map((r, idx) => ({
            componentProductId: r.componentProductId,
            componentVariantId: r.componentVariantId,
            qty: r.qty || 1,
            isFree: r.isFree,
            unitPrice: r.isFree ? null : r.unitPrice,
            deductStock: r.deductStock,
            returnable: r.returnable,
            sortOrder: idx,
          }))
        await api.inventory.bundles.setForProduct(product.id, { components })
      },
      {
        onSuccess: () => {
          bundleQ.refetch()
          onChanged()
        },
      },
    )

  return (
    <Section
      title="Birlikte verilen ürünler (paket)"
      action={canWrite && dirty ? <Button title="Kaydet" icon="check" size="sm" loading={busy} onPress={save} /> : undefined}
    >
      <Card>
        <Text variant="caption" tone="muted">
          Bu ürün satılınca otomatik eklenecek ek ürünler (ücretsiz veya fiyatlı).
        </Text>
      </Card>

      {list.length === 0 ? (
        <EmptyState icon="gift" title="Paket bileşeni yok" description="Bu ürünle birlikte verilen bileşen tanımlı değil." />
      ) : (
        list.map((r, i) => (
          <Card key={r.id ?? i} style={{ gap: t.spacing[3] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[2] }}>
              <Text weight="semibold" numberOfLines={1} style={{ flex: 1 }}>
                {r.componentName || 'Ürün'}
              </Text>
              {r.isFree ? <Badge label="Ücretsiz" tone="success" /> : null}
              {canWrite ? (
                <Pressable onPress={() => remove(i)} hitSlop={8} style={{ padding: t.spacing[1] }}>
                  <Icon name="trash-2" size={18} color={t.colors.destructive} />
                </Pressable>
              ) : null}
            </View>
            <Input
              label="Adet"
              value={String(r.qty)}
              onChangeText={(v) => update(i, { qty: Number(v) || 0 })}
              keyboardType="decimal-pad"
              editable={canWrite}
            />
            {!r.isFree ? (
              <Input
                label={`Fiyat (${product.currency})`}
                value={r.unitPrice == null ? '' : String(r.unitPrice)}
                onChangeText={(v) => update(i, { unitPrice: v.trim() === '' ? null : Number(v) })}
                placeholder="Devral"
                keyboardType="decimal-pad"
                editable={canWrite}
              />
            ) : null}
            <SwitchRow label="Ücretsiz" value={r.isFree} onValueChange={(v) => update(i, { isFree: v })} disabled={!canWrite} />
            <SwitchRow label="Stoktan düş" value={r.deductStock} onValueChange={(v) => update(i, { deductStock: v })} disabled={!canWrite} />
            <SwitchRow label="İade edilebilir" value={r.returnable} onValueChange={(v) => update(i, { returnable: v })} disabled={!canWrite} />
          </Card>
        ))
      )}

      {canWrite ? (
        <Button title="Bileşen ekle" icon="plus" variant="outline" size="sm" onPress={() => setPickerOpen(true)} />
      ) : null}

      <ProductPickerSheet
        visible={pickerOpen}
        units={sellableQ.data ?? []}
        loading={sellableQ.loading}
        onClose={() => setPickerOpen(false)}
        onPick={(u) => {
          addUnit(u)
          setPickerOpen(false)
        }}
      />
    </Section>
  )
}

interface DraftIngredient {
  id?: string
  componentProductId: string
  componentVariantId: string | null
  componentName: string
  quantity: number
  unit: string | null
}

function toRecipeDraft(c: RecipeComponentDto): DraftIngredient {
  return {
    id: c.id,
    componentProductId: c.componentProductId,
    componentVariantId: c.componentVariantId,
    componentName: c.componentName,
    quantity: c.quantity,
    unit: c.unit,
  }
}

// Reçete — ingredients silently consumed from stock when THIS product is sold
// (POS settle / sales-invoice issue). Not shown as separate cart lines. Suits
// "Stoksuz / anında hazırlanan" menu items (pizza, köfte, hamburger).
function RecipeSection({ product, onChanged }: { product: ProductDto; onChanged: () => void }) {
  const t = useTheme()
  const { hasPermission } = useAuth()
  const canWrite = hasPermission(InventoryPermissions.productsWrite)
  const { submit, busy } = useSubmit()

  const recipeQ = useAsync(() => api.inventory.recipes.getForProduct(product.id), [product.id])
  const sellableQ = useAsync(() => api.inventory.products.sellable(), [], { enabled: canWrite })

  const [rows, setRows] = React.useState<DraftIngredient[] | null>(null)
  const [pickerOpen, setPickerOpen] = React.useState(false)
  React.useEffect(() => {
    if (recipeQ.data && rows === null) setRows(recipeQ.data.map(toRecipeDraft))
  }, [recipeQ.data, rows])
  const list = rows ?? []

  const update = (i: number, patch: Partial<DraftIngredient>) =>
    setRows((cur) => (cur ?? []).map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const remove = (i: number) => setRows((cur) => (cur ?? []).filter((_, idx) => idx !== i))
  const addUnit = (u: SellableUnitDto) => {
    setRows((cur) => [
      ...(cur ?? []),
      { componentProductId: u.productId, componentVariantId: u.variantId, componentName: u.label, quantity: 1, unit: null },
    ])
  }

  const dirty =
    recipeQ.data != null && JSON.stringify(list) !== JSON.stringify(recipeQ.data.map(toRecipeDraft))

  const save = () =>
    submit(
      async () => {
        const components: SetRecipeComponentInput[] = list
          .filter((r) => r.componentProductId)
          .map((r, idx) => ({
            componentProductId: r.componentProductId,
            componentVariantId: r.componentVariantId,
            quantity: r.quantity || 0,
            unit: r.unit,
            sortOrder: idx,
          }))
        await api.inventory.recipes.setForProduct(product.id, { components })
      },
      {
        onSuccess: () => {
          recipeQ.refetch()
          onChanged()
        },
      },
    )

  return (
    <Section
      title="Reçete (satışta düşülen malzemeler)"
      action={canWrite && dirty ? <Button title="Kaydet" icon="check" size="sm" loading={busy} onPress={save} /> : undefined}
    >
      <Card>
        <Text variant="caption" tone="muted">
          Bu ürün satılınca stoktan sessizce düşülecek malzemeler (POS + satış faturası).
          {product.trackStock ? ' Uyarı: bu ürün stok takipli — reçete genelde Stoksuz ürünler içindir.' : ''}
        </Text>
      </Card>

      {list.length === 0 ? (
        <EmptyState icon="list" title="Reçete yok" description="Bu ürün için malzeme tanımlı değil." />
      ) : (
        list.map((r, i) => (
          <Card key={r.id ?? i} style={{ gap: t.spacing[3] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[2] }}>
              <Text weight="semibold" numberOfLines={1} style={{ flex: 1 }}>
                {r.componentName || 'Malzeme'}
              </Text>
              {canWrite ? (
                <Pressable onPress={() => remove(i)} hitSlop={8} style={{ padding: t.spacing[1] }}>
                  <Icon name="trash-2" size={18} color={t.colors.destructive} />
                </Pressable>
              ) : null}
            </View>
            <Input
              label="Miktar"
              value={String(r.quantity)}
              onChangeText={(v) => update(i, { quantity: Number(v) || 0 })}
              keyboardType="decimal-pad"
              editable={canWrite}
            />
          </Card>
        ))
      )}

      {canWrite ? (
        <Button title="Malzeme ekle" icon="plus" variant="outline" size="sm" onPress={() => setPickerOpen(true)} />
      ) : null}

      <ProductPickerSheet
        visible={pickerOpen}
        units={sellableQ.data ?? []}
        loading={sellableQ.loading}
        onClose={() => setPickerOpen(false)}
        onPick={(u) => {
          addUnit(u)
          setPickerOpen(false)
        }}
      />
    </Section>
  )
}

// Searchable bottom-sheet product picker. Lists sellable units (one row per
// variant) with a live search box over name / code / barcode / category — so a
// large catalogue stays usable (a flat dropdown would not).
function ProductPickerSheet({
  visible,
  units,
  loading,
  onClose,
  onPick,
}: {
  visible: boolean
  units: SellableUnitDto[]
  loading?: boolean
  onClose: () => void
  onPick: (unit: SellableUnitDto) => void
}) {
  const t = useTheme()
  const insets = useSafeAreaInsets()
  const [query, setQuery] = React.useState('')

  React.useEffect(() => {
    if (visible) setQuery('')
  }, [visible])

  const q = query.trim().toLocaleLowerCase('tr')
  const filtered = React.useMemo(() => {
    if (!q) return units
    return units.filter((u) =>
      `${u.label} ${u.code} ${u.barcode} ${u.categoryName ?? ''}`.toLocaleLowerCase('tr').includes(q),
    )
  }, [units, q])

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: t.colors.background,
            borderTopLeftRadius: t.radius['2xl'],
            borderTopRightRadius: t.radius['2xl'],
            height: '85%',
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
            <Text variant="title" weight="semibold">Ürün seç</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Icon name="x" size={22} color={t.colors.mutedForeground} />
            </Pressable>
          </View>

          <View style={{ paddingHorizontal: t.spacing[5], paddingBottom: t.spacing[2] }}>
            <Input icon="search" placeholder="Ürün adı, kod veya barkod…" value={query} onChangeText={setQuery} autoFocus />
          </View>

          {loading ? (
            <Text variant="caption" tone="muted" style={{ paddingHorizontal: t.spacing[5] }}>
              Yükleniyor…
            </Text>
          ) : filtered.length === 0 ? (
            <EmptyState icon="search" title="Sonuç yok" description="Aramayla eşleşen ürün bulunamadı." />
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(u) => u.id}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingHorizontal: t.spacing[5], paddingBottom: insets.bottom + t.spacing[4] }}
              renderItem={({ item: u }) => (
                <Pressable
                  onPress={() => onPick(u)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: t.spacing[3],
                    paddingVertical: t.spacing[3],
                    borderBottomWidth: 1,
                    borderBottomColor: t.colors.border,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <View style={{ flex: 1, gap: 1 }}>
                    <Text variant="label" weight="medium" numberOfLines={1}>{u.label}</Text>
                    <Text variant="caption" tone="muted" numberOfLines={1}>
                      {u.code}
                      {u.categoryName ? ` · ${u.categoryName}` : ''}
                    </Text>
                  </View>
                  <Text variant="label" weight="semibold">
                    {u.salePrice == null ? '—' : `${u.salePrice} ${u.currency}`}
                  </Text>
                </Pressable>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  )
}
