import * as React from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Pencil, Sparkles, Tag, Trash2, Wand2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  FilesPermissions,
  InventoryPermissions,
  LookupsPermissions,
  effectiveFieldDefsWithSource,
  toApiError,
  type CategoryFieldDef,
  type ProductDto,
  type ProductVariantDto,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { FileManager } from '@/modules/files/components/file-manager'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { money } from '../../labels'
import { BulkVariantPriceDialog } from './bulk-price'

export function VariantsTab({
  product,
  canWrite,
  refetch,
}: {
  product: ProductDto
  canWrite: boolean
  refetch: () => void
}) {
  const [editing, setEditing] = React.useState<ProductVariantDto | null>(null)
  const [bulkOpen, setBulkOpen] = React.useState(false)
  const [featureOpen, setFeatureOpen] = React.useState(false)

  const generate = useMutation({
    mutationFn: () => api.inventory.products.generateVariants(product.id, {}),
    onSuccess: (rows) => {
      toast.success(`${rows.length} varyant hazır`)
      refetch()
    },
    onError: (e) => toast.error('Üretim başarısız', { description: toApiError(e).message }),
  })

  const remove = useMutation({
    mutationFn: (variantId: string) => api.inventory.products.removeVariant(product.id, variantId),
    onSuccess: () => { toast.success('Varyant silindi'); refetch() },
    onError: (e) => toast.error('Silme başarısız', { description: toApiError(e).message }),
  })

  const axes = product.variantAttributes ?? []
  const variants = product.variants ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {axes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Varyant ekseni tanımlı değil. Ürünü düzenleyip “Varyantlı ürün”ü açın.
            </p>
          ) : (
            axes.map((a) => (
              <Badge key={a.name} variant="outline" className="gap-1">
                <span className="font-medium">{a.name}</span>
                <span className="text-muted-foreground">· {a.values.length}</span>
              </Badge>
            ))
          )}
        </div>
        {canWrite ? (
          <div className="flex gap-2">
            {variants.length > 0 ? (
              <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}>
                <Tag className="size-4" />
                Toplu fiyat
              </Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={() => setFeatureOpen(true)}>
              <Wand2 className="size-4" />
              Kategori özelliklerinden türet
            </Button>
            {axes.length > 0 ? (
              <Button size="sm" onClick={() => generate.mutate()} disabled={generate.isPending}>
                <Sparkles className="size-4" />
                Varyantları üret
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {bulkOpen ? (
        <BulkVariantPriceDialog
          product={product}
          onClose={() => setBulkOpen(false)}
          onSaved={() => { setBulkOpen(false); refetch() }}
        />
      ) : null}

      {featureOpen ? (
        <FeatureVariantsDialog
          product={product}
          onClose={() => setFeatureOpen(false)}
          onSaved={() => { setFeatureOpen(false); refetch() }}
        />
      ) : null}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Varyant</TableHead>
              <TableHead>Barkod</TableHead>
              <TableHead className="text-right">Fark</TableHead>
              <TableHead className="text-right">Satış</TableHead>
              <TableHead>Durum</TableHead>
              {canWrite ? <TableHead className="w-20 text-right">İşlem</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {variants.map((v) => (
              <TableRow key={v.id} className={v.isActive ? '' : 'opacity-55'}>
                <TableCell className="font-mono text-xs">{v.code}</TableCell>
                <TableCell className="font-medium">{v.label || '—'}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{v.barcode || '—'}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {v.priceExtra ? `+${money(v.priceExtra, product.currency)}` : '—'}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {money(v.effectiveSalePrice, product.currency)}
                  {v.salePrice != null ? <span className="ml-1 text-2xs text-muted-foreground">(sabit)</span> : null}
                </TableCell>
                <TableCell><Badge variant={v.isActive ? 'success' : 'outline'}>{v.isActive ? 'Aktif' : 'Pasif'}</Badge></TableCell>
                {canWrite ? (
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon-sm" onClick={() => setEditing(v)} aria-label="Düzenle">
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => { if (confirm(`"${v.label || v.code}" varyantı silinsin mi?`)) remove.mutate(v.id) }}
                      aria-label="Sil"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
            {variants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canWrite ? 7 : 6} className="text-center text-muted-foreground">
                  Varyant yok.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      {editing ? (
        <VariantEditDialog
          product={product}
          variant={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refetch() }}
        />
      ) : null}
    </div>
  )
}

function VariantEditDialog({
  product,
  variant,
  onClose,
  onSaved,
}: {
  product: ProductDto
  variant: ProductVariantDto
  onClose: () => void
  onSaved: () => void
}) {
  const [barcode, setBarcode] = React.useState(variant.barcode)
  const [priceExtra, setPriceExtra] = React.useState(String(variant.priceExtra ?? 0))
  const [salePrice, setSalePrice] = React.useState(variant.salePrice == null ? '' : String(variant.salePrice))
  const [purchasePrice, setPurchasePrice] = React.useState(variant.purchasePrice == null ? '' : String(variant.purchasePrice))
  const [isActive, setIsActive] = React.useState(variant.isActive)
  const { hasPermission } = useAuth()
  const canFiles = hasPermission(FilesPermissions.write)

  const save = useMutation({
    mutationFn: () => {
      const num = (s: string) => (s.trim() === '' ? null : Number(s))
      return api.inventory.products.updateVariant(product.id, variant.id, {
        barcode,
        priceExtra: Number(priceExtra) || 0,
        salePrice: num(salePrice),
        purchasePrice: num(purchasePrice),
        isActive,
      })
    },
    onSuccess: () => { toast.success('Varyant güncellendi'); onSaved() },
    onError: (e) => toast.error('Kaydetme başarısız', { description: toApiError(e).message }),
  })

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{variant.label || variant.code}</DialogTitle>
        </DialogHeader>
        <div className="grid max-h-[70vh] gap-3 overflow-y-auto px-1 py-1">
          <Row label="Barkod">
            <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} className="font-mono" />
          </Row>
          <div className="grid grid-cols-2 gap-3">
            <Row label={`Fiyat farkı (${product.currency})`}>
              <Input type="number" value={priceExtra} onChange={(e) => setPriceExtra(e.target.value)} />
            </Row>
            <Row label="Sabit satış (ops.)">
              <Input type="number" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} placeholder="Devral" />
            </Row>
            <Row label="Alış (ops.)">
              <Input type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} />
            </Row>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            Aktif
          </label>
          <div className="space-y-1.5 border-t pt-3">
            <Label>Varyant görselleri</Label>
            <FileManager entityType="ProductVariant" entityId={variant.id} kind="image" canWrite={canFiles} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>İptal</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>Kaydet</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

const LIST_FIELD_TYPES = new Set<CategoryFieldDef['type']>(['select', 'multiselect', 'lookup'])

// Derive variant axes from the product category's list-type custom fields. The
// user picks which fields + which values to use; each chosen field becomes a
// variant axis.
function FeatureVariantsDialog({
  product,
  onClose,
  onSaved,
}: {
  product: ProductDto
  onClose: () => void
  onSaved: () => void
}) {
  const { hasPermission } = useAuth()
  const categoriesQuery = useQuery({
    queryKey: ['inventory', 'categories'],
    queryFn: () => api.inventory.categories.list(),
    enabled: hasPermission(InventoryPermissions.categoriesRead),
  })
  const lookupsQuery = useQuery({
    queryKey: ['lookups', 'items'],
    queryFn: () => api.lookups.list(),
    enabled: hasPermission(LookupsPermissions.read),
  })

  // Effective list-type field defs for this product's category.
  const fields = React.useMemo<CategoryFieldDef[]>(() => {
    const defs = effectiveFieldDefsWithSource(product.categoryId, categoriesQuery.data ?? [])
    return defs.map((s) => s.def).filter((d) => LIST_FIELD_TYPES.has(d.type))
  }, [product.categoryId, categoriesQuery.data])

  // Values available for a field: inline options, else the bound lookup list.
  const valuesFor = React.useCallback(
    (def: CategoryFieldDef): string[] => {
      if (def.options?.length) return def.options
      if (def.lookupList) {
        return (lookupsQuery.data ?? [])
          .filter((it) => it.list === def.lookupList)
          .map((it) => it.value)
      }
      return []
    },
    [lookupsQuery.data],
  )

  // key → set of chosen values
  const [picked, setPicked] = React.useState<Record<string, Set<string>>>({})
  const togglePick = (key: string, value: string) =>
    setPicked((cur) => {
      const set = new Set(cur[key] ?? [])
      if (set.has(value)) set.delete(value)
      else set.add(value)
      return { ...cur, [key]: set }
    })

  const axes = fields
    .map((def) => ({ def, values: [...(picked[def.key] ?? [])] }))
    .filter((a) => a.values.length > 0)

  const generate = useMutation({
    mutationFn: () =>
      api.inventory.products.generateVariantsFromFeatures(product.id, {
        fields: axes.map((a) => ({ name: a.def.label, lookupList: a.def.lookupList, values: a.values })),
      }),
    onSuccess: (rows) => {
      toast.success(`${rows.length} varyant hazır`)
      onSaved()
    },
    onError: (e) => toast.error('Üretim başarısız', { description: toApiError(e).message }),
  })

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Kategori özelliklerinden varyant türet</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-4 overflow-y-auto px-1 py-1">
          {categoriesQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Yükleniyor…</p>
          ) : fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Bu ürünün kategorisinde liste tipinde (seçim/çoklu seçim/lookup) özellik tanımlı değil.
            </p>
          ) : (
            fields.map((def) => {
              const values = valuesFor(def)
              const chosen = picked[def.key] ?? new Set<string>()
              return (
                <div key={def.key} className="space-y-2 rounded-lg border p-3">
                  <p className="text-sm font-medium">{def.label}</p>
                  {values.length === 0 ? (
                    <p className="text-2xs text-muted-foreground">Bu özellik için değer bulunamadı.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {values.map((v) => {
                        const on = chosen.has(v)
                        return (
                          <button
                            key={v}
                            type="button"
                            onClick={() => togglePick(def.key, v)}
                            className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm transition-colors ${
                              on ? 'border-primary bg-primary/10 text-primary' : 'bg-background hover:bg-accent'
                            }`}
                          >
                            <Checkbox checked={on} className="pointer-events-none" />
                            {v}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>İptal</Button>
          <Button
            onClick={() => generate.mutate()}
            disabled={axes.length === 0 || generate.isPending}
          >
            <Sparkles className="size-4" />
            Türet ve üret
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
