import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Minus, Plus } from 'lucide-react'

import {
  resolveUnitPrice,
  type ProductBundleComponentDto,
  type ProductDto,
  type ProductModifierGroupDto,
} from '@turbohesap/shared'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { money } from '../labels'
import {
  buildModifiers,
  cartTotals,
  defaultSelections,
  makeLine,
  type CartLine,
} from '../lib/pos-cart'

// The product-options modal. Opens when a product with modifier groups is
// picked; the cashier chooses options (single = one, multi = many with
// min/max), sets a quantity, and adds a fully-priced line to the cart. Products
// with no groups skip this entirely (added straight to the cart by the caller).
export function ModifierSheet({
  product,
  channelId,
  taxInclusive,
  bundle,
  onClose,
  onAdd,
}: {
  product: ProductDto | null
  channelId: string | null
  taxInclusive: boolean
  bundle?: ProductBundleComponentDto[]
  onClose: () => void
  onAdd: (line: CartLine) => void
}) {
  const open = !!product
  const groupsQuery = useQuery({
    queryKey: ['pos', 'product-modifiers', product?.id],
    queryFn: () => api.inventory.modifiers.listForProduct(product!.id),
    enabled: open,
  })
  const groups = React.useMemo(() => groupsQuery.data ?? [], [groupsQuery.data])

  const [qty, setQty] = React.useState(1)
  const [selected, setSelected] = React.useState<Record<string, string[]>>({})

  // Reset selections when the product (or its groups) changes.
  React.useEffect(() => {
    if (open) {
      setQty(1)
      setSelected(defaultSelections(groups))
    }
  }, [open, groups])

  const toggle = (group: ProductModifierGroupDto, optionId: string) => {
    setSelected((prev) => {
      const cur = prev[group.id] ?? []
      if (group.selectionType === 'single') {
        return { ...prev, [group.id]: cur[0] === optionId ? [] : [optionId] }
      }
      if (cur.includes(optionId)) {
        return { ...prev, [group.id]: cur.filter((x) => x !== optionId) }
      }
      if (group.maxSelect != null && cur.length >= group.maxSelect) return prev
      return { ...prev, [group.id]: [...cur, optionId] }
    })
  }

  const violations = groups.filter((g) => {
    const count = (selected[g.id] ?? []).length
    if (g.required && count < Math.max(1, g.minSelect)) return true
    if (g.minSelect && count > 0 && count < g.minSelect) return true
    return false
  })
  const canAdd = violations.length === 0

  const previewLine = React.useMemo<CartLine | null>(() => {
    if (!product) return null
    return makeLine(product, channelId, buildModifiers(groups, selected), qty, bundle)
  }, [product, channelId, groups, selected, qty, bundle])
  const previewTotal = previewLine ? cartTotals([previewLine], taxInclusive).grandTotal : 0

  const submit = () => {
    if (!product || !canAdd) return
    // One merged qty-N line; per-unit splitting happens at tender time.
    onAdd(makeLine(product, channelId, buildModifiers(groups, selected), qty, bundle))
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent className="max-h-[88vh] gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle>{product?.name}</DialogTitle>
          <DialogDescription>
            {money(product ? resolveUnitPrice(product, null, channelId) : 0, product?.currency)} · seçenekleri belirleyin
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[52vh] space-y-5 overflow-y-auto px-5 py-4">
          {groupsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Seçenekler yükleniyor…</p>
          ) : null}
          {groups.map((g) => {
            const cur = selected[g.id] ?? []
            const invalid = violations.includes(g)
            return (
              <div key={g.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">
                    {g.name}
                    {g.required ? <span className="ml-1 text-destructive">*</span> : null}
                  </h4>
                  <span className={cn('text-2xs', invalid ? 'text-destructive' : 'text-muted-foreground')}>
                    {g.selectionType === 'single'
                      ? 'tek seçim'
                      : `çok seçim${g.maxSelect != null ? ` · en çok ${g.maxSelect}` : ''}${
                          g.minSelect ? ` · en az ${g.minSelect}` : ''
                        }`}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {g.options
                    .filter((o) => o.isActive)
                    .map((o) => {
                      const on = cur.includes(o.id)
                      return (
                        <button
                          key={o.id}
                          type="button"
                          onClick={() => toggle(g, o.id)}
                          className={cn(
                            'flex min-h-13 items-center justify-between rounded-xl border px-3.5 py-3 text-left text-sm transition-colors',
                            on ? 'border-primary bg-primary/10 text-primary shadow-sm' : 'bg-background hover:bg-accent',
                          )}
                        >
                          <span className="truncate">{o.name}</span>
                          {o.priceDelta !== 0 ? (
                            <span className="ml-2 shrink-0 text-2xs tabular-nums">
                              {o.priceDelta > 0 ? '+' : '−'}
                              {money(Math.abs(o.priceDelta), product?.currency)}
                            </span>
                          ) : null}
                        </button>
                      )
                    })}
                </div>
              </div>
            )
          })}
        </div>

        <DialogFooter className="flex-row items-center justify-between gap-3 border-t px-5 py-4 sm:justify-between">
          <div className="flex items-center gap-1">
            <Button type="button" variant="outline" size="icon-lg" onClick={() => setQty((q) => Math.max(1, q - 1))}>
              <Minus className="size-5" />
            </Button>
            <span className="w-10 text-center text-lg font-semibold tabular-nums">{qty}</span>
            <Button type="button" variant="outline" size="icon-lg" onClick={() => setQty((q) => q + 1)}>
              <Plus className="size-5" />
            </Button>
          </div>
          <Button type="button" className="h-14 flex-1 text-base font-semibold" disabled={!canAdd} onClick={submit}>
            Sepete Ekle · {money(previewTotal, product?.currency)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
