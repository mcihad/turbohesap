import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  toApiError,
  type BranchDto,
  type ShiftBreak,
  type ShiftDto,
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

const NO_BRANCH = '__none__'

interface FormState {
  name: string
  code: string
  startTime: string
  endTime: string
  crossesMidnight: boolean
  expectedMinutes: string
  lateGraceMin: string
  earlyLeaveGraceMin: string
  earlyInClampMin: string
  color: string
  isDayOff: boolean
  branchId: string
  isActive: boolean
  notes: string
  breaks: ShiftBreak[]
}

function empty(): FormState {
  return {
    name: '',
    code: '',
    startTime: '09:00',
    endTime: '18:00',
    crossesMidnight: false,
    expectedMinutes: '480',
    lateGraceMin: '15',
    earlyLeaveGraceMin: '15',
    earlyInClampMin: '0',
    color: '#2563eb',
    isDayOff: false,
    branchId: NO_BRANCH,
    isActive: true,
    notes: '',
    breaks: [],
  }
}

function fromDto(s: ShiftDto): FormState {
  return {
    name: s.name,
    code: s.code,
    startTime: s.startTime,
    endTime: s.endTime,
    crossesMidnight: s.crossesMidnight,
    expectedMinutes: String(s.expectedMinutes),
    lateGraceMin: String(s.lateGraceMin),
    earlyLeaveGraceMin: String(s.earlyLeaveGraceMin),
    earlyInClampMin: String(s.earlyInClampMin),
    color: s.color || '#2563eb',
    isDayOff: s.isDayOff,
    branchId: s.branchId ?? NO_BRANCH,
    isActive: s.isActive,
    notes: s.notes ?? '',
    breaks: s.breaks ?? [],
  }
}

export function ShiftDialog({
  open,
  onOpenChange,
  editing,
  branches,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: ShiftDto | null
  branches: BranchDto[]
  onSaved: () => void
}) {
  const [form, setForm] = React.useState<FormState>(empty)

  React.useEffect(() => {
    if (!open) return
    setForm(editing ? fromDto(editing) : empty())
  }, [open, editing])

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const num = (s: string, d = 0) => {
    const n = Number(s)
    return Number.isFinite(n) ? n : d
  }

  const addBreak = () =>
    set('breaks', [
      ...form.breaks,
      { startOffsetMin: 240, durationMin: 60, paid: false, label: 'Yemek' },
    ])
  const setBreak = (i: number, patch: Partial<ShiftBreak>) =>
    set(
      'breaks',
      form.breaks.map((b, idx) => (idx === i ? { ...b, ...patch } : b)),
    )
  const removeBreak = (i: number) =>
    set(
      'breaks',
      form.breaks.filter((_, idx) => idx !== i),
    )

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim() || undefined,
        startTime: form.startTime,
        endTime: form.endTime,
        crossesMidnight: form.crossesMidnight,
        expectedMinutes: num(form.expectedMinutes, 480),
        lateGraceMin: num(form.lateGraceMin),
        earlyLeaveGraceMin: num(form.earlyLeaveGraceMin),
        earlyInClampMin: num(form.earlyInClampMin),
        color: form.color,
        isDayOff: form.isDayOff,
        branchId: form.branchId === NO_BRANCH ? null : form.branchId,
        isActive: form.isActive,
        notes: form.notes.trim() ? form.notes.trim() : null,
        breaks: form.breaks,
      }
      return editing
        ? api.hr.shifts.update(editing.id, payload)
        : api.hr.shifts.create(payload)
    },
    onSuccess: () => {
      toast.success(editing ? 'Vardiya güncellendi' : 'Vardiya oluşturuldu')
      onOpenChange(false)
      onSaved()
    },
    onError: (e) => toast.error('İşlem başarısız', { description: toApiError(e).message }),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? 'Vardiyayı düzenle' : 'Yeni vardiya'}</DialogTitle>
          <DialogDescription>
            Vardiya saatleri, toleranslar ve mola düzenini tanımlayın.
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[65vh] gap-4 overflow-y-auto px-1 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Ad</Label>
              <Input
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Gündüz"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Kod</Label>
              <Input
                value={form.code}
                onChange={(e) => set('code', e.target.value)}
                placeholder="G1"
                className="font-mono"
              />
            </div>
          </div>

          {!form.isDayOff ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Başlangıç</Label>
                <Input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => set('startTime', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Bitiş</Label>
                <Input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => set('endTime', e.target.value)}
                />
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={form.isDayOff}
                onCheckedChange={(v) => set('isDayOff', v)}
              />
              İzin günü (OFF)
            </label>
            {!form.isDayOff ? (
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.crossesMidnight}
                  onCheckedChange={(v) => set('crossesMidnight', v)}
                />
                Gece vardiyası (gün aşar)
              </label>
            ) : null}
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.isActive} onCheckedChange={(v) => set('isActive', v)} />
              Aktif
            </label>
          </div>

          {!form.isDayOff ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="space-y-1.5">
                <Label>Beklenen dk</Label>
                <Input
                  type="number"
                  value={form.expectedMinutes}
                  onChange={(e) => set('expectedMinutes', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Geç tol. (dk)</Label>
                <Input
                  type="number"
                  value={form.lateGraceMin}
                  onChange={(e) => set('lateGraceMin', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Erken çıkış (dk)</Label>
                <Input
                  type="number"
                  value={form.earlyLeaveGraceMin}
                  onChange={(e) => set('earlyLeaveGraceMin', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Erken giriş kırpma</Label>
                <Input
                  type="number"
                  value={form.earlyInClampMin}
                  onChange={(e) => set('earlyInClampMin', e.target.value)}
                />
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Renk</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => set('color', e.target.value)}
                  className="size-9 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
                  aria-label="Renk"
                />
                <Input
                  value={form.color}
                  onChange={(e) => set('color', e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Şube</Label>
              <Select value={form.branchId} onValueChange={(v) => set('branchId', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_BRANCH}>Tüm şubeler</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!form.isDayOff ? (
            <div className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <h4 className="text-2xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Molalar
                </h4>
                <Button type="button" variant="outline" size="sm" onClick={addBreak}>
                  <Plus className="size-3.5" />
                  Mola ekle
                </Button>
              </div>
              {form.breaks.length === 0 ? (
                <p className="text-xs text-muted-foreground">Mola tanımlı değil.</p>
              ) : (
                <div className="space-y-2">
                  {form.breaks.map((b, i) => (
                    <div key={i} className="flex flex-wrap items-end gap-2">
                      <div className="space-y-1">
                        <Label className="text-2xs">Başl. (dk)</Label>
                        <Input
                          type="number"
                          className="w-24"
                          value={b.startOffsetMin}
                          onChange={(e) =>
                            setBreak(i, { startOffsetMin: Number(e.target.value) || 0 })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-2xs">Süre (dk)</Label>
                        <Input
                          type="number"
                          className="w-24"
                          value={b.durationMin}
                          onChange={(e) =>
                            setBreak(i, { durationMin: Number(e.target.value) || 0 })
                          }
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <Label className="text-2xs">Etiket</Label>
                        <Input
                          value={b.label}
                          onChange={(e) => setBreak(i, { label: e.target.value })}
                          placeholder="Yemek"
                        />
                      </div>
                      <label className="flex h-9 items-center gap-1.5 text-xs">
                        <Switch
                          checked={b.paid}
                          onCheckedChange={(v) => setBreak(i, { paid: v })}
                        />
                        Ücretli
                      </label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeBreak(i)}
                        aria-label="Mola sil"
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label>Notlar</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={2}
            />
          </div>
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
