import * as React from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  PRODUCT_TYPES,
  OrgPermissions,
  effectiveFieldDefsWithSource,
  toApiError,
  type CreateProductRequest,
  type ProductDto,
  type ProductType,
  type VariantAttribute,
  type CategoryDto,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { LookupSelect } from '@/components/lookup-select'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { CategoryTreeSelect } from './category-tree-select'
import { DynamicAttributeFields, missingRequired } from './dynamic-attribute-fields'
import { VariantAttributesEditor } from './variant-attributes-editor'
import { PRODUCT_TYPE_LABELS } from '../labels'

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
  quantity: '0', minQuantity: '0', weight: '', imageUrl: '', isActive: true,
  attributes: {},
}

// Sentinel key for the "Genel" (branchId = null) opening-stock row.
const GENERAL_KEY = 'genel'

function fromDto(p: ProductDto): FormState {
  const n = (v: number | null) => (v == null ? '' : String(v))
  return {
    code: p.code, name: p.name, description: p.description, barcode: p.barcode,
    brand: p.brand, type: p.type, trackStock: p.trackStock,
    categoryId: p.categoryId, unit: p.unit || null,
    hasVariants: p.hasVariants, variantAttributes: p.variantAttributes ?? [],
    purchasePrice: n(p.purchasePrice), salePrice: n(p.salePrice), taxRate: n(p.taxRate),
    currency: p.currency, quantity: String(p.quantity), minQuantity: String(p.minQuantity),
    weight: n(p.weight), imageUrl: p.imageUrl, isActive: p.isActive, attributes: p.attributes ?? {},
  }
}

function toPayload(f: FormState): CreateProductRequest {
  const num = (s: string) => (s.trim() === '' ? null : Number(s))
  return {
    code: f.code.trim(), name: f.name.trim(), description: f.description,
    barcode: f.barcode, brand: f.brand, type: f.type, trackStock: f.trackStock,
    categoryId: f.categoryId, unit: f.unit ?? '',
    hasVariants: f.hasVariants,
    variantAttributes: f.hasVariants
      ? f.variantAttributes.filter((a) => a.name.trim() && a.values.length)
      : [],
    purchasePrice: num(f.purchasePrice), salePrice: num(f.salePrice),
    taxRate: num(f.taxRate), currency: f.currency,
    quantity: Number(f.quantity) || 0, minQuantity: Number(f.minQuantity) || 0,
    weight: num(f.weight), imageUrl: f.imageUrl, isActive: f.isActive, attributes: f.attributes,
  }
}

// Create/edit dialog for a product — shared by the list page and the detail page.
export function ProductFormDialog({
  open,
  onOpenChange,
  editing,
  categories,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: ProductDto | null
  categories: CategoryDto[]
  onSaved: () => void
}) {
  const [form, setForm] = React.useState<FormState>(EMPTY)
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((s) => ({ ...s, [k]: v }))

  // Per-branch opening stock (create only), keyed by branchId; GENERAL_KEY = null branch.
  const [openingStock, setOpeningStock] = React.useState<Record<string, string>>({})

  const { hasPermission } = useAuth()
  const canReadBranches = hasPermission(OrgPermissions.branchesRead)
  const branchesQuery = useQuery({
    queryKey: ['org', 'branches'],
    queryFn: () => api.org.branches.list(),
    enabled: canReadBranches,
  })
  const branches = branchesQuery.data ?? []

  // Reset the form whenever the dialog opens (for a fresh create or a given edit).
  React.useEffect(() => {
    if (open) {
      setForm(editing ? fromDto(editing) : EMPTY)
      setOpeningStock({})
    }
  }, [open, editing])

  const dynamicFields = React.useMemo(
    () => effectiveFieldDefsWithSource(form.categoryId, categories),
    [form.categoryId, categories],
  )

  const save = useMutation({
    mutationFn: async () => {
      const flat = dynamicFields.map((s) => s.def)
      const missing = missingRequired(flat, form.attributes)
      if (missing.length > 0) {
        const labels = flat.filter((f) => missing.includes(f.key)).map((f) => f.label)
        throw new Error(`Zorunlu alanları doldurun: ${labels.join(', ')}`)
      }
      const payload = toPayload(form)
      if (editing) {
        // Editing stock is handled via the stock tab / movements — never send `stocks` here.
        await api.inventory.products.update(editing.id, payload)
      } else {
        // Per-branch opening stock, create only and only when tracking stock.
        const stocks =
          form.trackStock && branches.length > 0
            ? Object.entries(openingStock)
                .map(([key, raw]) => ({
                  branchId: key === GENERAL_KEY ? null : key,
                  quantity: Number(raw) || 0,
                }))
                .filter((s) => s.quantity !== 0)
            : []
        await api.inventory.products.create(stocks.length > 0 ? { ...payload, stocks } : payload)
      }
    },
    onSuccess: () => {
      toast.success(editing ? 'Ürün güncellendi' : 'Ürün oluşturuldu')
      onOpenChange(false)
      onSaved()
    },
    onError: (e) => toast.error('İşlem başarısız', { description: toApiError(e).message }),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? 'Ürünü düzenle' : 'Yeni ürün'}</DialogTitle>
          <DialogDescription>
            Stok kartı bilgilerini girin. Varyant, stok ve kanal fiyatları ürün
            detayından yönetilir.
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[65vh] gap-4 overflow-y-auto px-1 py-2">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Stok kodu">
              <Input value={form.code} disabled={!!editing} onChange={(e) => set('code', e.target.value)} className="font-mono" placeholder="TS-001" />
            </Field>
            <Field label="Ad"><Input value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
            <Field label="Tür">
              <Select value={form.type} onValueChange={(v) => set('type', v as ProductType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRODUCT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{PRODUCT_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Kategori"><CategoryTreeSelect value={form.categoryId} onChange={(id) => set('categoryId', id)} /></Field>
            <Field label="Birim"><LookupSelect list="birim" value={form.unit} onChange={(k) => set('unit', k)} placeholder="Birim seçin" /></Field>
            <Field label="Marka"><Input value={form.brand} onChange={(e) => set('brand', e.target.value)} /></Field>
            <Field label="Barkod"><Input value={form.barcode} onChange={(e) => set('barcode', e.target.value)} className="font-mono" /></Field>
            <Field label="Ağırlık (kg)"><Input type="number" value={form.weight} onChange={(e) => set('weight', e.target.value)} /></Field>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="Alış fiyatı"><Input type="number" value={form.purchasePrice} onChange={(e) => set('purchasePrice', e.target.value)} /></Field>
            <Field label="Satış fiyatı"><Input type="number" value={form.salePrice} onChange={(e) => set('salePrice', e.target.value)} /></Field>
            <Field label="KDV %"><Input type="number" value={form.taxRate} onChange={(e) => set('taxRate', e.target.value)} /></Field>
            <Field label="Para birimi"><Input value={form.currency} onChange={(e) => set('currency', e.target.value)} /></Field>
            <Field label="Stok miktarı"><Input type="number" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} /></Field>
            <Field label="Min. stok"><Input type="number" value={form.minQuantity} onChange={(e) => set('minQuantity', e.target.value)} /></Field>
          </div>

          <Field label="Görsel adresi"><Input value={form.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} placeholder="https://…" /></Field>
          <Field label="Açıklama"><Textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} /></Field>

          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.trackStock} onCheckedChange={(v) => set('trackStock', v)} />
              Stok takibi
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.hasVariants} onCheckedChange={(v) => set('hasVariants', v)} />
              Varyantlı ürün
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.isActive} onCheckedChange={(v) => set('isActive', v)} />
              Aktif
            </label>
          </div>

          {form.hasVariants ? (
            <VariantAttributesEditor
              value={form.variantAttributes}
              onChange={(next) => set('variantAttributes', next)}
            />
          ) : null}

          {/* Category-specific dynamic fields (from the category's fieldDefs). */}
          <DynamicAttributeFields
            fields={dynamicFields}
            values={form.attributes}
            onChange={(k, v) => setForm((s) => ({ ...s, attributes: { ...s.attributes, [k]: v } }))}
          />

          {/* Per-branch opening stock — create only, when tracking stock and branches exist. */}
          {!editing && form.trackStock && branches.length > 0 ? (
            <div className="space-y-2 rounded-md border p-3">
              <Label>Açılış Stoğu (şubeye göre)</Label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {branches.map((b) => (
                  <Field key={b.id} label={b.name}>
                    <Input
                      type="number"
                      value={openingStock[b.id] ?? '0'}
                      onChange={(e) => setOpeningStock((s) => ({ ...s, [b.id]: e.target.value }))}
                    />
                  </Field>
                ))}
                <Field label="Genel">
                  <Input
                    type="number"
                    value={openingStock[GENERAL_KEY] ?? '0'}
                    onChange={(e) => setOpeningStock((s) => ({ ...s, [GENERAL_KEY]: e.target.value }))}
                  />
                </Field>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !form.code.trim() || !form.name.trim()}>
            {editing ? 'Kaydet' : 'Oluştur'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}
