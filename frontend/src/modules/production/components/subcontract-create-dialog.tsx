import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
import { EntityCombobox } from '@/modules/invoices/components/entity-combobox'
import { SupplierSelect } from './pickers'

export function SubcontractCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (d: SubcontractDispatchDto) => void
}) {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canManage = hasPermission(ProductionPermissions.subcontractManage)

  const [manufacturingOrderId, setManufacturingOrderId] = React.useState<string | null>(null)
  const [contactId, setContactId] = React.useState<string | null>(null)
  const [dispatchDate, setDispatchDate] = React.useState(() => new Date().toISOString().slice(0, 10))
  const [expectedReturnDate, setExpectedReturnDate] = React.useState('')
  const [serviceCost, setServiceCost] = React.useState('')
  const [notes, setNotes] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setManufacturingOrderId(null)
    setContactId(null)
    setDispatchDate(new Date().toISOString().slice(0, 10))
    setExpectedReturnDate('')
    setServiceCost('')
    setNotes('')
  }, [open])

  const ordersQuery = useQuery({
    queryKey: ['production', 'orders', 'subcontract'],
    queryFn: () => api.production.orders.list({ type: 'subcontract' }),
    enabled: open,
  })
  const orders = (ordersQuery.data ?? []).filter(
    (o) => o.status !== 'cancelled' && o.status !== 'done',
  )

  const mutation = useMutation({
    mutationFn: () => {
      if (!manufacturingOrderId) throw new Error('Üretim emri (fason) seçilmelidir')
      if (!contactId) throw new Error('Fasoncu (cari) seçilmelidir')
      return api.production.subcontract.create({
        manufacturingOrderId,
        contactId,
        dispatchDate: dispatchDate || undefined,
        expectedReturnDate: expectedReturnDate || null,
        serviceCost: serviceCost ? Number(serviceCost) : undefined,
        notes: notes.trim() || null,
      })
    },
    onSuccess: (d) => {
      toast.success('Fason sevk oluşturuldu')
      void qc.invalidateQueries({ queryKey: ['production', 'subcontract'] })
      onOpenChange(false)
      onCreated(d)
    },
    onError: (e) => toast.error('Oluşturulamadı', { description: toApiError(e).message }),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Yeni Fason Sevk</DialogTitle>
          <DialogDescription>
            Fason (type=subcontract) üretim emri seçin ve fasoncuya gönderilecek malzemeyi sevk edin.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Üretim Emri (Fason)</Label>
            <EntityCombobox
              items={orders}
              value={manufacturingOrderId}
              onChange={(id) => setManufacturingOrderId(id)}
              getId={(o) => o.id}
              getLabel={(o) => `${o.orderNo} · ${o.productName}`}
              getSub={(o) => o.productCode}
              placeholder="Fason emri seç"
              searchPlaceholder="Emir ara…"
              emptyText="Uygun fason emri yok"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Fasoncu (Cari)</Label>
            <SupplierSelect value={contactId} onChange={setContactId} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sc-date">Sevk Tarihi</Label>
              <Input id="sc-date" type="date" value={dispatchDate} onChange={(e) => setDispatchDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sc-return">Beklenen Dönüş</Label>
              <Input id="sc-return" type="date" value={expectedReturnDate} onChange={(e) => setExpectedReturnDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sc-cost">İşçilik Ücreti (fason)</Label>
            <Input id="sc-cost" type="number" value={serviceCost} onChange={(e) => setServiceCost(e.target.value)} placeholder="Opsiyonel — dönüşte de girilebilir" className="text-right tabular-nums" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sc-notes">Notlar</Label>
            <Textarea id="sc-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!canManage || mutation.isPending}>
            Oluştur
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
