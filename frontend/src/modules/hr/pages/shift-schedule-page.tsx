// Vardiya takvimi — atama kuralları (rotasyon/sabit), takvim materyalizasyonu
// (Takvim Oluştur) ve personel × gün matris görünümü. Hücreye tıklayınca o günün
// vardiyası setDay ile değiştirilebilir.
import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarPlus, Trash2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'

import {
  HrPermissions,
  toApiError,
  type EmployeeShiftAssignmentDto,
  type EmployeeShiftDayDto,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { PageWrapper } from '@/components/layout/page'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const OFF = '__off__'

function firstOfMonth(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}
function lastOfMonth(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().slice(0, 10)
}
function eachDay(from: string, to: string): string[] {
  const out: string[] = []
  const start = new Date(from + 'T00:00:00')
  const end = new Date(to + 'T00:00:00')
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return out
  for (let d = new Date(start); d <= end && out.length < 120; d.setDate(d.getDate() + 1)) {
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}
const TR_DOW = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']

export function ShiftSchedulePage() {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(HrPermissions.shiftsRead)
  const canAssign = hasPermission(HrPermissions.shiftsAssign)

  const employeesQuery = useQuery({
    queryKey: ['hr', 'employees'],
    queryFn: () => api.hr.employees.list(),
    enabled: canRead,
  })
  const rotationsQuery = useQuery({
    queryKey: ['hr', 'shift-rotations'],
    queryFn: () => api.hr.shiftRotations.list(),
    enabled: canRead,
  })
  const shiftsQuery = useQuery({
    queryKey: ['hr', 'shifts'],
    queryFn: () => api.hr.shifts.list(),
    enabled: canRead,
  })
  const assignmentsQuery = useQuery({
    queryKey: ['hr', 'shift-assignments'],
    queryFn: () => api.hr.shiftSchedule.listAssignments(),
    enabled: canRead,
  })

  const employees = employeesQuery.data ?? []
  const rotations = rotationsQuery.data ?? []
  const shifts = shiftsQuery.data ?? []
  const assignments = assignmentsQuery.data ?? []

  // ── Atama formu ─────────────────────────────────────────────────────────────
  const [aEmployee, setAEmployee] = React.useState('')
  const [aMode, setAMode] = React.useState<'rotation' | 'fixed'>('rotation')
  const [aRotation, setARotation] = React.useState('')
  const [aOffset, setAOffset] = React.useState('0')
  const [aFixedShift, setAFixedShift] = React.useState('')
  const [aFrom, setAFrom] = React.useState(firstOfMonth())
  const [aTo, setATo] = React.useState('')

  const assignMutation = useMutation({
    mutationFn: () =>
      api.hr.shiftSchedule.assign({
        employeeId: aEmployee,
        rotationId: aMode === 'rotation' ? aRotation : null,
        rotationOffset: Number(aOffset) || 0,
        fixedShiftId: aMode === 'fixed' ? aFixedShift : null,
        effectiveFrom: aFrom,
        effectiveTo: aTo.trim() ? aTo : null,
      }),
    onSuccess: () => {
      toast.success('Atama eklendi')
      setAEmployee('')
      setARotation('')
      setAFixedShift('')
      void qc.invalidateQueries({ queryKey: ['hr', 'shift-assignments'] })
    },
    onError: (e) => toast.error('Atama başarısız', { description: toApiError(e).message }),
  })

  const removeAssignment = useMutation({
    mutationFn: (id: string) => api.hr.shiftSchedule.removeAssignment(id),
    onSuccess: () => {
      toast.success('Atama silindi')
      void qc.invalidateQueries({ queryKey: ['hr', 'shift-assignments'] })
    },
    onError: (e) => toast.error('Silme başarısız', { description: toApiError(e).message }),
  })

  // ── Takvim oluşturma ────────────────────────────────────────────────────────
  const [gFrom, setGFrom] = React.useState(firstOfMonth())
  const [gTo, setGTo] = React.useState(lastOfMonth())
  const [gPublish, setGPublish] = React.useState(true)
  const [gOverwrite, setGOverwrite] = React.useState(false)

  const generateMutation = useMutation({
    mutationFn: () =>
      api.hr.shiftSchedule.generate({
        from: gFrom,
        to: gTo,
        publish: gPublish,
        overwriteManual: gOverwrite,
      }),
    onSuccess: (res) => {
      toast.success('Takvim oluşturuldu', {
        description: `${res.created} eklendi · ${res.updated} güncellendi · ${res.skipped} atlandı`,
      })
      void qc.invalidateQueries({ queryKey: ['hr', 'shift-days'] })
    },
    onError: (e) => toast.error('Oluşturulamadı', { description: toApiError(e).message }),
  })

  // ── Takvim görünümü ─────────────────────────────────────────────────────────
  const [vFrom, setVFrom] = React.useState(firstOfMonth())
  const [vTo, setVTo] = React.useState(lastOfMonth())
  const [vEmployee, setVEmployee] = React.useState('')

  const daysQuery = useQuery({
    queryKey: ['hr', 'shift-days', vFrom, vTo, vEmployee],
    queryFn: () =>
      api.hr.shiftSchedule.listDays({
        from: vFrom,
        to: vTo,
        employeeId: vEmployee || undefined,
      }),
    enabled: canRead,
  })

  const dayList = React.useMemo(() => eachDay(vFrom, vTo), [vFrom, vTo])
  const days = daysQuery.data ?? []

  // index: employeeId -> workDate -> day
  const byEmpDate = React.useMemo(() => {
    const map = new Map<string, Map<string, EmployeeShiftDayDto>>()
    for (const d of days) {
      if (!map.has(d.employeeId)) map.set(d.employeeId, new Map())
      map.get(d.employeeId)!.set(d.workDate.slice(0, 10), d)
    }
    return map
  }, [days])

  // employees shown: those with materialized days (or the filtered one)
  const rowEmployees = React.useMemo(() => {
    if (vEmployee) return employees.filter((e) => e.id === vEmployee)
    const ids = new Set(days.map((d) => d.employeeId))
    return employees.filter((e) => ids.has(e.id))
  }, [employees, days, vEmployee])

  const setDayMutation = useMutation({
    mutationFn: (vars: { employeeId: string; workDate: string; shiftId: string | null }) =>
      api.hr.shiftSchedule.setDay(vars),
    onSuccess: () => {
      toast.success('Gün güncellendi')
      void qc.invalidateQueries({ queryKey: ['hr', 'shift-days'] })
    },
    onError: (e) => toast.error('Güncellenemedi', { description: toApiError(e).message }),
  })

  return (
    <PermissionRequired permission={HrPermissions.shiftsRead}>
      <PageWrapper className="space-y-6">
        {canAssign ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Atama paneli */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <UserPlus className="size-4" />
                  Personel ataması
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Personel</Label>
                  <Select value={aEmployee} onValueChange={setAEmployee}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Personel seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.fullName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Tür</Label>
                    <Select value={aMode} onValueChange={(v) => setAMode(v as 'rotation' | 'fixed')}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rotation">Rotasyon</SelectItem>
                        <SelectItem value="fixed">Sabit vardiya</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {aMode === 'rotation' ? (
                    <div className="space-y-1.5">
                      <Label>Çapa ofseti</Label>
                      <Input
                        type="number"
                        value={aOffset}
                        onChange={(e) => setAOffset(e.target.value)}
                      />
                    </div>
                  ) : null}
                </div>
                {aMode === 'rotation' ? (
                  <div className="space-y-1.5">
                    <Label>Rotasyon</Label>
                    <Select value={aRotation} onValueChange={setARotation}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Rotasyon seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {rotations.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label>Sabit vardiya</Label>
                    <Select value={aFixedShift} onValueChange={setAFixedShift}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Vardiya seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {shifts.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.code ? `${s.code} · ` : ''}
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Başlangıç</Label>
                    <Input type="date" value={aFrom} onChange={(e) => setAFrom(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Bitiş (ops.)</Label>
                    <Input type="date" value={aTo} onChange={(e) => setATo(e.target.value)} />
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => assignMutation.mutate()}
                  disabled={
                    assignMutation.isPending ||
                    !aEmployee ||
                    (aMode === 'rotation' ? !aRotation : !aFixedShift)
                  }
                >
                  <UserPlus />
                  Ata
                </Button>
              </CardContent>
            </Card>

            {/* Takvim oluştur */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <CalendarPlus className="size-4" />
                  Takvim oluştur
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Atama kurallarını seçilen tarih aralığında günlük takvime materyalize eder.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Başlangıç</Label>
                    <Input type="date" value={gFrom} onChange={(e) => setGFrom(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Bitiş</Label>
                    <Input type="date" value={gTo} onChange={(e) => setGTo(e.target.value)} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={gPublish}
                      onChange={(e) => setGPublish(e.target.checked)}
                    />
                    Yayınla
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={gOverwrite}
                      onChange={(e) => setGOverwrite(e.target.checked)}
                    />
                    Elle değişiklikleri ez
                  </label>
                </div>
                <Button
                  className="w-full"
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending}
                >
                  <CalendarPlus />
                  Takvim Oluştur
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Atamalar listesi */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Atamalar</CardTitle>
          </CardHeader>
          <CardContent>
            {assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Atama yok.</p>
            ) : (
              <div className="divide-y divide-border">
                {assignments.map((a: EmployeeShiftAssignmentDto) => (
                  <div key={a.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{a.employeeName}</div>
                      <div className="text-xs text-muted-foreground">
                        {a.rotationName
                          ? `${a.rotationName} (ofset ${a.rotationOffset})`
                          : a.fixedShift
                            ? `Sabit: ${a.fixedShift.name}`
                            : '—'}
                        {' · '}
                        {a.effectiveFrom.slice(0, 10)} → {a.effectiveTo?.slice(0, 10) ?? 'süresiz'}
                      </div>
                    </div>
                    {canAssign ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          if (confirm('Atama silinsin mi?')) removeAssignment.mutate(a.id)
                        }}
                        aria-label="Sil"
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Takvim matrisi */}
        <Card>
          <CardHeader className="gap-3">
            <CardTitle className="text-sm">Takvim</CardTitle>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Başlangıç</Label>
                <Input type="date" value={vFrom} onChange={(e) => setVFrom(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Bitiş</Label>
                <Input type="date" value={vTo} onChange={(e) => setVTo(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Personel (ops.)</Label>
                <Select value={vEmployee || OFF} onValueChange={(v) => setVEmployee(v === OFF ? '' : v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Tümü" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={OFF}>Tümü</SelectItem>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {daysQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Yükleniyor…</p>
            ) : rowEmployees.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Bu aralıkta takvim yok. Önce "Takvim Oluştur" çalıştırın.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-max">
                  {/* header */}
                  <div className="flex border-b border-border">
                    <div className="sticky left-0 z-10 w-40 shrink-0 bg-card px-2 py-1.5 text-2xs font-semibold uppercase text-muted-foreground">
                      Personel
                    </div>
                    {dayList.map((d) => {
                      const dt = new Date(d + 'T00:00:00')
                      const weekend = dt.getDay() === 0 || dt.getDay() === 6
                      return (
                        <div
                          key={d}
                          className={`w-12 shrink-0 px-1 py-1 text-center text-2xs ${
                            weekend ? 'text-destructive' : 'text-muted-foreground'
                          }`}
                        >
                          <div className="font-semibold">{dt.getDate()}</div>
                          <div>{TR_DOW[dt.getDay()]}</div>
                        </div>
                      )
                    })}
                  </div>
                  {/* rows */}
                  {rowEmployees.map((emp) => (
                    <div key={emp.id} className="flex border-b border-border/60">
                      <div className="sticky left-0 z-10 flex w-40 shrink-0 items-center bg-card px-2 py-1 text-xs font-medium">
                        <span className="truncate">{emp.fullName}</span>
                      </div>
                      {dayList.map((d) => {
                        const day = byEmpDate.get(emp.id)?.get(d)
                        return (
                          <ScheduleCell
                            key={d}
                            employeeId={emp.id}
                            workDate={d}
                            day={day}
                            canAssign={canAssign}
                            shifts={shifts}
                            onSet={(shiftId) =>
                              setDayMutation.mutate({ employeeId: emp.id, workDate: d, shiftId })
                            }
                          />
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </PageWrapper>
    </PermissionRequired>
  )
}

function ScheduleCell({
  employeeId: _employeeId,
  workDate: _workDate,
  day,
  canAssign,
  shifts,
  onSet,
}: {
  employeeId: string
  workDate: string
  day: EmployeeShiftDayDto | undefined
  canAssign: boolean
  shifts: { id: string; name: string; code: string; color: string }[]
  onSet: (shiftId: string | null) => void
}) {
  const [open, setOpen] = React.useState(false)
  const shift = day?.shift
  const cell = (
    <div
      className="flex h-9 w-12 shrink-0 items-center justify-center border-l border-border/40 text-2xs font-medium"
      style={shift ? { background: shift.color, color: '#fff' } : undefined}
      title={shift ? shift.name : day ? 'İzin (OFF)' : ''}
    >
      {shift ? shift.code || shift.name.slice(0, 3) : day ? '—' : ''}
    </div>
  )

  if (!canAssign) return cell

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="cursor-pointer outline-none">
          {cell}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="start">
        <Label className="text-2xs">Vardiya değiştir</Label>
        <Select
          value={shift?.id ?? OFF}
          onValueChange={(v) => {
            onSet(v === OFF ? null : v)
            setOpen(false)
          }}
        >
          <SelectTrigger className="mt-1.5 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={OFF}>— (İzin / OFF)</SelectItem>
            {shifts.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.code ? `${s.code} · ` : ''}
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PopoverContent>
    </Popover>
  )
}
