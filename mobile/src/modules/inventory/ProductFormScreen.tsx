// ProductFormScreen — create or edit a product. Category picker + unit
// LookupSelect ("birim") + standard stock/price fields. Gated by
// inventory.products.write. (Category-specific dynamic attributes come later.)

import * as React from 'react'
import { Alert } from 'react-native'

import {
  CodePrefixContexts,
  InventoryPermissions,
  OrgPermissions,
  PRODUCT_ROLES,
  PRODUCT_ROLE_LABELS,
  PRODUCT_ROLE_PRESETS,
  PRODUCT_ROLE_CUSTOM_LABEL,
  inferProductRole,
  type CreateProductRequest,
  type ProductRole,
  type ProductType,
  type VariantAttribute,
  effectiveFieldDefsWithSource,
  missingRequiredAttributes,
} from '@turbohesap/shared'

import {
  Button,
  CodePrefixInput,
  type CodePrefixInputHandle,
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

interface FormState {
  code: string
  name: string
  description: string
  barcode: string
  brand: string
  /** Form-only preset over the flags below — never sent; `type`+flags are. */
  role: ProductRole | 'custom'
  type: ProductType
  trackStock: boolean
  canBeSold: boolean
  canBePurchased: boolean
  canBeManufactured: boolean
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
  role: 'mamul',
  type: 'stockable', trackStock: true,
  canBeSold: true, canBePurchased: true, canBeManufactured: false,
  categoryId: null, unit: null,
  hasVariants: false, variantAttributes: [],
  purchasePrice: '', salePrice: '', taxRate: '', currency: 'TRY',
  quantity: '0', minQuantity: '0', weight: '', imageUrl: '', isActive: true, attributes: {},
}

// Real, pickable roles + a display-only "Özel" shown when flags match no preset.
const ROLE_OPTIONS = PRODUCT_ROLES.map((r) => ({ value: r as ProductRole | 'custom', label: PRODUCT_ROLE_LABELS[r] }))

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
  const codeRef = React.useRef<CodePrefixInputHandle>(null)
  // Opening stock quantities keyed by branchId (create-only, stock-tracked products).
  const [openingStock, setOpeningStock] = React.useState<Record<string, string>>({})
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }))

  // Picking a role stamps its preset onto trackStock + the capability flags
  // (+ derived `type`). 'custom' is display-only, never applied.
  const applyRole = (r: ProductRole | 'custom') => {
    if (r === 'custom') return
    setForm((f) => ({ ...f, role: r, ...PRODUCT_ROLE_PRESETS[r] }))
  }
  // Toggling any advanced flag re-derives the role (matching preset or 'custom').
  const setFlag = (k: 'trackStock' | 'canBeSold' | 'canBePurchased' | 'canBeManufactured', v: boolean) =>
    setForm((f) => {
      const next = { ...f, [k]: v }
      return { ...next, role: inferProductRole(next) }
    })

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
      brand: p.brand, role: inferProductRole(p), type: p.type, trackStock: p.trackStock,
      canBeSold: p.canBeSold, canBePurchased: p.canBePurchased, canBeManufactured: p.canBeManufactured,
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
    void submit(
      async () => {
        const code = editing ? form.code : await (codeRef.current?.finalize() ?? Promise.resolve(form.code))
        const payload: CreateProductRequest = {
          code: code.trim(), name: form.name.trim(), description: form.description,
          barcode: form.barcode, brand: form.brand, type: form.type, trackStock: form.trackStock,
          canBeSold: form.canBeSold, canBePurchased: form.canBePurchased, canBeManufactured: form.canBeManufactured,
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
        <CodePrefixInput
          ref={codeRef}
          label="Stok kodu"
          context={CodePrefixContexts.inventoryProducts}
          value={form.code}
          onChange={(v) => set('code', v)}
          editable={!editing}
          placeholder="001"
        />
        <Input label="Ad" value={form.name} onChangeText={(v) => set('name', v)} />
        <FormSelect
          label="Ürün rolü"
          value={form.role}
          options={form.role === 'custom' ? [...ROLE_OPTIONS, { value: 'custom', label: PRODUCT_ROLE_CUSTOM_LABEL }] : ROLE_OPTIONS}
          onChange={applyRole}
        />
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
        <FormSwitchRow label="Varyantlı ürün" description="Renk/beden gibi eksenlerle varyantlar" value={form.hasVariants} onValueChange={(v) => set('hasVariants', v)} />
        <FormSwitchRow label="Aktif" value={form.isActive} onValueChange={(v) => set('isActive', v)} />
      </Section>

      {/* Gelişmiş: "Ürün rolü" ön-ayarının kurduğu bayraklar. Bir bayrağı elle
          değiştirmek rolü yeniden türetir (eşleşen ön-ayar veya "Özel"). */}
      <Section title="Gelişmiş (stok & kullanım)">
        <FormSwitchRow label="Stok takibi" description="On-hand stok takip edilsin" value={form.trackStock} onValueChange={(v) => setFlag('trackStock', v)} />
        <FormSwitchRow label="Satılabilir" value={form.canBeSold} onValueChange={(v) => setFlag('canBeSold', v)} />
        <FormSwitchRow label="Satın alınabilir" value={form.canBePurchased} onValueChange={(v) => setFlag('canBePurchased', v)} />
        <FormSwitchRow label="Üretilebilir" description="BOM'lu üretim emrine konu olabilir" value={form.canBeManufactured} onValueChange={(v) => setFlag('canBeManufactured', v)} />
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
