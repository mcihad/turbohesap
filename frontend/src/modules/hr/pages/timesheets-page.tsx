import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Save } from 'lucide-react'
import { toast } from 'sonner'

import { HrPermissions, toApiError, type TimesheetDto } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { PageHeader, PageWrapper } from '@/components/layout/page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MONTH_LABELS } from '../format'

const now = new Date()
const YEARS = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i)

interface RowState {
  workedDays: string
  weekendDays: string
  holidayDays: string
  overtimeHours: string
  absentDays: string
  paidLeaveDays: string
  unpaidLeaveDays: string
}

function rowFrom(ts?: TimesheetDto): RowState {
  return {
    workedDays: String(ts?.workedDays ?? 30),
    weekendDays: String(ts?.weekendDays ?? 0),
    holidayDays: String(ts?.holidayDays ?? 0),
    overtimeHours: String(ts?.overtimeHours ?? 0),
    absentDays: String(ts?.absentDays ?? 0),
    paidLeaveDays: String(ts?.paidLeaveDays ?? 0),
    unpaidLeaveDays: String(ts?.unpaidLeaveDays ?? 0),
  }
}

export function TimesheetsPage() {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(HrPermissions.read)
  const canWrite = hasPermission(HrPermissions.write)

  const [year, setYear] = React.useState(now.getFullYear())
  const [month, setMonth] = React.useState(now.getMonth() + 1)
  const [edits, setEdits] = React.useState<Record<string, RowState>>({})

  const employeesQuery = useQuery({
    queryKey: ['hr', 'employees', 'list'],
    queryFn: () => api.hr.employees.list(),
    enabled: canRead,
  })
  const timesheetsQuery = useQuery({
    queryKey: ['hr', 'timesheets', year, month],
    queryFn: () => api.hr.timesheets.list({ year, month }),
    enabled: canRead,
  })

  // Seed edit state whenever the period data (re)loads.
  const employees = React.useMemo(
    () => (employeesQuery.data ?? []).filter((e) => e.isActive),
    [employeesQuery.data],
  )
  const timesheets = timesheetsQuery.data ?? []

  React.useEffect(() => {
    const map: Record<string, RowState> = {}
    for (const emp of employees) {
      const ts = timesheets.find((t) => t.employeeId === emp.id)
      map[emp.id] = rowFrom(ts)
    }
    setEdits(map)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeesQuery.data, timesheetsQuery.data])

  const setField = (employeeId: string, field: keyof RowState, value: string) =>
    setEdits((m) => ({ ...m, [employeeId]: { ...m[employeeId], [field]: value } }))

  const upsert = useMutation({
    mutationFn: (employeeId: string) => {
      const r = edits[employeeId]
      return api.hr.timesheets.upsert({
        employeeId,
        year,
        month,
        workedDays: Number(r.workedDays) || 0,
        weekendDays: Number(r.weekendDays) || 0,
        holidayDays: Number(r.holidayDays) || 0,
        overtimeHours: Number(r.overtimeHours) || 0,
        absentDays: Number(r.absentDays) || 0,
        paidLeaveDays: Number(r.paidLeaveDays) || 0,
        unpaidLeaveDays: Number(r.unpaidLeaveDays) || 0,
      })
    },
    onSuccess: () => {
      toast.success('Puantaj kaydedildi')
      void qc.invalidateQueries({ queryKey: ['hr', 'timesheets', year, month] })
    },
    onError: (e) => toast.error('Kaydedilemedi', { description: toApiError(e).message }),
  })

  const payrollDaysPreview = (employeeId: string) => {
    const r = edits[employeeId]
    if (!r) return 0
    return Math.min((Number(r.workedDays) || 0) + (Number(r.paidLeaveDays) || 0), 30)
  }

  const loading = employeesQuery.isLoading || timesheetsQuery.isLoading

  return (
    <PermissionRequired permission={HrPermissions.read}>
      <PageWrapper>
        <PageHeader
          title="Puantaj"
          description="Aylık çalışma günleri — bordro gün esası"
          actions={
            <div className="flex items-center gap-2">
              <div>
                <Label className="sr-only">Yıl</Label>
                <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="sr-only">Ay</Label>
                <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_LABELS.map((label, i) => (
                      <SelectItem key={i} value={String(i + 1)}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          }
        />

        <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
          <table className="w-full min-w-[1000px] border-collapse text-sm">
            <thead>
              <tr className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 text-left font-medium">Personel</th>
                <th className="w-24 px-2 py-2 text-right font-medium">Çalışılan</th>
                <th className="w-24 px-2 py-2 text-right font-medium">H.Tatili</th>
                <th className="w-24 px-2 py-2 text-right font-medium">R.Tatil</th>
                <th className="w-24 px-2 py-2 text-right font-medium">Ücretli İzin</th>
                <th className="w-24 px-2 py-2 text-right font-medium">Ücretsiz İzin</th>
                <th className="w-24 px-2 py-2 text-right font-medium">Devamsız</th>
                <th className="w-24 px-2 py-2 text-right font-medium">F.Mesai (saat)</th>
                <th className="w-24 px-2 py-2 text-right font-medium">Bordro Günü</th>
                <th className="w-20 px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-muted-foreground">
                    Yükleniyor…
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-muted-foreground">
                    Aktif personel yok.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => {
                  const r = edits[emp.id]
                  if (!r) return null
                  return (
                    <tr key={emp.id} className="border-b align-middle last:border-0 hover:bg-accent/20">
                      <td className="px-3 py-2 font-medium">{emp.fullName}</td>
                      <NumCell value={r.workedDays} onChange={(v) => setField(emp.id, 'workedDays', v)} disabled={!canWrite} />
                      <NumCell value={r.weekendDays} onChange={(v) => setField(emp.id, 'weekendDays', v)} disabled={!canWrite} />
                      <NumCell value={r.holidayDays} onChange={(v) => setField(emp.id, 'holidayDays', v)} disabled={!canWrite} />
                      <NumCell value={r.paidLeaveDays} onChange={(v) => setField(emp.id, 'paidLeaveDays', v)} disabled={!canWrite} />
                      <NumCell value={r.unpaidLeaveDays} onChange={(v) => setField(emp.id, 'unpaidLeaveDays', v)} disabled={!canWrite} />
                      <NumCell value={r.absentDays} onChange={(v) => setField(emp.id, 'absentDays', v)} disabled={!canWrite} />
                      <NumCell value={r.overtimeHours} onChange={(v) => setField(emp.id, 'overtimeHours', v)} disabled={!canWrite} />
                      <td className="px-2 py-2 text-right font-semibold tabular-nums">{payrollDaysPreview(emp.id)}</td>
                      <td className="px-2 py-2 text-right">
                        {canWrite ? (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Kaydet"
                            disabled={upsert.isPending}
                            onClick={() => upsert.mutate(emp.id)}
                          >
                            <Save className="size-4" />
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </PageWrapper>
    </PermissionRequired>
  )
}

function NumCell({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  return (
    <td className="px-2 py-2">
      <Input
        type="number"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 text-right tabular-nums"
      />
    </td>
  )
}
