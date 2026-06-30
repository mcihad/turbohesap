import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  toApiError,
  type RotationDay,
  type ShiftDto,
  type ShiftRotationDto,
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

const OFF = '__off__'

interface FormState {
  name: string
  cycleLengthDays: number
  anchorDate: string
  description: string
  isActive: boolean
  days: RotationDay[]
}

function buildDays(prev: RotationDay[], length: number): RotationDay[] {
  const out: RotationDay[] = []
  for (let i = 0; i < length; i++) {
    const existing = prev.find((d) => d.dayIndex === i)
    out.push(existing ?? { dayIndex: i, shiftId: null, teamLabel: null })
  }
  return out
}

function empty(): FormState {
  return {
    name: '',
    cycleLengthDays: 7,
    anchorDate: new Date().toISOString().slice(0, 10),
    description: '',
    isActive: true,
    days: buildDays([], 7),
  }
}

function fromDto(r: ShiftRotationDto): FormState {
  return {
    name: r.name,
    cycleLengthDays: r.cycleLengthDays,
    anchorDate: r.anchorDate ? r.anchorDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
    description: r.description ?? '',
    isActive: r.isActive,
    days: buildDays(r.days ?? [], r.cycleLengthDays),
  }
}

export function RotationDialog({
  open,
  onOpenChange,
  editing,
  shifts,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: ShiftRotationDto | null
  shifts: ShiftDto[]
  onSaved: () => void
}) {
  const [form, setForm] = React.useState<FormState>(empty)

  React.useEffect(() => {
    if (!open) return
    setForm(editing ? fromDto(editing) : empty())
  }, [open, editing])

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const setLength = (raw: string) => {
    const n = Math.max(1, Math.min(60, Number(raw) || 1))
    setForm((f) => ({ ...f, cycleLengthDays: n, days: buildDays(f.days, n) }))
  }

  const setDay = (i: number, patch: Partial<RotationDay>) =>
    set(
      'days',
      form.days.map((d) => (d.dayIndex === i ? { ...d, ...patch } : d)),
    )

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name.trim(),
        cycleLengthDays: form.cycleLengthDays,
        anchorDate: form.anchorDate,
        description: form.description.trim() ? form.description.trim() : null,
        isActive: form.isActive,
        days: form.days.map((d) => ({
          dayIndex: d.dayIndex,
          shiftId: d.shiftId,
          teamLabel: d.teamLabel?.trim() ? d.teamLabel.trim() : null,
        })),
      }
      return editing
        ? api.hr.shiftRotations.update(editing.id, payload)
        : api.hr.shiftRotations.create(payload)
    },
    onSuccess: () => {
      toast.success(editing ? 'Rotasyon güncellendi' : 'Rotasyon oluşturuldu')
      onOpenChange(false)
      onSaved()
    },
    onError: (e) => toast.error('İşlem başarısız', { description: toApiError(e).message }),
  })

  const activeShifts = shifts.filter((s) => s.isActive)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? 'Rotasyonu düzenle' : 'Yeni rotasyon'}</DialogTitle>
          <DialogDescription>
            Döngü uzunluğu kadar gün için vardiya seçin. Çapa tarihi, döngünün 0. gününün
            denk geldiği tarihtir.
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[65vh] gap-4 overflow-y-auto px-1 py-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Ad</Label>
              <Input
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="2 vardiya döngüsü"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Döngü (gün)</Label>
              <Input
                type="number"
                min={1}
                value={form.cycleLengthDays}
                onChange={(e) => setLength(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Çapa tarihi</Label>
              <Input
                type="date"
                value={form.anchorDate}
                onChange={(e) => set('anchorDate', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-border p-3">
            <h4 className="text-2xs font-semibold tracking-wide text-muted-foreground uppercase">
              Döngü düzeni
            </h4>
            <div className="space-y-2">
              {form.days.map((d) => (
                <div key={d.dayIndex} className="flex items-end gap-2">
                  <span className="w-12 pb-2 text-sm font-medium text-muted-foreground">
                    {d.dayIndex + 1}. gün
                  </span>
                  <div className="flex-1 space-y-1">
                    <Label className="text-2xs">Vardiya</Label>
                    <Select
                      value={d.shiftId ?? OFF}
                      onValueChange={(v) => setDay(d.dayIndex, { shiftId: v === OFF ? null : v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={OFF}>— (İzin / OFF)</SelectItem>
                        {activeShifts.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.code ? `${s.code} · ` : ''}
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-28 space-y-1">
                    <Label className="text-2xs">Takım</Label>
                    <Input
                      value={d.teamLabel ?? ''}
                      onChange={(e) => setDay(d.dayIndex, { teamLabel: e.target.value })}
                      placeholder="A"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Açıklama</Label>
            <Textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={2}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Switch checked={form.isActive} onCheckedChange={(v) => set('isActive', v)} />
            Aktif
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !form.name.trim()}>
            {editing ? 'Kaydet' : 'Oluştur'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
