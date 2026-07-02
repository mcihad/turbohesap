import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  ProductionPermissions,
  toApiError,
  type CreateWorkCenterRequest,
  type WorkCenterDto,
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { BranchSelect } from './pickers'

export function WorkCenterDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: WorkCenterDto | null
  onSaved: () => void
}) {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canWrite = hasPermission(ProductionPermissions.write)

  const [name, setName] = React.useState('')
  const [code, setCode] = React.useState('')
  const [branchId, setBranchId] = React.useState('')
  const [costPerHour, setCostPerHour] = React.useState('0')
  const [setupCostPerHour, setSetupCostPerHour] = React.useState('')
  const [capacityPerHour, setCapacityPerHour] = React.useState('')
  const [parallelCapacity, setParallelCapacity] = React.useState('1')
  const [efficiencyRate, setEfficiencyRate] = React.useState('1')
  const [setupTimeMinutes, setSetupTimeMinutes] = React.useState('0')
  const [cleanupTimeMinutes, setCleanupTimeMinutes] = React.useState('0')
  const [isActive, setIsActive] = React.useState(true)
  const [notes, setNotes] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setName(editing?.name ?? '')
    setCode(editing?.code ?? '')
    setBranchId(editing?.branchId ?? '')
    setCostPerHour(String(editing?.costPerHour ?? 0))
    setSetupCostPerHour(editing?.setupCostPerHour == null ? '' : String(editing.setupCostPerHour))
    setCapacityPerHour(editing?.capacityPerHour == null ? '' : String(editing.capacityPerHour))
    setParallelCapacity(String(editing?.parallelCapacity ?? 1))
    setEfficiencyRate(String(editing?.efficiencyRate ?? 1))
    setSetupTimeMinutes(String(editing?.setupTimeMinutes ?? 0))
    setCleanupTimeMinutes(String(editing?.cleanupTimeMinutes ?? 0))
    setIsActive(editing?.isActive ?? true)
    setNotes(editing?.notes ?? '')
  }, [open, editing])

  const mutation = useMutation({
    mutationFn: (input: CreateWorkCenterRequest) =>
      editing
        ? api.production.workCenters.update(editing.id, input)
        : api.production.workCenters.create(input),
    onSuccess: () => {
      toast.success(editing ? 'İş merkezi güncellendi' : 'İş merkezi oluşturuldu')
      void qc.invalidateQueries({ queryKey: ['production', 'work-centers'] })
      onOpenChange(false)
      onSaved()
    },
    onError: (e) => toast.error('Kaydedilemedi', { description: toApiError(e).message }),
  })

  const num = (v: string): number | undefined => (v.trim() === '' ? undefined : Number(v))

  const submit = () => {
    if (!name.trim()) {
      toast.error('Ad zorunludur')
      return
    }
    mutation.mutate({
      name: name.trim(),
      code: code.trim() || undefined,
      branchId: branchId || null,
      costPerHour: num(costPerHour) ?? 0,
      setupCostPerHour: num(setupCostPerHour) ?? null,
      capacityPerHour: num(capacityPerHour) ?? null,
      parallelCapacity: num(parallelCapacity) ?? 1,
      efficiencyRate: num(efficiencyRate) ?? 1,
      setupTimeMinutes: num(setupTimeMinutes) ?? 0,
      cleanupTimeMinutes: num(cleanupTimeMinutes) ?? 0,
      isActive,
      notes: notes.trim() || null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'İş Merkezini Düzenle' : 'Yeni İş Merkezi'}</DialogTitle>
          <DialogDescription>
            Kapasite ve saat ücreti — operasyon süresi × saat ücreti = operasyon maliyeti.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="wc-name">Ad</Label>
            <Input id="wc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn. CNC Tezgah 1" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wc-code">Kod</Label>
            <Input id="wc-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Oto" />
          </div>
          <div className="space-y-1.5">
            <Label>Şube</Label>
            <BranchSelect value={branchId} onChange={setBranchId} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wc-cost">Saat Ücreti (₺/sa)</Label>
            <Input id="wc-cost" type="number" value={costPerHour} onChange={(e) => setCostPerHour(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wc-setupcost">Hazırlık Ücreti (₺/sa)</Label>
            <Input id="wc-setupcost" type="number" value={setupCostPerHour} onChange={(e) => setSetupCostPerHour(e.target.value)} placeholder="Opsiyonel" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wc-cap">Kapasite (adet/sa)</Label>
            <Input id="wc-cap" type="number" value={capacityPerHour} onChange={(e) => setCapacityPerHour(e.target.value)} placeholder="Opsiyonel" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wc-parallel">Paralel Kapasite</Label>
            <Input id="wc-parallel" type="number" value={parallelCapacity} onChange={(e) => setParallelCapacity(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wc-eff">Verimlilik (0-1)</Label>
            <Input id="wc-eff" type="number" step="0.05" value={efficiencyRate} onChange={(e) => setEfficiencyRate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wc-setup">Hazırlık Süresi (dk)</Label>
            <Input id="wc-setup" type="number" value={setupTimeMinutes} onChange={(e) => setSetupTimeMinutes(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wc-cleanup">Temizlik Süresi (dk)</Label>
            <Input id="wc-cleanup" type="number" value={cleanupTimeMinutes} onChange={(e) => setCleanupTimeMinutes(e.target.value)} />
          </div>
          <div className="col-span-2 flex items-center justify-between rounded-md border px-3 py-2">
            <Label htmlFor="wc-active">Aktif</Label>
            <Switch id="wc-active" checked={isActive} onCheckedChange={setIsActive} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="wc-notes">Notlar</Label>
            <Textarea id="wc-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button onClick={submit} disabled={!canWrite || mutation.isPending}>
            Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
