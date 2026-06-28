import { useQuery } from '@tanstack/react-query'
import { Clock, ShoppingBag } from 'lucide-react'

import type { PosOrderDto } from '@turbohesap/shared'
import { api } from '@/lib/api'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ORDER_TYPE_LABELS, money } from '../labels'

// Recall a held (open, unpaid) order — the ones "Beklet" created. Picking one
// loads it back into the cart to continue or collect.
export function HeldOrdersDialog({
  open,
  registerId,
  onClose,
  onPick,
}: {
  open: boolean
  registerId: string
  onClose: () => void
  onPick: (order: PosOrderDto) => void
}) {
  const heldQuery = useQuery({
    queryKey: ['pos', 'orders', 'held', registerId],
    queryFn: () => api.pos.orders.list({ registerId, status: 'open' }),
    enabled: open,
  })
  const orders = heldQuery.data ?? []

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent className="max-h-[88vh] gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle>Bekleyen Adisyonlar</DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto p-3">
          {heldQuery.isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">Yükleniyor…</p>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-8 text-center text-muted-foreground">
              <ShoppingBag className="size-8 opacity-40" />
              <p className="text-sm">Bekleyen adisyon yok</p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {orders.map((o) => {
                const itemCount = o.lines.reduce((s, l) => s + l.qty, 0)
                return (
                  <li key={o.id}>
                    <button
                      type="button"
                      onClick={() => onPick(o)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary hover:bg-accent"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{o.orderNo}</span>
                          <span className="rounded bg-muted px-1.5 py-0.5 text-2xs text-muted-foreground">
                            {ORDER_TYPE_LABELS[o.orderType] ?? o.orderType}
                          </span>
                        </div>
                        <p className="flex items-center gap-1 text-2xs text-muted-foreground">
                          <Clock className="size-3" />
                          {new Date(o.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                          {' · '}
                          {itemCount} ürün
                        </p>
                      </div>
                      <span className="shrink-0 font-semibold tabular-nums">
                        {money(o.grandTotal, o.currencyCode)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
