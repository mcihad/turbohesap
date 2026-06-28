import * as React from 'react'
import { Minus, PauseCircle, Plus, ShoppingCart, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { money } from '../labels'
import { cartTotals, lineTotal, type CartLine } from '../lib/pos-cart'

// The Adisyon (order) rail. Context controls on top (order type / table /
// recall), the scrollable line list in the middle, and the signature total
// block at the bottom — where the amount due is the biggest thing on screen and
// "Tahsil Et" is the one tall, obvious action. Product entry (search/scan) lives
// in the workspace, not here, so the rail stays focused on the bill.
export function CartPanel({
  lines,
  taxInclusive,
  currency,
  context,
  onQty,
  onRemove,
  onClear,
  onCheckout,
  onPark,
  busy,
  checkoutDisabled,
}: {
  lines: CartLine[]
  taxInclusive: boolean
  currency: string
  context: React.ReactNode
  onQty: (key: string, delta: number) => void
  onRemove: (key: string) => void
  onClear: () => void
  onCheckout: () => void
  onPark: () => void
  busy?: boolean
  checkoutDisabled?: boolean
}) {
  const totals = cartTotals(lines, taxInclusive)
  const empty = lines.length === 0

  return (
    <div className="flex h-full w-full flex-col bg-card">
      {/* Context: order type / table / recall */}
      <div className="space-y-3 border-b p-3">
        <div className="flex items-center justify-between">
          <span className="text-2xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Adisyon</span>
          {!empty ? (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-1 text-2xs font-medium text-muted-foreground transition-colors hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
              Temizle
            </button>
          ) : null}
        </div>
        {context}
      </div>

      {/* Lines */}
      <div className="flex-1 overflow-y-auto">
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
            <ShoppingCart className="size-9 opacity-30" />
            <p className="text-sm font-medium">Adisyon boş</p>
            <p className="text-2xs">Soldan ürün seçin veya barkod okutun.</p>
          </div>
        ) : (
          <ul className="divide-y">
            {lines.map((l) => (
              <li key={l.key} className="px-3 py-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium">{l.name}</span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {money(lineTotal(l, taxInclusive), currency)}
                  </span>
                </div>
                {l.modifiers.length ? (
                  <p className="mt-0.5 truncate text-2xs text-muted-foreground">
                    {l.modifiers.map((m) => m.optionName).join(', ')}
                  </p>
                ) : null}
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex items-center rounded-lg border">
                    <button
                      type="button"
                      onClick={() => onQty(l.key, -1)}
                      className="flex size-8 items-center justify-center rounded-l-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold tabular-nums">{l.qty}</span>
                    <button
                      type="button"
                      onClick={() => onQty(l.key, 1)}
                      className="flex size-8 items-center justify-center rounded-r-lg text-primary transition-colors hover:bg-primary/10"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(l.key)}
                    className="ml-auto text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Signature total block */}
      <div className="border-t bg-muted/30">
        <div className="space-y-1 px-4 pt-3 text-sm text-muted-foreground">
          <div className="flex justify-between">
            <span>Ara toplam</span>
            <span className="tabular-nums">{money(totals.subtotal, currency)}</span>
          </div>
          <div className="flex justify-between">
            <span>KDV</span>
            <span className="tabular-nums">{money(totals.taxTotal, currency)}</span>
          </div>
        </div>
        <div className="flex items-end justify-between px-4 pt-2">
          <div>
            <p className="text-2xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Toplam</p>
            <p className="text-3xl font-bold leading-none tracking-tight text-primary tabular-nums">
              {money(totals.grandTotal, currency)}
            </p>
          </div>
          <span className="rounded-full bg-card px-2.5 py-1 text-2xs font-medium text-muted-foreground tabular-nums">
            {totals.itemCount} ürün
          </span>
        </div>
        <div className="grid grid-cols-[1fr_1.7fr] gap-2 p-4 pt-3">
          <Button type="button" variant="outline" className="h-14" disabled={empty || busy} onClick={onPark}>
            <PauseCircle className="size-4" />
            Beklet
          </Button>
          <Button
            type="button"
            className="h-14 text-base font-semibold"
            disabled={empty || busy || checkoutDisabled}
            onClick={onCheckout}
          >
            Tahsil Et
          </Button>
        </div>
      </div>
    </div>
  )
}
