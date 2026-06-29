import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { toApiError } from '@turbohesap/shared'

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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EntityCombobox } from '@/modules/invoices/components/entity-combobox'

// Inclusive day count between two ISO dates (start..end).
function dayCount(start: string, end: string): number {
  if (!start || !end) return 0
  const a = new Date(start).getTime()
  const b = new Date(end).getTime()
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0
  return Math.floor((b - a) / 86_400_000) + 1
}

export function LeaveRequestDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const qc = useQueryClient()
  const [employeeId, setEmployeeId] = React.useState<string | null>(null)
  const [leaveTypeId, setLeaveTypeId] = React.useState<string>('')
  const [startDate, setStartDate] = React.useState('')
  const [endDate, setEndDate] = React.useState('')
  const [reason, setReason] = React.useState('')

  const employeesQuery = useQuery({
    queryKey: ['hr', 'employees', 'list'],
    queryFn: () => api.hr.employees.list(),
    enabled: open,
  })
  const typesQuery = useQuery({
    queryKey: ['hr', 'leave-types'],
    queryFn: () => api.hr.leaveTypes.list(),
    enabled: open,
  })

  React.useEffect(() => {
    if (!open) {
      setEmployeeId(null)
      setLeaveTypeId('')
      setStartDate('')
      setEndDate('')
      setReason('')
    }
  }, [open])

  const days = dayCount(startDate, endDate)
  const employees = employeesQuery.data ?? []
  const types = (typesQuery.data ?? []).filter((t) => t.isActive)

  const save = useMutation({
    mutationFn: async () => {
      if (!employeeId) throw new Error('Personel seçilmelidir')
      if (!leaveTypeId) throw new Error('İzin türü seçilmelidir')
      if (days <= 0) throw new Error('Geçerli bir tarih aralığı girilmelidir')
      return api.hr.leaveRequests.create({
        employeeId,
        leaveTypeId,
        startDate,
        endDate,
        days,
        reason: reason.trim() || null,
      })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['hr'] })
      toast.success('İzin talebi oluşturuldu')
      onOpenChange(false)
    },
    onError: (e) => toast.error('Oluşturulamadı', { description: toApiError(e).message }),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Yeni İzin Talebi</DialogTitle>
          <DialogDescription>Personel için bir izin talebi oluşturun.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">Personel</Label>
            <EntityCombobox
              items={employees}
              value={employeeId}
              onChange={(id) => setEmployeeId(id)}
              getId={(e) => e.id}
              getLabel={(e) => e.fullName}
              getSub={(e) => e.positionKey ?? undefined}
              placeholder="Personel seçin"
              searchPlaceholder="Personel ara…"
              emptyText="Personel bulunamadı"
            />
          </div>

          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">İzin Türü</Label>
            <Select value={leaveTypeId} onValueChange={setLeaveTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="İzin türü seçin" />
              </SelectTrigger>
              <SelectContent>
                {types.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">Başlangıç</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">Bitiş</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Toplam <span className="font-semibold text-foreground">{days}</span> gün
          </p>

          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">Açıklama</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button disabled={save.isPending} onClick={() => save.mutate()}>
            Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
