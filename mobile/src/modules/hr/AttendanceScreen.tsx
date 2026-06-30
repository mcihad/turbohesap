// Giriş/çıkış kayıtları (attendance) — filterable list of raw PDKS records from
// all sources. Header "+" opens the manual entry form. Mirrors the web
// attendance-page.
import * as React from 'react'
import { View } from 'react-native'
import {
  ATTENDANCE_DIRECTION_LABELS,
  ATTENDANCE_METHOD_LABELS,
  ATTENDANCE_STATUS_LABELS,
  HrPermissions,
  type AttendanceDirection,
  type AttendanceListQuery,
  type AttendanceMethod,
  type AttendanceStatus,
} from '@turbohesap/shared'
import {
  Badge,
  Card,
  EmptyState,
  FormDatePicker,
  FormSelect,
  FormSwitchRow,
  HeaderAction,
  ListCard,
  ListRow,
  PermissionRequired,
  Screen,
  Section,
  SkeletonRows,
  Text,
  type BadgeTone,
  type SelectOption,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'

const ALL = '__all__'

function statusTone(s: AttendanceStatus): BadgeTone {
  if (s === 'valid') return 'success'
  if (s === 'rejected') return 'destructive'
  return 'warning'
}
function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })
}
function ymd(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const DIRECTION_OPTIONS: SelectOption<string>[] = [
  { value: ALL, label: 'Tümü' },
  ...(['in', 'out', 'unknown'] as AttendanceDirection[]).map((d) => ({ value: d, label: ATTENDANCE_DIRECTION_LABELS[d] })),
]
const METHOD_OPTIONS: SelectOption<string>[] = [
  { value: ALL, label: 'Tümü' },
  ...(['mobile_gps', 'card', 'web', 'manual'] as AttendanceMethod[]).map((m) => ({ value: m, label: ATTENDANCE_METHOD_LABELS[m] })),
]
const STATUS_OPTIONS: SelectOption<string>[] = [
  { value: ALL, label: 'Tümü' },
  ...(['valid', 'flagged', 'rejected'] as AttendanceStatus[]).map((s) => ({ value: s, label: ATTENDANCE_STATUS_LABELS[s] })),
]

export function AttendanceScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(HrPermissions.attendanceRead)
  const canManage = hasPermission(HrPermissions.attendanceManage)

  const [employeeId, setEmployeeId] = React.useState(ALL)
  const [direction, setDirection] = React.useState(ALL)
  const [method, setMethod] = React.useState(ALL)
  const [status, setStatus] = React.useState(ALL)
  const [useRange, setUseRange] = React.useState(false)
  const [from, setFrom] = React.useState(() => new Date().toISOString())
  const [to, setTo] = React.useState(() => new Date().toISOString())

  const employeesQuery = useAsync(() => api.hr.employees.list(), [], { enabled: canRead })
  const employees = employeesQuery.data ?? []
  const employeeOptions: SelectOption<string>[] = React.useMemo(
    () => [{ value: ALL, label: 'Tümü' }, ...employees.map((e) => ({ value: e.id, label: e.fullName }))],
    [employees],
  )

  const query: AttendanceListQuery = React.useMemo(
    () => ({
      employeeId: employeeId === ALL ? undefined : employeeId,
      direction: direction === ALL ? undefined : (direction as AttendanceDirection),
      method: method === ALL ? undefined : (method as AttendanceMethod),
      status: status === ALL ? undefined : (status as AttendanceStatus),
      from: useRange ? ymd(from) : undefined,
      to: useRange ? ymd(to) : undefined,
    }),
    [employeeId, direction, method, status, useRange, from, to],
  )

  const records = useAsync(() => api.hr.attendance.list(query), [query], { enabled: canRead })
  const list = records.data ?? []

  return (
    <PermissionRequired
      permission={HrPermissions.attendanceRead}
      title="Giriş/Çıkış"
      onBack={nav.canGoBack ? nav.goBack : undefined}
    >
      <Screen
        header={{
          title: 'Giriş/Çıkış',
          large: !nav.canGoBack,
          onBack: nav.canGoBack ? nav.goBack : undefined,
          right: canManage ? (
            <HeaderAction icon="plus" onPress={() => nav.navigate('hr.attendance.entry', {}, 'Elle kayıt')} />
          ) : undefined,
        }}
        onRefresh={records.refetch}
        refreshing={records.refreshing}
      >
        <Section title="Filtreler">
          <Card>
            <View style={{ gap: t.spacing[4] }}>
              <FormSelect label="Personel" value={employeeId} options={employeeOptions} onChange={setEmployeeId} />
              <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
                <View style={{ flex: 1 }}>
                  <FormSelect label="Yön" value={direction} options={DIRECTION_OPTIONS} onChange={setDirection} />
                </View>
                <View style={{ flex: 1 }}>
                  <FormSelect label="Yöntem" value={method} options={METHOD_OPTIONS} onChange={setMethod} />
                </View>
              </View>
              <FormSelect label="Durum" value={status} options={STATUS_OPTIONS} onChange={setStatus} />
              <FormSwitchRow label="Tarih aralığı" value={useRange} onValueChange={setUseRange} />
              {useRange ? (
                <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
                  <View style={{ flex: 1 }}>
                    <FormDatePicker label="Başlangıç" value={from} onChange={setFrom} mode="date" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <FormDatePicker label="Bitiş" value={to} onChange={setTo} mode="date" />
                  </View>
                </View>
              ) : null}
            </View>
          </Card>
        </Section>

        {records.loading ? (
          <SkeletonRows count={6} />
        ) : records.error ? (
          <EmptyState
            icon="alert-triangle"
            tone="destructive"
            title="Yüklenemedi"
            description={records.error}
            actionLabel="Tekrar dene"
            onAction={records.refetch}
          />
        ) : list.length === 0 ? (
          <EmptyState icon="clock" title="Kayıt yok" description="Seçilen filtrelerle eşleşen giriş/çıkış kaydı yok." />
        ) : (
          <>
            <Text variant="overline" tone="muted" style={{ paddingHorizontal: t.spacing[1] }}>
              {list.length} Kayıt
            </Text>
            <ListCard>
              {list.map((r) => (
                <ListRow
                  key={r.id}
                  icon={r.direction === 'in' ? 'log-in' : r.direction === 'out' ? 'log-out' : 'help-circle'}
                  iconTone={r.direction === 'in' ? 'primary' : 'muted'}
                  title={r.employeeName ?? '—'}
                  subtitle={[
                    ATTENDANCE_DIRECTION_LABELS[r.direction],
                    ATTENDANCE_METHOD_LABELS[r.method],
                    r.area?.name,
                    r.distanceMeters == null ? undefined : `${Math.round(r.distanceMeters)} m`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  trailing={
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text variant="caption" tone="muted">
                        {fmtDateTime(r.eventTime)}
                      </Text>
                      <Badge label={ATTENDANCE_STATUS_LABELS[r.status]} tone={statusTone(r.status)} />
                    </View>
                  }
                  chevron={false}
                />
              ))}
            </ListCard>
          </>
        )}
      </Screen>
    </PermissionRequired>
  )
}
