// Giriş alanı (geofence) editörü — solda OpenLayers harita (geometri), sağda
// öznitelik paneli + zaman pencereleri + serbest attributes + personel atama.
import * as React from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  HrPermissions,
  toApiError,
  type BranchDto,
  type CheckinAreaDto,
  type CheckinTimeWindow,
  type EmployeeDto,
  type GeoJsonGeometry,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { GeometryEditor } from './map/geometry-editor'

const NO_BRANCH = '__none__'
const DOW = [
  { value: 1, label: 'Pzt' },
  { value: 2, label: 'Sal' },
  { value: 3, label: 'Çar' },
  { value: 4, label: 'Per' },
  { value: 5, label: 'Cum' },
  { value: 6, label: 'Cmt' },
  { value: 7, label: 'Paz' },
]

interface AttrPair {
  key: string
  value: string
}

interface FormState {
  name: string
  code: string
  branchId: string
  geom: GeoJsonGeometry | null
  toleranceMeters: string
  minAccuracyMeters: string
  requireInside: boolean
  allowMockLocation: boolean
  isActive: boolean
  notes: string
  timeWindows: CheckinTimeWindow[]
  attributes: AttrPair[]
}

function attrsToPairs(attrs: Record<string, unknown>): AttrPair[] {
  return Object.entries(attrs ?? {}).map(([key, value]) => ({
    key,
    value: typeof value === 'string' ? value : JSON.stringify(value),
  }))
}

function empty(): FormState {
  return {
    name: '',
    code: '',
    branchId: NO_BRANCH,
    geom: null,
    toleranceMeters: '50',
    minAccuracyMeters: '50',
    requireInside: true,
    allowMockLocation: false,
    isActive: true,
    notes: '',
    timeWindows: [],
    attributes: [],
  }
}

function fromDto(a: CheckinAreaDto): FormState {
  return {
    name: a.name,
    code: a.code,
    branchId: a.branchId ?? NO_BRANCH,
    geom: a.geom,
    toleranceMeters: String(a.toleranceMeters),
    minAccuracyMeters: String(a.minAccuracyMeters),
    requireInside: a.requireInside,
    allowMockLocation: a.allowMockLocation,
    isActive: a.isActive,
    notes: a.notes ?? '',
    timeWindows: a.timeWindows ?? [],
    attributes: attrsToPairs(a.attributes),
  }
}

export function CheckinAreaDialog({
  open,
  onOpenChange,
  editing,
  branches,
  employees,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: CheckinAreaDto | null
  branches: BranchDto[]
  employees: EmployeeDto[]
  onSaved: () => void
}) {
  const { hasPermission } = useAuth()
  const canAssign = hasPermission(HrPermissions.areasAssign)

  const [form, setForm] = React.useState<FormState>(empty)
  const [assigned, setAssigned] = React.useState<string[]>([])

  // Load assigned employees when editing.
  const areaEmployeesQuery = useQuery({
    queryKey: ['hr', 'area-employees', editing?.id],
    queryFn: () => api.hr.checkinAreas.listEmployees(editing!.id),
    enabled: open && !!editing && canAssign,
  })

  React.useEffect(() => {
    if (!open) return
    setForm(editing ? fromDto(editing) : empty())
  }, [open, editing])

  React.useEffect(() => {
    setAssigned(areaEmployeesQuery.data ?? [])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaEmployeesQuery.data])

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  // ── time windows ──
  const addWindow = () =>
    set('timeWindows', [...form.timeWindows, { dow: [], from: '08:00', to: '18:00' }])
  const setWindow = (i: number, patch: Partial<CheckinTimeWindow>) =>
    set(
      'timeWindows',
      form.timeWindows.map((w, idx) => (idx === i ? { ...w, ...patch } : w)),
    )
  const removeWindow = (i: number) =>
    set(
      'timeWindows',
      form.timeWindows.filter((_, idx) => idx !== i),
    )
  const toggleDow = (i: number, d: number) => {
    const w = form.timeWindows[i]
    const cur = w.dow ?? []
    const next = cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort((a, b) => a - b)
    setWindow(i, { dow: next })
  }

  // ── attributes ──
  const addAttr = () => set('attributes', [...form.attributes, { key: '', value: '' }])
  const setAttr = (i: number, patch: Partial<AttrPair>) =>
    set(
      'attributes',
      form.attributes.map((a, idx) => (idx === i ? { ...a, ...patch } : a)),
    )
  const removeAttr = (i: number) =>
    set(
      'attributes',
      form.attributes.filter((_, idx) => idx !== i),
    )

  // ── employees ──
  const toggleEmployee = (id: string) =>
    setAssigned((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const save = useMutation({
    mutationFn: async () => {
      const attributes: Record<string, unknown> = {}
      for (const a of form.attributes) {
        if (a.key.trim()) attributes[a.key.trim()] = a.value
      }
      const payload = {
        name: form.name.trim(),
        code: form.code.trim() || undefined,
        branchId: form.branchId === NO_BRANCH ? null : form.branchId,
        geom: form.geom,
        toleranceMeters: Number(form.toleranceMeters) || 0,
        minAccuracyMeters: Number(form.minAccuracyMeters) || 0,
        requireInside: form.requireInside,
        allowMockLocation: form.allowMockLocation,
        isActive: form.isActive,
        notes: form.notes.trim() ? form.notes.trim() : null,
        timeWindows: form.timeWindows.map((w) => ({
          dow: w.dow && w.dow.length > 0 ? w.dow : undefined,
          from: w.from,
          to: w.to,
        })),
        attributes,
      }
      const saved = editing
        ? await api.hr.checkinAreas.update(editing.id, payload)
        : await api.hr.checkinAreas.create(payload)
      if (canAssign) {
        await api.hr.checkinAreas.setEmployees(saved.id, { employeeIds: assigned })
      }
      return saved
    },
    onSuccess: () => {
      toast.success(editing ? 'Giriş alanı güncellendi' : 'Giriş alanı oluşturuldu')
      onOpenChange(false)
      onSaved()
    },
    onError: (e) => toast.error('İşlem başarısız', { description: toApiError(e).message }),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{editing ? 'Giriş alanını düzenle' : 'Yeni giriş alanı'}</DialogTitle>
          <DialogDescription>
            Haritada poligon veya nokta çizin, alan ayarlarını ve personel erişimini düzenleyin.
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[70vh] gap-5 overflow-y-auto px-1 py-2 lg:grid-cols-2">
          {/* Sol: harita */}
          <div className="space-y-3">
            <GeometryEditor value={form.geom} onChange={(g) => set('geom', g)} />
          </div>

          {/* Sağ: öznitelikler */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Ad</Label>
                <Input value={form.name} onChange={(e) => set('name', e.target.value)} autoFocus />
              </div>
              <div className="space-y-1.5">
                <Label>Kod</Label>
                <Input
                  value={form.code}
                  onChange={(e) => set('code', e.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tolerans (m)</Label>
                <Input
                  type="number"
                  value={form.toleranceMeters}
                  onChange={(e) => set('toleranceMeters', e.target.value)}
                />
                <p className="text-2xs text-muted-foreground">
                  Poligonda dışa tampon / noktada yarıçap (metre).
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Min. doğruluk (m)</Label>
                <Input
                  type="number"
                  value={form.minAccuracyMeters}
                  onChange={(e) => set('minAccuracyMeters', e.target.value)}
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Şube</Label>
                <Select value={form.branchId} onValueChange={(v) => set('branchId', v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_BRANCH}>Şube yok</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.requireInside}
                  onCheckedChange={(v) => set('requireInside', v)}
                />
                Alan içinde olmalı
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.allowMockLocation}
                  onCheckedChange={(v) => set('allowMockLocation', v)}
                />
                Sahte konuma izin ver
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.isActive} onCheckedChange={(v) => set('isActive', v)} />
                Aktif
              </label>
            </div>

            {/* Zaman pencereleri */}
            <div className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <h4 className="text-2xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Zaman pencereleri
                </h4>
                <Button type="button" variant="outline" size="sm" onClick={addWindow}>
                  <Plus className="size-3.5" />
                  Ekle
                </Button>
              </div>
              {form.timeWindows.length === 0 ? (
                <p className="text-2xs text-muted-foreground">Boş = her zaman giriş yapılabilir.</p>
              ) : (
                <div className="space-y-3">
                  {form.timeWindows.map((w, i) => (
                    <div key={i} className="space-y-2 rounded-md bg-muted/40 p-2">
                      <div className="flex flex-wrap gap-1">
                        {DOW.map((d) => {
                          const active = (w.dow ?? []).includes(d.value)
                          return (
                            <button
                              key={d.value}
                              type="button"
                              onClick={() => toggleDow(i, d.value)}
                              className={`rounded px-2 py-0.5 text-2xs font-medium ${
                                active
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-background text-muted-foreground'
                              }`}
                            >
                              {d.label}
                            </button>
                          )
                        })}
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="space-y-1">
                          <Label className="text-2xs">Başl.</Label>
                          <Input
                            type="time"
                            className="w-28"
                            value={w.from}
                            onChange={(e) => setWindow(i, { from: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-2xs">Bitiş</Label>
                          <Input
                            type="time"
                            className="w-28"
                            value={w.to}
                            onChange={(e) => setWindow(i, { to: e.target.value })}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeWindow(i)}
                          aria-label="Sil"
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Serbest öznitelikler */}
            <div className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <h4 className="text-2xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Öznitelikler (opsiyonel)
                </h4>
                <Button type="button" variant="outline" size="sm" onClick={addAttr}>
                  <Plus className="size-3.5" />
                  Ekle
                </Button>
              </div>
              {form.attributes.map((a, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder="anahtar"
                    value={a.key}
                    onChange={(e) => setAttr(i, { key: e.target.value })}
                    className="font-mono"
                  />
                  <Input
                    placeholder="değer"
                    value={a.value}
                    onChange={(e) => setAttr(i, { value: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => removeAttr(i)}
                    aria-label="Sil"
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Personel atama */}
            {canAssign ? (
              <div className="space-y-2 rounded-lg border border-border p-3">
                <h4 className="text-2xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Personel ataması
                </h4>
                <p className="text-2xs text-muted-foreground">
                  Atama yoksa personel tüm aktif alanlardan giriş yapabilir.
                </p>
                <div className="max-h-40 space-y-1 overflow-y-auto">
                  {employees.map((e) => (
                    <label key={e.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={assigned.includes(e.id)}
                        onChange={() => toggleEmployee(e.id)}
                      />
                      {e.fullName}
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label>Notlar</Label>
              <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} />
            </div>
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
