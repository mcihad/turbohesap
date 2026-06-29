import * as React from 'react'
import { View } from 'react-native'
import { HrPermissions } from '@turbohesap/shared'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  FormSelect,
  Input,
  PermissionRequired,
  Screen,
  Section,
  type SelectOption,
  SkeletonRows,
  Text,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { MONTH_LABELS } from './format'

interface DayDraft {
  workedDays: string
  paidLeaveDays: string
  absentDays: string
  overtimeHours: string
}

const now = new Date()
const YEAR_OPTIONS: SelectOption<string>[] = [now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(
  (y) => ({ value: String(y), label: String(y) }),
)
const MONTH_OPTIONS: SelectOption<string>[] = MONTH_LABELS.map((m, i) => ({ value: String(i + 1), label: m }))

function payrollDays(d: DayDraft): number {
  return Math.min(30, (Number(d.workedDays) || 0) + (Number(d.paidLeaveDays) || 0))
}

export function TimesheetScreen() {
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(HrPermissions.read)
  const canWrite = hasPermission(HrPermissions.write)

  const [year, setYear] = React.useState(String(now.getFullYear()))
  const [month, setMonth] = React.useState(String(now.getMonth() + 1))

  const y = Number(year)
  const m = Number(month)

  const employees = useAsync(() => api.hr.employees.list({ isActive: true }), [], { enabled: canRead })
  const timesheets = useAsync(() => api.hr.timesheets.list({ year: y, month: m }), [y, m], { enabled: canRead })

  const [drafts, setDrafts] = React.useState<Record<string, DayDraft>>({})

  // Seed editable drafts whenever the period's data (re)loads.
  React.useEffect(() => {
    if (!employees.data) return
    const byEmp = new Map((timesheets.data ?? []).map((ts) => [ts.employeeId, ts]))
    const next: Record<string, DayDraft> = {}
    for (const e of employees.data) {
      const ts = byEmp.get(e.id)
      next[e.id] = {
        workedDays: String(ts?.workedDays ?? 30),
        paidLeaveDays: String(ts?.paidLeaveDays ?? 0),
        absentDays: String(ts?.absentDays ?? 0),
        overtimeHours: String(ts?.overtimeHours ?? 0),
      }
    }
    setDrafts(next)
  }, [employees.data, timesheets.data])

  const refresh = () => {
    employees.refetch()
    timesheets.refetch()
  }

  return (
    <PermissionRequired
      permission={HrPermissions.read}
      title="Puantaj"
      onBack={nav.canGoBack ? nav.goBack : undefined}
    >
      <Screen
        header={{ title: 'Puantaj', large: !nav.canGoBack, onBack: nav.canGoBack ? nav.goBack : undefined }}
        onRefresh={refresh}
        refreshing={employees.refreshing || timesheets.refreshing}
      >
        <Card>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <FormSelect label="Yıl" value={year} options={YEAR_OPTIONS} onChange={setYear} />
            </View>
            <View style={{ flex: 1.4 }}>
              <FormSelect label="Ay" value={month} options={MONTH_OPTIONS} onChange={setMonth} />
            </View>
          </View>
        </Card>

        {employees.loading || timesheets.loading ? (
          <SkeletonRows count={5} />
        ) : employees.error ? (
          <EmptyState
            icon="alert-triangle"
            tone="destructive"
            title="Yüklenemedi"
            description={employees.error}
            actionLabel="Tekrar dene"
            onAction={refresh}
          />
        ) : (employees.data ?? []).length === 0 ? (
          <EmptyState icon="users" title="Aktif personel yok" description="Puantaj girmek için önce personel ekleyin." />
        ) : (
          <Section title={`${MONTH_LABELS[m - 1]} ${y}`}>
            <View style={{ gap: 12 }}>
              {(employees.data ?? []).map((e) => (
                <EmployeeTimesheetCard
                  key={e.id}
                  name={e.fullName}
                  draft={drafts[e.id] ?? { workedDays: '30', paidLeaveDays: '0', absentDays: '0', overtimeHours: '0' }}
                  canWrite={canWrite}
                  onChange={(patch) => setDrafts((d) => ({ ...d, [e.id]: { ...d[e.id], ...patch } }))}
                  onSave={(submit, draft) =>
                    submit(async () => {
                      await api.hr.timesheets.upsert({
                        employeeId: e.id,
                        year: y,
                        month: m,
                        workedDays: Number(draft.workedDays) || 0,
                        paidLeaveDays: Number(draft.paidLeaveDays) || 0,
                        absentDays: Number(draft.absentDays) || 0,
                        overtimeHours: Number(draft.overtimeHours) || 0,
                      })
                      timesheets.refetch()
                    })
                  }
                />
              ))}
            </View>
          </Section>
        )}
      </Screen>
    </PermissionRequired>
  )
}

function EmployeeTimesheetCard({
  name,
  draft,
  canWrite,
  onChange,
  onSave,
}: {
  name: string
  draft: DayDraft
  canWrite: boolean
  onChange: (patch: Partial<DayDraft>) => void
  onSave: (submit: ReturnType<typeof useSubmit>['submit'], draft: DayDraft) => void
}) {
  const t = useTheme()
  const { submit, busy } = useSubmit()
  return (
    <Card>
      <View style={{ gap: t.spacing[3] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text variant="label" weight="semibold">
            {name}
          </Text>
          <Badge label={`Bordro ${payrollDays(draft)} gün`} tone="primary" />
        </View>
        <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
          <View style={{ flex: 1 }}>
            <Input label="Çalışılan" keyboardType="numeric" editable={canWrite} value={draft.workedDays} onChangeText={(v) => onChange({ workedDays: v })} />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="Ücretli İzin" keyboardType="numeric" editable={canWrite} value={draft.paidLeaveDays} onChangeText={(v) => onChange({ paidLeaveDays: v })} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
          <View style={{ flex: 1 }}>
            <Input label="Devamsız" keyboardType="numeric" editable={canWrite} value={draft.absentDays} onChangeText={(v) => onChange({ absentDays: v })} />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="Mesai (saat)" keyboardType="numeric" editable={canWrite} value={draft.overtimeHours} onChangeText={(v) => onChange({ overtimeHours: v })} />
          </View>
        </View>
        {canWrite ? (
          <Button title="Kaydet" icon="check" size="sm" fullWidth loading={busy} onPress={() => onSave(submit, draft)} />
        ) : null}
      </View>
    </Card>
  )
}
