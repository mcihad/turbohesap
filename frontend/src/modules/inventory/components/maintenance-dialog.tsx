import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  ASSET_MAINTENANCE_STATUS_LABELS,
  ASSET_MAINTENANCE_TYPE_LABELS,
  toApiError,
  type AssetMaintenanceDto,
  type AssetMaintenanceStatus,
  type AssetMaintenanceType,
} from '@turbohesap/shared'

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ContactSelect } from './asset-pickers'

const TYPES = Object.keys(ASSET_MAINTENANCE_TYPE_LABELS) as AssetMaintenanceType[]
const STATUSES = Object.keys(ASSET_MAINTENANCE_STATUS_LABELS) as AssetMaintenanceStatus[]

interface FormState {
  type: AssetMaintenanceType
  status: AssetMaintenanceStatus
  date: string
  cost: string
  currency: string
  vendorContactId: string | null
  odometer: string
  description: string
  nextDueDate: string
  nextDueOdometer: string
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function emptyForm(): FormState {
  return {
    type: 'bakim',
    status: 'planlandi',
    date: todayIso(),
    cost: '',
    currency: 'TRY',
    vendorContactId: null,
    odometer: '',
    description: '',
    nextDueDate: '',
    nextDueOdometer: '',
  }
}

function fromDto(m: AssetMaintenanceDto): FormState {
  return {
    type: m.type,
    status: m.status,
    date: m.date ? m.date.slice(0, 10) : todayIso(),
    cost: m.cost ? String(m.cost) : '',
    currency: m.currency || 'TRY',
    vendorContactId: m.vendorContactId,
    odometer: m.odometer == null ? '' : String(m.odometer),
    description: m.description ?? '',
    nextDueDate: m.nextDueDate ? m.nextDueDate.slice(0, 10) : '',
    nextDueOdometer: m.nextDueOdometer == null ? '' : String(m.nextDueOdometer),
  }
}

/** Create/edit a maintenance/repair record for an asset. */
export function MaintenanceDialog({
  open,
  onOpenChange,
  assetId,
  editing,
  isVehicle,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  assetId: string
  editing: AssetMaintenanceDto | null
  isVehicle: boolean
  onSaved: () => void
}) {
  const [form, setForm] = React.useState<FormState>(emptyForm)
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  React.useEffect(() => {
    if (!open) return
    setForm(editing ? fromDto(editing) : emptyForm())
  }, [open, editing])

  const num = (s: string) => (s.trim() === '' ? null : Number(s))

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        type: form.type,
        status: form.status,
        date: form.date,
        cost: num(form.cost) ?? 0,
        currency: form.currency || 'TRY',
        vendorContactId: form.vendorContactId,
        odometer: num(form.odometer),
        description: form.description.trim() || null,
        nextDueDate: form.nextDueDate.trim() || null,
        nextDueOdometer: num(form.nextDueOdometer),
      }
      return editing
        ? api.inventory.assetMaintenance.update(editing.id, payload)
        : api.inventory.assetMaintenance.create({ assetId, ...payload })
    },
    onSuccess: () => {
      toast.success(editing ? 'Bakım kaydı güncellendi' : 'Bakım kaydı eklendi')
      onOpenChange(false)
      onSaved()
    },
    onError: (e) => toast.error('İşlem başarısız', { description: toApiError(e).message }),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Bakım kaydını düzenle' : 'Bakım ekle'}</DialogTitle>
          <DialogDescription>Bakım/onarım işlemini ve maliyetini kaydedin.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-1">
          <Field label="Tür">
            <Select value={form.type} onValueChange={(v) => set('type', v as AssetMaintenanceType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{ASSET_MAINTENANCE_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Durum">
            <Select value={form.status} onValueChange={(v) => set('status', v as AssetMaintenanceStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{ASSET_MAINTENANCE_STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Tarih">
            <Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
          </Field>
          <Field label="Maliyet">
            <Input type="number" inputMode="decimal" value={form.cost} onChange={(e) => set('cost', e.target.value)} />
          </Field>
          <Field label="Para birimi">
            <Input value={form.currency} onChange={(e) => set('currency', e.target.value)} className="uppercase" />
          </Field>
          {isVehicle ? (
            <Field label="Kilometre">
              <Input type="number" value={form.odometer} onChange={(e) => set('odometer', e.target.value)} />
            </Field>
          ) : null}
          <Field label="Servis (cari)" className="col-span-2">
            <ContactSelect value={form.vendorContactId} onChange={(v) => set('vendorContactId', v)} />
          </Field>
          <Field label="Açıklama" className="col-span-2">
            <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} />
          </Field>
          <Field label="Sonraki bakım tarihi">
            <Input type="date" value={form.nextDueDate} onChange={(e) => set('nextDueDate', e.target.value)} />
          </Field>
          {isVehicle ? (
            <Field label="Sonraki bakım km">
              <Input type="number" value={form.nextDueOdometer} onChange={(e) => set('nextDueOdometer', e.target.value)} />
            </Field>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {editing ? 'Kaydet' : 'Ekle'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      <Label>{label}</Label>
      {children}
    </div>
  )
}
