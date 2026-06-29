import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, RotateCcw, Undo2 } from 'lucide-react'
import { toast } from 'sonner'

import { toApiError, type PosOrderDto } from '@turbohesap/shared'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ORDER_TYPE_LABELS, money } from '../labels'

// Geri giriş (return) — on a PAID order the cashier picks returnable line units
// and quantities and posts them back to stock (optionally refunding cash).
export function ReturnDialog({
  open,
  registerId,
  onClose,
}: {
  open: boolean
  registerId: string
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [orderId, setOrderId] = React.useState<string | null>(null)

  const paidQuery = useQuery({
    queryKey: ['pos', 'orders', 'paid', registerId],
    queryFn: () => api.pos.orders.list({ registerId, status: 'paid' }),
    enabled: open && !orderId,
  })
  const orderQuery = useQuery({
    queryKey: ['pos', 'order', orderId],
    queryFn: () => api.pos.orders.get(orderId as string),
    enabled: open && !!orderId,
  })

  const reset = () => setOrderId(null)
  const close = () => {
    reset()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : close())}>
      <DialogContent className="max-h-[88vh] gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle className="flex items-center gap-2">
            {orderId ? (
              <button type="button" onClick={reset} className="text-muted-foreground hover:text-foreground" aria-label="Geri">
                <ArrowLeft className="size-4" />
              </button>
            ) : (
              <Undo2 className="size-4" />
            )}
            İade — Geri Giriş
          </DialogTitle>
        </DialogHeader>

        {!orderId ? (
          <div className="max-h-[70vh] overflow-y-auto p-3">
            {paidQuery.isLoading ? (
              <p className="p-4 text-sm text-muted-foreground">Yükleniyor…</p>
            ) : (paidQuery.data ?? []).length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-8 text-center text-muted-foreground">
                <RotateCcw className="size-8 opacity-40" />
                <p className="text-sm">İade edilebilecek ödenmiş fiş yok</p>
              </div>
            ) : (
              <ul className="space-y-1.5">
                {(paidQuery.data ?? []).map((o) => (
                  <li key={o.id}>
                    <button
                      type="button"
                      onClick={() => setOrderId(o.id)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary hover:bg-accent"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{o.orderNo}</span>
                          <span className="rounded bg-muted px-1.5 py-0.5 text-2xs text-muted-foreground">
                            {ORDER_TYPE_LABELS[o.orderType] ?? o.orderType}
                          </span>
                        </div>
                        <p className="text-2xs text-muted-foreground">
                          {new Date(o.createdAt).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Istanbul' })}
                        </p>
                      </div>
                      <span className="shrink-0 font-semibold tabular-nums">{money(o.grandTotal, o.currencyCode)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : orderQuery.isLoading || !orderQuery.data ? (
          <p className="p-6 text-sm text-muted-foreground">Yükleniyor…</p>
        ) : (
          <ReturnLinePicker
            order={orderQuery.data}
            onDone={() => {
              qc.invalidateQueries({ queryKey: ['pos', 'orders'] })
              qc.invalidateQueries({ queryKey: ['pos', 'order', orderId] })
              close()
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function ReturnLinePicker({ order, onDone }: { order: PosOrderDto; onDone: () => void }) {
  // Returnable lines that still have un-returned units.
  const returnable = order.lines.filter((l) => l.returnable && l.returnedQty < l.qty)
  const [qtys, setQtys] = React.useState<Record<string, number>>({})
  const [refund, setRefund] = React.useState(false)

  const setQty = (lineId: string, v: number, max: number) =>
    setQtys((cur) => ({ ...cur, [lineId]: Math.max(0, Math.min(max, v)) }))

  const selected = returnable
    .map((l) => ({ lineId: l.id, qty: qtys[l.id] ?? 0 }))
    .filter((x) => x.qty > 0)

  const ret = useMutation({
    mutationFn: () => api.pos.orders.returnLines(order.id, { lines: selected, refund }),
    onSuccess: () => {
      toast.success('İade alındı')
      onDone()
    },
    onError: (e) => toast.error('İade başarısız', { description: toApiError(e).message }),
  })

  return (
    <div className="flex max-h-[78vh] flex-col">
      <div className="border-b px-5 py-2.5 text-2xs text-muted-foreground">
        {order.orderNo} · iade edilebilir kalemler
      </div>
      <div className="flex-1 space-y-1.5 overflow-y-auto p-3">
        {returnable.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">
            Bu fişte iade edilebilir kalem yok.
          </p>
        ) : (
          returnable.map((l) => {
            const max = l.qty - l.returnedQty
            return (
              <div key={l.id} className="flex items-center justify-between gap-2 rounded-lg border bg-card p-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{l.name}</p>
                  <p className="text-2xs text-muted-foreground tabular-nums">
                    {l.qty} adet
                    {l.returnedQty > 0 ? ` · ${l.returnedQty} iade edildi` : ''} · iade edilebilir {max}
                  </p>
                </div>
                <Input
                  type="number"
                  min={0}
                  max={max}
                  value={qtys[l.id] ?? 0}
                  onChange={(e) => setQty(l.id, Number(e.target.value) || 0, max)}
                  className="h-9 w-20 shrink-0 tabular-nums"
                />
              </div>
            )
          })
        )}
      </div>
      {returnable.length > 0 ? (
        <div className="space-y-3 border-t p-4">
          <label className="flex items-center justify-between rounded-md border px-3 py-2">
            <span className="text-sm">Tutarı iade et (kasa)</span>
            <Switch checked={refund} onCheckedChange={setRefund} />
          </label>
          <Button
            className="h-11 w-full"
            disabled={selected.length === 0 || ret.isPending}
            onClick={() => ret.mutate()}
          >
            <Undo2 className="size-4" />
            İade Al{selected.length ? ` · ${selected.reduce((s, x) => s + x.qty, 0)} adet` : ''}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
