import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { GripVertical, Gift, Plus, Save, X } from 'lucide-react'
import { toast } from 'sonner'

import {
  InventoryPermissions,
  toApiError,
  type ProductBundleComponentDto,
  type ProductDto,
  type SellableUnitDto,
  type SetBundleComponentInput,
} from '@turbohesap/shared'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ProductPickerField } from '@/components/product-picker/product-picker-field'

// Product detail "POS" tab — attach reusable modifier groups (Ekstra Soslar,
// Pişme Derecesi, …) to this product. These drive the POS modifier sheet shown
// when the cashier picks the product.
export function PosModifiersTab({ product }: { product: ProductDto }) {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canWrite = hasPermission(InventoryPermissions.modifiersWrite)

  const allGroupsQuery = useQuery({
    queryKey: ['inventory', 'modifier-groups'],
    queryFn: () => api.inventory.modifiers.listGroups(),
    enabled: hasPermission(InventoryPermissions.modifiersRead),
  })
  const attachedQuery = useQuery({
    queryKey: ['inventory', 'products', product.id, 'modifiers'],
    queryFn: () => api.inventory.modifiers.listForProduct(product.id),
  })

  const [selected, setSelected] = React.useState<string[] | null>(null)
  // Initialise selection from the server once both queries resolve.
  React.useEffect(() => {
    if (attachedQuery.data && selected === null) {
      setSelected(attachedQuery.data.map((g) => g.id))
    }
  }, [attachedQuery.data, selected])

  const sel = selected ?? []
  const groups = allGroupsQuery.data ?? []

  const save = useMutation({
    mutationFn: () => api.inventory.modifiers.setForProduct(product.id, { groupIds: sel }),
    onSuccess: () => {
      toast.success('Ürün seçenekleri güncellendi')
      qc.invalidateQueries({ queryKey: ['inventory', 'products', product.id, 'modifiers'] })
      // keep the POS sell screen's "needs options?" map fresh
      qc.invalidateQueries({ queryKey: ['inventory', 'modifier-map'] })
    },
    onError: (e) => toast.error('Kaydedilemedi', { description: toApiError(e).message }),
  })

  const toggle = (id: string) =>
    setSelected((cur) => {
      const base = cur ?? []
      return base.includes(id) ? base.filter((x) => x !== id) : [...base, id]
    })

  const dirty =
    attachedQuery.data != null &&
    JSON.stringify([...sel].sort()) !== JSON.stringify(attachedQuery.data.map((g) => g.id).sort())

  return (
    <div className="space-y-4">
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="text-sm">POS Ürün Seçenekleri</CardTitle>
          <p className="text-2xs text-muted-foreground">
            Bu ürün satışta hangi seçenek gruplarını göstersin?
          </p>
        </div>
        {canWrite ? (
          <Button size="sm" disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
            <Save className="size-4" /> Kaydet
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-2">
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Tanımlı seçenek grubu yok. POS &gt; Ürün Seçenekleri bölümünden ekleyin.
          </p>
        ) : (
          groups.map((g) => {
            const on = sel.includes(g.id)
            return (
              <label
                key={g.id}
                className="flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 hover:bg-accent"
              >
                <Checkbox checked={on} onCheckedChange={() => canWrite && toggle(g.id)} disabled={!canWrite} />
                <GripVertical className="size-4 text-muted-foreground/50" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{g.name}</p>
                  <p className="text-2xs text-muted-foreground">
                    {g.selectionType === 'single' ? 'Tek seçim' : 'Çok seçim'}
                    {g.required ? ' · zorunlu' : ''} ·{' '}
                    {g.options.map((o) => o.name).join(', ') || 'seçenek yok'}
                  </p>
                </div>
              </label>
            )
          })
        )}
      </CardContent>
    </Card>

    <BundleEditor product={product} canWrite={canWrite} />
    </div>
  )
}

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

// "Birlikte verilen ürünler (paket)" — components handed out with this product
// at POS (e.g. a pizza comes with 2 ketchups). Saved via setForProduct; the POS
// cart previews these as indented child lines.
function BundleEditor({ product, canWrite }: { product: ProductDto; canWrite: boolean }) {
  const qc = useQueryClient()
  const bundleQuery = useQuery({
    queryKey: ['inventory', 'products', product.id, 'bundle'],
    queryFn: () => api.inventory.bundles.getForProduct(product.id),
  })

  const [rows, setRows] = React.useState<DraftComponent[] | null>(null)
  React.useEffect(() => {
    if (bundleQuery.data && rows === null) setRows(bundleQuery.data.map(toDraft))
  }, [bundleQuery.data, rows])
  const list = rows ?? []

  const save = useMutation({
    mutationFn: () => {
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
      return api.inventory.bundles.setForProduct(product.id, { components })
    },
    onSuccess: (saved) => {
      toast.success('Paket içeriği güncellendi')
      setRows(saved.map(toDraft))
      qc.invalidateQueries({ queryKey: ['inventory', 'products', product.id, 'bundle'] })
      qc.invalidateQueries({ queryKey: ['inventory', 'products', product.id] })
      qc.invalidateQueries({ queryKey: ['inventory', 'bundle-map'] })
    },
    onError: (e) => toast.error('Kaydedilemedi', { description: toApiError(e).message }),
  })

  const update = (i: number, patch: Partial<DraftComponent>) =>
    setRows((cur) => (cur ?? []).map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const remove = (i: number) => setRows((cur) => (cur ?? []).filter((_, idx) => idx !== i))
  const add = () =>
    setRows((cur) => [
      ...(cur ?? []),
      { componentProductId: '', componentVariantId: null, componentName: '', qty: 1, isFree: true, unitPrice: null, deductStock: true, returnable: false },
    ])

  // Magnifier multi-pick: each selected unit becomes its own bundle component.
  const addUnits = (i: number, units: SellableUnitDto[]) => {
    if (!units.length) return
    setRows((cur) => {
      const list = cur ?? []
      const made: DraftComponent[] = units.map((u) => ({
        componentProductId: u.productId,
        componentVariantId: u.variantId,
        componentName: u.label,
        qty: 1,
        isFree: true,
        unitPrice: null,
        deductStock: true,
        returnable: false,
      }))
      const target = list[i]
      const copy = [...list]
      if (target && !target.componentProductId) copy.splice(i, 1, ...made)
      else copy.splice(i + 1, 0, ...made)
      return copy
    })
  }

  const dirty =
    bundleQuery.data != null && JSON.stringify(list) !== JSON.stringify(bundleQuery.data.map(toDraft))

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <Gift className="size-4" /> Birlikte verilen ürünler (paket)
          </CardTitle>
          <p className="text-2xs text-muted-foreground">
            Bu ürün satılınca otomatik eklenecek ek ürünler (ücretsiz veya fiyatlı).
          </p>
        </div>
        {canWrite ? (
          <Button size="sm" disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
            <Save className="size-4" /> Kaydet
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-2">
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">Paket bileşeni tanımlı değil.</p>
        ) : (
          list.map((r, i) => (
            <div key={r.id ?? i} className="space-y-2 rounded-lg border bg-muted/30 p-2.5">
              <div className="flex items-end gap-2">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <Label className="text-[10px] text-muted-foreground">Ürün</Label>
                  <ProductPickerField
                    value={r.componentProductId || null}
                    onChange={(u) =>
                      update(i, {
                        componentProductId: u?.productId ?? '',
                        componentVariantId: u?.variantId ?? null,
                        componentName: u?.label ?? '',
                      })
                    }
                    allowMulti
                    onPickMulti={(units) => addUnits(i, units)}
                    disabled={!canWrite}
                    title="Paket bileşeni seç"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-[10px] text-muted-foreground">Adet</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={r.qty}
                    onChange={(e) => update(i, { qty: Number(e.target.value) || 0 })}
                    className="h-9 w-20 tabular-nums"
                    disabled={!canWrite}
                  />
                </div>
                {!r.isFree ? (
                  <div className="flex flex-col gap-1">
                    <Label className="text-[10px] text-muted-foreground">Fiyat</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={r.unitPrice ?? ''}
                      onChange={(e) => update(i, { unitPrice: e.target.value === '' ? null : Number(e.target.value) })}
                      placeholder="Devral"
                      className="h-9 w-24 tabular-nums"
                      disabled={!canWrite}
                    />
                  </div>
                ) : null}
                <div className="flex flex-col gap-1">
                  <Label className="text-[10px] text-transparent select-none">Sil</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9 shrink-0"
                    onClick={() => remove(i)}
                    disabled={!canWrite}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 pl-0.5">
                <label className="flex items-center gap-1.5 text-2xs text-muted-foreground">
                  <Switch checked={r.isFree} onCheckedChange={(v) => update(i, { isFree: v })} disabled={!canWrite} />
                  Ücretsiz
                </label>
                <label className="flex items-center gap-1.5 text-2xs text-muted-foreground">
                  <Switch checked={r.deductStock} onCheckedChange={(v) => update(i, { deductStock: v })} disabled={!canWrite} />
                  Stoktan düş
                </label>
                <label className="flex items-center gap-1.5 text-2xs text-muted-foreground">
                  <Switch checked={r.returnable} onCheckedChange={(v) => update(i, { returnable: v })} disabled={!canWrite} />
                  İade edilebilir
                </label>
              </div>
            </div>
          ))
        )}
        {canWrite ? (
          <Button type="button" variant="outline" size="sm" onClick={add}>
            <Plus className="size-4" /> Bileşen ekle
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}
