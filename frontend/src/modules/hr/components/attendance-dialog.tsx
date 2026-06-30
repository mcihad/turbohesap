import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  ATTENDANCE_DIRECTION_LABELS,
  ATTENDANCE_METHOD_LABELS,
  toApiError,
  type AttendanceDirection,
  type AttendanceMethod,
  type CheckinAreaDto,
  type EmployeeDto,
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

const NO_AREA = '__none__'
const DIRECTIONS: AttendanceDirection[] = ['in', 'out', 'unknown']
const METHODS: AttendanceMethod[] = ['manual', 'web', 'card', 'mobile_gps']

function nowLocal(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`
}

export function AttendanceDialog({
  open,
  onOpenChange,
  employees,
  areas,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  employees: EmployeeDto[]
  areas: CheckinAreaDto[]
  onSaved: () => void
}) {
  const [employeeId, setEmployeeId] = React.useState('')
  const [eventTime, setEventTime] = React.useState(nowLocal())
  const [direction, setDirection] = React.useState<AttendanceDirection>('in')
  const [method, setMethod] = React.useState<AttendanceMethod>('manual')
  const [areaId, setAreaId] = React.useState(NO_AREA)
  const [lat, setLat] = React.useState('')
  const [lng, setLng] = React.useState('')
  const [notes, setNotes] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setEmployeeId('')
    setEventTime(nowLocal())
    setDirection('in')
    setMethod('manual')
    setAreaId(NO_AREA)
    setLat('')
    setLng('')
    setNotes('')
  }, [open])

  const save = useMutation({
    mutationFn: () =>
      api.hr.attendance.create({
        employeeId,
        eventTime: new Date(eventTime).toISOString(),
        direction,
        method,
        areaId: areaId === NO_AREA ? null : areaId,
        lat: lat.trim() ? Number(lat) : null,
        lng: lng.trim() ? Number(lng) : null,
        notes: notes.trim() ? notes.trim() : null,
      }),
    onSuccess: () => {
      toast.success('Kayıt eklendi')
      onOpenChange(false)
      onSaved()
    },
    onError: (e) => toast.error('İşlem başarısız', { description: toApiError(e).message }),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Elle giriş/çıkış kaydı</DialogTitle>
          <DialogDescription>Personel için manuel bir giriş/çıkış kaydı ekleyin.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label>Personel</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
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
              <Label>Zaman</Label>
              <Input
                type="datetime-local"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Yön</Label>
              <Select value={direction} onValueChange={(v) => setDirection(v as AttendanceDirection)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIRECTIONS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {ATTENDANCE_DIRECTION_LABELS[d]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Yöntem</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as AttendanceMethod)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {ATTENDANCE_METHOD_LABELS[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Alan (ops.)</Label>
              <Select value={areaId} onValueChange={setAreaId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_AREA}>—</SelectItem>
                  {areas.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Enlem (ops.)</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Boylam (ops.)</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notlar</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !employeeId}>
            Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
