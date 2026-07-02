import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  ProductionPermissions,
  toApiError,
  type WorkOrderDto,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
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
import { Textarea } from '@/components/ui/textarea'

export function WoFinishDialog({
  open,
  onOpenChange,
  workOrder,
  onFinished,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  workOrder: WorkOrderDto
  onFinished?: () => void
}) {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canExecute = hasPermission(ProductionPermissions.workordersExecute)

  const [producedQuantity, setProducedQuantity] = React.useState(String(workOrder.plannedQuantity))
  const [rejectedQuantity, setRejectedQuantity] = React.useState('0')
  const [note, setNote] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setProducedQuantity(String(workOrder.plannedQuantity))
    setRejectedQuantity('0')
    setNote('')
  }, [open, workOrder])

  const mutation = useMutation({
    mutationFn: () =>
      api.production.workOrders.finish(workOrder.id, {
        producedQuantity: Number(producedQuantity) || 0,
        rejectedQuantity: Number(rejectedQuantity) || 0,
        note: note.trim() || null,
      }),
    onSuccess: () => {
      toast.success('İş emri tamamlandı')
      void qc.invalidateQueries({ queryKey: ['production'] })
      onOpenChange(false)
      onFinished?.()
    },
    onError: (e) => toast.error('Tamamlanamadı', { description: toApiError(e).message }),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>İş Emrini Bitir</DialogTitle>
          <DialogDescription>
            #{workOrder.sequence} {workOrder.name} · {workOrder.workCenterName}
          </DialogDescription>
        </DialogHeader>

        {workOrder.qualityCheckRequired ? (
          <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-muted-foreground">
            Bu operasyon kalite kontrolü gerektirir. Geçen bir kalite kaydı yoksa bitirme reddedilir.
          </p>
        ) : null}

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="wo-produced">Üretilen ({workOrder.unit})</Label>
              <Input id="wo-produced" type="number" value={producedQuantity} onChange={(e) => setProducedQuantity(e.target.value)} className="text-right tabular-nums" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wo-rejected">Reddedilen</Label>
              <Input id="wo-rejected" type="number" value={rejectedQuantity} onChange={(e) => setRejectedQuantity(e.target.value)} className="text-right tabular-nums" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wo-note">Not</Label>
            <Textarea id="wo-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!canExecute || mutation.isPending}>
            Bitir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
