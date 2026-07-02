import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  ProductionPermissions,
  toApiError,
  type ManufacturingOrderDto,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Textarea } from '@/components/ui/textarea'
import { formatQty } from '../format'

export function MoCompleteDialog({
  open,
  onOpenChange,
  mo,
  onCompleted,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mo: ManufacturingOrderDto
  onCompleted: () => void
}) {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canComplete = hasPermission(ProductionPermissions.ordersComplete)

  const remaining = Math.max(0, mo.plannedQuantity - mo.producedQuantity)
  const [producedQuantity, setProducedQuantity] = React.useState(String(remaining || mo.plannedQuantity))
  const [scrappedQuantity, setScrappedQuantity] = React.useState('0')
  const [manual, setManual] = React.useState(mo.consumptionMode === 'manual')
  const [consumptions, setConsumptions] = React.useState<Record<string, string>>({})
  const [byproductOutputs, setByproductOutputs] = React.useState<Record<string, string>>({})
  const [notes, setNotes] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    const rem = Math.max(0, mo.plannedQuantity - mo.producedQuantity)
    setProducedQuantity(String(rem || mo.plannedQuantity))
    setScrappedQuantity('0')
    setManual(mo.consumptionMode === 'manual')
    setConsumptions(
      Object.fromEntries(mo.components.map((c) => [c.id, String(c.requiredQuantity)])),
    )
    setByproductOutputs(
      Object.fromEntries(mo.byproducts.map((b) => [b.id, String(b.quantity)])),
    )
    setNotes('')
  }, [open, mo])

  const mutation = useMutation({
    mutationFn: () => {
      const produced = Number(producedQuantity) || 0
      if (produced <= 0) throw new Error('Üretilen miktar 0’dan büyük olmalı')
      return api.production.orders.complete(mo.id, {
        producedQuantity: produced,
        scrappedQuantity: Number(scrappedQuantity) || 0,
        componentConsumptions: manual
          ? mo.components.map((c) => ({
              componentId: c.id,
              consumedQuantity: Number(consumptions[c.id] ?? 0) || 0,
            }))
          : undefined,
        byproductOutputs: manual && mo.byproducts.length
          ? mo.byproducts.map((b) => ({
              byproductId: b.id,
              quantity: Number(byproductOutputs[b.id] ?? 0) || 0,
            }))
          : undefined,
        notes: notes.trim() || null,
      })
    },
    onSuccess: () => {
      toast.success('Üretim emri tamamlandı')
      void qc.invalidateQueries({ queryKey: ['production'] })
      onOpenChange(false)
      onCompleted()
    },
    onError: (e) => toast.error('Tamamlanamadı', { description: toApiError(e).message }),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Üretim Emrini Tamamla</DialogTitle>
          <DialogDescription>
            {mo.orderNo} · {mo.productName}. Mamul girişi yapılır, bileşenler sarf edilir, maliyet hesaplanır.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cm-produced">Üretilen Miktar ({mo.unit})</Label>
              <Input id="cm-produced" type="number" value={producedQuantity} onChange={(e) => setProducedQuantity(e.target.value)} className="text-right tabular-nums" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cm-scrap">Fire / Hurda</Label>
              <Input id="cm-scrap" type="number" value={scrappedQuantity} onChange={(e) => setScrappedQuantity(e.target.value)} className="text-right tabular-nums" />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <div>
              <Label htmlFor="cm-manual">Tüketimi elle belirle</Label>
              <p className="text-xs text-muted-foreground">Kapalıysa reçeteye göre otomatik (backflush) sarf edilir.</p>
            </div>
            <Checkbox id="cm-manual" checked={manual} onCheckedChange={(v) => setManual(v === true)} />
          </div>

          {manual ? (
            <div className="space-y-3 rounded-lg border p-3">
              <p className="text-xs font-medium">Bileşen tüketimi</p>
              <div className="space-y-2">
                {mo.components.map((c) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm">{c.componentName}</span>
                    <span className="text-2xs text-muted-foreground">gerekli {formatQty(c.requiredQuantity)}</span>
                    <Input
                      type="number"
                      value={consumptions[c.id] ?? ''}
                      onChange={(e) => setConsumptions((m) => ({ ...m, [c.id]: e.target.value }))}
                      className="h-8 w-24 text-right tabular-nums"
                    />
                    <span className="w-10 text-2xs text-muted-foreground">{c.unit}</span>
                  </div>
                ))}
              </div>

              {mo.byproducts.length ? (
                <>
                  <p className="pt-2 text-xs font-medium">Yan ürün çıktısı</p>
                  <div className="space-y-2">
                    {mo.byproducts.map((b) => (
                      <div key={b.id} className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-sm">{b.productName}</span>
                        <Input
                          type="number"
                          value={byproductOutputs[b.id] ?? ''}
                          onChange={(e) => setByproductOutputs((m) => ({ ...m, [b.id]: e.target.value }))}
                          className="h-8 w-24 text-right tabular-nums"
                        />
                        <span className="w-10 text-2xs text-muted-foreground">{b.unit}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="cm-notes">Notlar</Label>
            <Textarea id="cm-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!canComplete || mutation.isPending}>
            Tamamla
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
