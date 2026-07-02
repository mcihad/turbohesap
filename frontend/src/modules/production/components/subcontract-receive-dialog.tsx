import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  ProductionPermissions,
  toApiError,
  type SubcontractDispatchDto,
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
import { formatQty } from '../format'

export function SubcontractReceiveDialog({
  open,
  onOpenChange,
  dispatch,
  onReceived,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  dispatch: SubcontractDispatchDto
  onReceived?: () => void
}) {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canManage = hasPermission(ProductionPermissions.subcontractManage)

  const [serviceCost, setServiceCost] = React.useState(String(dispatch.serviceCost || ''))
  const [returns, setReturns] = React.useState<Record<string, string>>({})
  const [notes, setNotes] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setServiceCost(String(dispatch.serviceCost || ''))
    setReturns(Object.fromEntries(dispatch.lines.map((l) => [l.id, ''])))
    setNotes('')
  }, [open, dispatch])

  const mutation = useMutation({
    mutationFn: () =>
      api.production.subcontract.receive(dispatch.id, {
        serviceCost: serviceCost ? Number(serviceCost) : undefined,
        returns: dispatch.lines
          .filter((l) => (returns[l.id] ?? '') !== '')
          .map((l) => ({ lineId: l.id, returnedQuantity: Number(returns[l.id]) || 0 })),
        notes: notes.trim() || null,
      }),
    onSuccess: () => {
      toast.success('Fason teslim alındı')
      void qc.invalidateQueries({ queryKey: ['production'] })
      onOpenChange(false)
      onReceived?.()
    },
    onError: (e) => toast.error('İşlem başarısız', { description: toApiError(e).message }),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Fasondan Teslim Al</DialogTitle>
          <DialogDescription>
            {dispatch.dispatchNo} · {dispatch.contactName}. Kullanılmayan (iade) malzeme miktarlarını girin.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="scr-cost">İşçilik Ücreti (fason)</Label>
            <Input id="scr-cost" type="number" value={serviceCost} onChange={(e) => setServiceCost(e.target.value)} className="text-right tabular-nums" />
          </div>

          <div className="space-y-2 rounded-lg border p-3">
            <p className="text-xs font-medium">İade edilen (kullanılmayan) malzeme</p>
            {dispatch.lines.map((l) => (
              <div key={l.id} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm">{l.componentName}</span>
                <span className="text-2xs text-muted-foreground">fasonda {formatQty(l.atSubcontractor)}</span>
                <Input
                  type="number"
                  value={returns[l.id] ?? ''}
                  onChange={(e) => setReturns((m) => ({ ...m, [l.id]: e.target.value }))}
                  placeholder="0"
                  className="h-8 w-24 text-right tabular-nums"
                />
                <span className="w-10 text-2xs text-muted-foreground">{l.unit}</span>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="scr-notes">Notlar</Label>
            <Textarea id="scr-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!canManage || mutation.isPending}>
            Teslim Al
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
