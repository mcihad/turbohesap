// ProductFormScreen — create or edit a product. Category picker + unit
// LookupSelect ("birim") + standard stock/price fields. Gated by
// inventory.products.write. (Category-specific dynamic attributes come later.)

import * as React from 'react'
import { Alert } from 'react-native'

import {
  InventoryPermissions,
  OrgPermissions,
  PRODUCT_TYPES,
  type CreateProductRequest,
  type ProductType,
  type VariantAttribute,
  effectiveFieldDefsWithSource,
  missingRequiredAttributes,
} from '@turbohesap/shared'

import {
  Button,
  EmptyState,
  FormSelect,
  FormSwitchRow,
  FormTextArea,
  Input,
  LookupSelect,
  Screen,
  Section,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { CategoryPicker } from './CategoryPicker'
import { DynamicAttributeFields } from './DynamicAttributeFields'
import { VariantAxesEditor } from './VariantAxesEditor'
import { PRODUCT_TYPE_LABELS } from './labels'

interface FormState {
  code: string
  name: string
  description: string
  barcode: string
  brand: string
  type: ProductType
  trackStock: boolean
  categoryId: string | null
  unit: string | null
  hasVariants: boolean
  variantAttributes: VariantAttribute[]
  purchasePrice: string
  salePrice: string
  taxRate: string
  currency: string
  quantity: string
  minQuantity: string
  weight: string
  imageUrl: string
  isActive: boolean
  attributes: Record<string, unknown>
}

const EMPTY: FormState = {
  code: '', name: '', description: '', barcode: '', brand: '',
  type: 'stockable', trackStock: true, categoryId: null, unit: null,
  hasVariants: false, variantAttributes: [],
  purchasePrice: '', salePrice: '', taxRate: '', currency: 'TRY',
  quantity: '0', minQuantity: '0', weight: '', imageUrl: '', isActive: true, attributes: {},
}

const TYPE_OPTIONS = PRODUCT_TYPES.map((t) => ({ value: t, label: PRODUCT_TYPE_LABELS[t] }))

export function ProductFormScreen() {
  const nav = useNav()
  const { hasPermission } = useAuth()
  const id = nav.current.params?.id ? String(nav.current.params.id) : null
  const editing = !!id
  const { submit, busy } = useSubmit()
  const existing = useAsync(() => api.inventory.products.get(id as string), [id], { enabled: editing })
  const categories = useAsync(() => api.inventory.categories.list(), [], {
    enabled: hasPermission(InventoryPermissions.categoriesRead),
  })
  const canReadBranches = hasPermission(OrgPermissions.branchesRead)
  const branches = useAsync(() => api.org.branches.list(), [], { enabled: !editing && canReadBranches })

  const [form, setForm] = React.useState<FormState>(EMPTY)
  // Opening stock quantities keyed by branchId (create-only, stock-tracked products).
  const [openingStock, setOpeningStock] = React.useState<Record<string, string>>({})
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }))
  const dynamicFields = React.useMemo(
    () => effectiveFieldDefsWithSource(form.categoryId, categories.data ?? []),
    [form.categoryId, categories.data],
  )

  React.useEffect(() => {
    const p = existing.data
    if (!p) return
    const n = (v: number | null) => (v == null ? '' : String(v))
    setForm({
      code: p.code, name: p.name, description: p.description, barcode: p.barcode,
      brand: p.brand, type: p.type, trackStock: p.trackStock,
      categoryId: p.categoryId, unit: p.unit || null,
      hasVariants: p.hasVariants, variantAttributes: p.variantAttributes ?? [],
      purchasePrice: n(p.purchasePrice), salePrice: n(p.salePrice), taxRate: n(p.taxRate),
      currency: p.currency, quantity: String(p.quantity), minQuantity: String(p.minQuantity),
      weight: n(p.weight), imageUrl: p.imageUrl, isActive: p.isActive, attributes: p.attributes ?? {},
    })
  }, [existing.data])

  if (!hasPermission(InventoryPermissions.productsWrite)) {
    return (
      <Screen header={{ title: 'Ürün', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu işlem için izniniz yok." />
      </Screen>
    )
  }

  function save() {
    const flat = dynamicFields.map((s) => s.def)
    const missing = missingRequiredAttributes(flat, form.attributes)
    if (missing.length > 0) {
      const labels = flat.filter((f) => missing.includes(f.key)).map((f) => f.label)
      Alert.alert('Zorunlu alanlar', `Lütfen doldurun: ${labels.join(', ')}`)
      return
    }
    const num = (s: string) => (s.trim() === '' ? null : Number(s))
    const payload: CreateProductRequest = {
      code: form.code.trim(), name: form.name.trim(), description: form.description,
      barcode: form.barcode, brand: form.brand, type: form.type, trackStock: form.trackStock,
      categoryId: form.categoryId, unit: form.unit ?? '',
      hasVariants: form.hasVariants,
      variantAttributes: form.hasVariants
        ? form.variantAttributes.filter((a) => a.name.trim() && a.values.length)
        : [],
      purchasePrice: num(form.purchasePrice), salePrice: num(form.salePrice),
      taxRate: num(form.taxRate), currency: form.currency,
      quantity: Number(form.quantity) || 0, minQuantity: Number(form.minQuantity) || 0,
      weight: num(form.weight), imageUrl: form.imageUrl, isActive: form.isActive, attributes: form.attributes,
    }
    void submit(
      async () => {
        if (editing) {
          await api.inventory.products.update(id as string, payload)
        } else {
          const stocks = (branches.data ?? [])
            .map((b) => ({ branchId: b.id, quantity: Number(openingStock[b.id]) || 0 }))
            .filter((s) => s.quantity !== 0)
          await api.inventory.products.create(
            form.trackStock && stocks.length > 0 ? { ...payload, stocks } : payload,
          )
        }
      },
      { onSuccess: nav.goBack },
    )
  }

  const canSave = form.code.trim() !== '' && form.name.trim() !== ''

  return (
    <Screen
      header={{ title: editing ? 'Ürünü düzenle' : 'Yeni ürün', onBack: nav.goBack }}
      footer={<Button title={editing ? 'Kaydet' : 'Oluştur'} fullWidth loading={busy} disabled={!canSave} onPress={save} />}
    >
      <Section title="Genel">
        <Input label="Stok kodu" value={form.code} editable={!editing} autoCapitalize="characters" onChangeText={(v) => set('code', v)} placeholder="TS-001" />
        <Input label="Ad" value={form.name} onChangeText={(v) => set('name', v)} />
        <FormSelect label="Tür" value={form.type} options={TYPE_OPTIONS} onChange={(v) => set('type', v)} />
        <CategoryPicker value={form.categoryId} onChange={(v) => set('categoryId', v)} />
        <LookupSelect list="birim" label="Birim" value={form.unit} onChange={(k) => set('unit', k)} placeholder="Birim seçin" />
        <Input label="Marka" value={form.brand} onChangeText={(v) => set('brand', v)} />
        <Input label="Barkod" value={form.barcode} onChangeText={(v) => set('barcode', v)} />
        <Input label="Ağırlık (kg)" value={form.weight} onChangeText={(v) => set('weight', v)} keyboardType="decimal-pad" />
      </Section>

      <Section title="Fiyat ve stok">
        <Input label="Alış fiyatı" value={form.purchasePrice} onChangeText={(v) => set('purchasePrice', v)} keyboardType="decimal-pad" />
        <Input label="Satış fiyatı" value={form.salePrice} onChangeText={(v) => set('salePrice', v)} keyboardType="decimal-pad" />
        <Input label="KDV %" value={form.taxRate} onChangeText={(v) => set('taxRate', v)} keyboardType="decimal-pad" />
        <Input label="Para birimi" value={form.currency} onChangeText={(v) => set('currency', v)} />
        <Input label="Stok miktarı" value={form.quantity} onChangeText={(v) => set('quantity', v)} keyboardType="decimal-pad" />
        <Input label="Min. stok" value={form.minQuantity} onChangeText={(v) => set('minQuantity', v)} keyboardType="decimal-pad" />
      </Section>

      {!editing && form.trackStock && (branches.data?.length ?? 0) > 0 ? (
        <Section title="Açılış Stoğu">
          {(branches.data ?? []).map((b) => (
            <Input
              key={b.id}
              label={b.name}
              value={openingStock[b.id] ?? ''}
              onChangeText={(v) => setOpeningStock((s) => ({ ...s, [b.id]: v }))}
              keyboardType="decimal-pad"
              placeholder="0"
            />
          ))}
        </Section>
      ) : null}

      <Section title="Diğer">
        <Input label="Görsel adresi" value={form.imageUrl} onChangeText={(v) => set('imageUrl', v)} autoCapitalize="none" placeholder="https://…" />
        <FormTextArea label="Açıklama" value={form.description} onChangeText={(v) => set('description', v)} />
        <FormSwitchRow label="Stok takibi" description="On-hand stok takip edilsin" value={form.trackStock} onValueChange={(v) => set('trackStock', v)} />
        <FormSwitchRow label="Varyantlı ürün" description="Renk/beden gibi eksenlerle varyantlar" value={form.hasVariants} onValueChange={(v) => set('hasVariants', v)} />
        <FormSwitchRow label="Aktif" value={form.isActive} onValueChange={(v) => set('isActive', v)} />
      </Section>

      {form.hasVariants ? (
        <Section title="Varyant özellikleri">
          <VariantAxesEditor value={form.variantAttributes} onChange={(v) => set('variantAttributes', v)} />
        </Section>
      ) : null}

      {/* Category-specific dynamic fields (from the selected category's fieldDefs). */}
      <DynamicAttributeFields
        fields={dynamicFields}
        values={form.attributes}
        onChange={(k, v) => setForm((f) => ({ ...f, attributes: { ...f.attributes, [k]: v } }))}
      />
    </Screen>
  )
}
