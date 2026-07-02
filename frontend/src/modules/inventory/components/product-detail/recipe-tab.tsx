import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChefHat, Plus, Save, TriangleAlert, X } from 'lucide-react'
import { toast } from 'sonner'

import {
  InventoryPermissions,
  toApiError,
  type ProductDto,
  type RecipeComponentDto,
  type SellableUnitDto,
  type SetRecipeComponentInput,
} from '@turbohesap/shared'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ProductPickerField } from '@/components/product-picker/product-picker-field'

// Product detail "Reçete" tab — the ingredients silently consumed from stock
// when THIS product is sold (POS settle / sales-invoice issue). Unlike a bundle,
// ingredients are not shown as separate cart lines; they are a silent backflush
// at the ingredient's AVCO cost. Best suited to "Stoksuz / anında hazırlanan"
// menu items (pizza, köfte, hamburger).
export function RecipeTab({ product }: { product: ProductDto }) {
  const { hasPermission } = useAuth()
  const canWrite = hasPermission(InventoryPermissions.productsWrite)
  return <RecipeEditor product={product} canWrite={canWrite} />
}

interface DraftIngredient {
  id?: string
  componentProductId: string
  componentVariantId: string | null
  componentName: string
  quantity: number
  unit: string | null
}

function toDraft(c: RecipeComponentDto): DraftIngredient {
  return {
    id: c.id,
    componentProductId: c.componentProductId,
    componentVariantId: c.componentVariantId,
    componentName: c.componentName,
    quantity: c.quantity,
    unit: c.unit,
  }
}

function RecipeEditor({ product, canWrite }: { product: ProductDto; canWrite: boolean }) {
  const qc = useQueryClient()
  const recipeQuery = useQuery({
    queryKey: ['inventory', 'products', product.id, 'recipe'],
    queryFn: () => api.inventory.recipes.getForProduct(product.id),
  })

  const [rows, setRows] = React.useState<DraftIngredient[] | null>(null)
  React.useEffect(() => {
    if (recipeQuery.data && rows === null) setRows(recipeQuery.data.map(toDraft))
  }, [recipeQuery.data, rows])
  const list = rows ?? []

  const save = useMutation({
    mutationFn: () => {
      const components: SetRecipeComponentInput[] = list
        .filter((r) => r.componentProductId)
        .map((r, idx) => ({
          componentProductId: r.componentProductId,
          componentVariantId: r.componentVariantId,
          quantity: r.quantity || 0,
          unit: r.unit,
          sortOrder: idx,
        }))
      return api.inventory.recipes.setForProduct(product.id, { components })
    },
    onSuccess: (saved) => {
      toast.success('Reçete güncellendi')
      setRows(saved.map(toDraft))
      qc.invalidateQueries({ queryKey: ['inventory', 'products', product.id, 'recipe'] })
      qc.invalidateQueries({ queryKey: ['inventory', 'recipe-map'] })
    },
    onError: (e) => toast.error('Kaydedilemedi', { description: toApiError(e).message }),
  })

  const update = (i: number, patch: Partial<DraftIngredient>) =>
    setRows((cur) => (cur ?? []).map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const remove = (i: number) => setRows((cur) => (cur ?? []).filter((_, idx) => idx !== i))
  const add = () =>
    setRows((cur) => [
      ...(cur ?? []),
      { componentProductId: '', componentVariantId: null, componentName: '', quantity: 1, unit: null },
    ])

  // Magnifier multi-pick: each selected unit becomes its own ingredient row.
  const addUnits = (i: number, units: SellableUnitDto[]) => {
    if (!units.length) return
    setRows((cur) => {
      const rowsNow = cur ?? []
      const made: DraftIngredient[] = units.map((u) => ({
        componentProductId: u.productId,
        componentVariantId: u.variantId,
        componentName: u.label,
        quantity: 1,
        unit: null,
      }))
      const target = rowsNow[i]
      const copy = [...rowsNow]
      if (target && !target.componentProductId) copy.splice(i, 1, ...made)
      else copy.splice(i + 1, 0, ...made)
      return copy
    })
  }

  const dirty =
    recipeQuery.data != null && JSON.stringify(list) !== JSON.stringify(recipeQuery.data.map(toDraft))

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-1.5 text-sm">
            <ChefHat className="size-4" /> Reçete (satışta düşülen malzemeler)
          </CardTitle>
          <p className="text-2xs text-muted-foreground">
            Bu ürün satılınca stoktan sessizce düşülecek malzemeler (POS + satış faturası).
          </p>
        </div>
        {canWrite ? (
          <Button size="sm" disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
            <Save className="size-4" /> Kaydet
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-2">
        {product.trackStock ? (
          <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-2 text-2xs text-muted-foreground">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-warning" />
            <span>
              Bu ürün <b>stok takipli</b>. Reçete genelde <b>Stoksuz / anında hazırlanan</b>{' '}
              ürünler içindir — aksi halde satışta hem ürünün kendisi hem malzemeleri düşer (çift sayım).
            </span>
          </div>
        ) : null}
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">Reçete malzemesi tanımlı değil.</p>
        ) : (
          list.map((r, i) => (
            <div key={r.id ?? i} className="flex items-end gap-2 rounded-lg border bg-muted/30 p-2.5">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Label className="text-[10px] text-muted-foreground">Malzeme</Label>
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
                  title="Malzeme seç"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-[10px] text-muted-foreground">Miktar</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.0001"
                  value={r.quantity}
                  onChange={(e) => update(i, { quantity: Number(e.target.value) || 0 })}
                  className="h-9 w-24 tabular-nums"
                  disabled={!canWrite}
                />
              </div>
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
          ))
        )}
        {canWrite ? (
          <Button type="button" variant="outline" size="sm" onClick={add}>
            <Plus className="size-4" /> Malzeme ekle
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}
