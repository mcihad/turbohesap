import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  ASSET_VEHICLE_LOG_KIND_LABELS,
  toApiError,
  type AssetVehicleLogDto,
  type AssetVehicleLogKind,
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { LookupSelect } from '@/components/lookup-select'
import { EmployeeSelect } from './asset-pickers'

const KINDS = Object.keys(ASSET_VEHICLE_LOG_KIND_LABELS) as AssetVehicleLogKind[]

interface FormState {
  kind: AssetVehicleLogKind
  date: string
  odometer: string
  liters: string
  unitPrice: string
  totalCost: string
  currency: string
  fuelTypeKey: string | null
  isFull: boolean
  station: string
  driverEmployeeId: string | null
  notes: string
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function emptyForm(): FormState {
  return {
    kind: 'yakit',
    date: todayIso(),
    odometer: '',
    liters: '',
    unitPrice: '',
    totalCost: '',
    currency: 'TRY',
    fuelTypeKey: null,
    isFull: true,
    station: '',
    driverEmployeeId: null,
    notes: '',
  }
}

function fromDto(l: AssetVehicleLogDto): FormState {
  return {
    kind: l.kind,
    date: l.date ? l.date.slice(0, 10) : todayIso(),
    odometer: String(l.odometer),
    liters: l.liters == null ? '' : String(l.liters),
    unitPrice: l.unitPrice == null ? '' : String(l.unitPrice),
    totalCost: l.totalCost == null ? '' : String(l.totalCost),
    currency: l.currency || 'TRY',
    fuelTypeKey: l.fuelTypeKey,
    isFull: l.isFull,
    station: l.station ?? '',
    driverEmployeeId: l.driverEmployeeId,
    notes: l.notes ?? '',
  }
}

/** Create/edit a vehicle usage log (yakıt/km) for a vehicle asset. */
export function VehicleLogDialog({
  open,
  onOpenChange,
  assetId,
  editing,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  assetId: string
  editing: AssetVehicleLogDto | null
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
  const isFuel = form.kind === 'yakit'

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        kind: form.kind,
        date: form.date,
        odometer: Number(form.odometer) || 0,
        liters: isFuel ? num(form.liters) : null,
        unitPrice: isFuel ? num(form.unitPrice) : null,
        totalCost: isFuel ? num(form.totalCost) : null,
        currency: form.currency || 'TRY',
        fuelTypeKey: isFuel ? form.fuelTypeKey : null,
        isFull: isFuel ? form.isFull : false,
        station: form.station.trim() || null,
        driverEmployeeId: form.driverEmployeeId,
        notes: form.notes.trim() || null,
      }
      return editing
        ? api.inventory.assetVehicleLogs.update(editing.id, payload)
        : api.inventory.assetVehicleLogs.create({ assetId, ...payload })
    },
    onSuccess: () => {
      toast.success(editing ? 'Kayıt güncellendi' : 'Kayıt eklendi')
      onOpenChange(false)
      onSaved()
    },
    onError: (e) => toast.error('İşlem başarısız', { description: toApiError(e).message }),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Kaydı düzenle' : 'Kayıt ekle'}</DialogTitle>
          <DialogDescription>Araç için yakıt veya kilometre kaydı girin.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-1">
          <Field label="Tür">
            <Select value={form.kind} onValueChange={(v) => set('kind', v as AssetVehicleLogKind)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {KINDS.map((k) => (
                  <SelectItem key={k} value={k}>{ASSET_VEHICLE_LOG_KIND_LABELS[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Tarih">
            <Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
          </Field>
          <Field label="Kilometre">
            <Input type="number" value={form.odometer} onChange={(e) => set('odometer', e.target.value)} />
          </Field>
          {isFuel ? (
            <>
              <Field label="Litre">
                <Input type="number" inputMode="decimal" value={form.liters} onChange={(e) => set('liters', e.target.value)} />
              </Field>
              <Field label="Birim fiyat">
                <Input type="number" inputMode="decimal" value={form.unitPrice} onChange={(e) => set('unitPrice', e.target.value)} />
              </Field>
              <Field label="Toplam tutar">
                <Input type="number" inputMode="decimal" value={form.totalCost} onChange={(e) => set('totalCost', e.target.value)} />
              </Field>
              <Field label="Para birimi">
                <Input value={form.currency} onChange={(e) => set('currency', e.target.value)} className="uppercase" />
              </Field>
              <Field label="Yakıt türü">
                <LookupSelect list="fuel_type" value={form.fuelTypeKey} onChange={(v) => set('fuelTypeKey', v)} />
              </Field>
              <Field label="İstasyon">
                <Input value={form.station} onChange={(e) => set('station', e.target.value)} />
              </Field>
            </>
          ) : null}
          <Field label="Sürücü (personel)" className="col-span-2">
            <EmployeeSelect value={form.driverEmployeeId} onChange={(v) => set('driverEmployeeId', v)} allowNone />
          </Field>
          <Field label="Not" className="col-span-2">
            <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} />
          </Field>
        </div>
        {isFuel ? (
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={form.isFull} onCheckedChange={(v) => set('isFull', v)} />
            Depo full doldu
          </label>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !form.odometer.trim()}>
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
