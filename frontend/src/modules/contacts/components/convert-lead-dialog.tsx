import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  ContactsPermissions,
  toApiError,
  type ContactDto,
  type ContactRole,
  type ConvertLeadRequest,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const TARGET_ROLES: { value: ContactRole; label: string }[] = [
  { value: 'customer', label: 'Müşteri' },
  { value: 'supplier', label: 'Tedarikçi' },
  { value: 'both', label: 'Müşteri + Tedarikçi' },
]

/** Convert a lead (aday) into a customer/supplier, optionally spawning a deal. */
export function ConvertLeadDialog({
  open,
  onOpenChange,
  contact,
  onConverted,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  contact: ContactDto | null
  onConverted?: (converted: ContactDto) => void
}) {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()

  const [toRole, setToRole] = React.useState<ContactRole>('customer')
  const [createOpportunity, setCreateOpportunity] = React.useState(false)
  const [oppName, setOppName] = React.useState('')
  const [pipelineId, setPipelineId] = React.useState<string>('')
  const [stageId, setStageId] = React.useState<string>('')
  const [amount, setAmount] = React.useState('')
  const [expectedCloseDate, setExpectedCloseDate] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setToRole('customer')
    setCreateOpportunity(false)
    setOppName(contact ? `${contact.name} fırsatı` : '')
    setPipelineId('')
    setStageId('')
    setAmount('')
    setExpectedCloseDate('')
  }, [open, contact])

  const pipelinesQuery = useQuery({
    queryKey: ['contacts', 'pipelines'],
    queryFn: () => api.contacts.pipelines.list(),
    enabled: open && createOpportunity && hasPermission(ContactsPermissions.pipelinesRead),
  })
  const pipelines = pipelinesQuery.data ?? []
  const stages = pipelines.find((p) => p.id === pipelineId)?.stages ?? []

  const convert = useMutation({
    mutationFn: () => {
      if (!contact) throw new Error('Cari seçilmedi')
      const input: ConvertLeadRequest = { toRole }
      if (createOpportunity) {
        input.createOpportunity = true
        input.opportunity = {
          name: oppName.trim() || `${contact.name} fırsatı`,
          pipelineId: pipelineId || undefined,
          stageId: stageId || undefined,
          amount: amount ? Number(amount) || undefined : undefined,
          expectedCloseDate: expectedCloseDate || null,
        }
      }
      return api.contacts.contacts.convert(contact.id, input)
    },
    onSuccess: (converted) => {
      toast.success('Aday dönüştürüldü')
      void qc.invalidateQueries({ queryKey: ['contacts', 'contacts'] })
      void qc.invalidateQueries({ queryKey: ['contacts', 'opportunities'] })
      onOpenChange(false)
      onConverted?.(converted)
    },
    onError: (e) => toast.error('Dönüştürme başarısız', { description: toApiError(e).message }),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Adayı dönüştür</DialogTitle>
          <DialogDescription>
            {contact ? `"${contact.name}" adayını müşteri/tedarikçiye dönüştürün.` : null}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label>Hedef rol</Label>
            <Select value={toRole} onValueChange={(v) => setToRole(v as ContactRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TARGET_ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={createOpportunity}
              onCheckedChange={(v) => setCreateOpportunity(v === true)}
            />
            Fırsat da oluştur
          </label>

          {createOpportunity ? (
            <div className="grid gap-4 rounded-lg border p-3">
              <div className="space-y-1.5">
                <Label>Fırsat adı</Label>
                <Input value={oppName} onChange={(e) => setOppName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Pipeline</Label>
                  <Select
                    value={pipelineId}
                    onValueChange={(v) => { setPipelineId(v); setStageId('') }}
                  >
                    <SelectTrigger><SelectValue placeholder="Varsayılan" /></SelectTrigger>
                    <SelectContent>
                      {pipelines.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Aşama</Label>
                  <Select value={stageId} onValueChange={setStageId} disabled={!pipelineId}>
                    <SelectTrigger><SelectValue placeholder="İlk aşama" /></SelectTrigger>
                    <SelectContent>
                      {stages.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Tutar</Label>
                  <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Tahmini kapanış</Label>
                  <Input type="date" value={expectedCloseDate} onChange={(e) => setExpectedCloseDate(e.target.value)} />
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
          <Button onClick={() => convert.mutate()} disabled={convert.isPending || !contact}>
            Dönüştür
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
