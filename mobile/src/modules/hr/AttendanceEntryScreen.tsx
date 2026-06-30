// Elle giriş/çıkış kaydı — manual attendance entry (admin). Mirrors the web
// attendance-dialog. Gated behind attendanceManage.
import * as React from 'react'
import { View } from 'react-native'
import {
  ATTENDANCE_DIRECTION_LABELS,
  ATTENDANCE_METHOD_LABELS,
  HrPermissions,
  type AttendanceDirection,
  type AttendanceMethod,
  type CreateAttendanceRequest,
} from '@turbohesap/shared'
import {
  Button,
  Card,
  EmptyState,
  FormDatePicker,
  FormSelect,
  FormTextArea,
  Screen,
  Section,
  type SelectOption,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'

const DIRECTION_OPTIONS: SelectOption<AttendanceDirection>[] = (['in', 'out', 'unknown'] as AttendanceDirection[]).map(
  (d) => ({ value: d, label: ATTENDANCE_DIRECTION_LABELS[d] }),
)
const METHOD_OPTIONS: SelectOption<AttendanceMethod>[] = (['manual', 'web', 'card', 'mobile_gps'] as AttendanceMethod[]).map(
  (m) => ({ value: m, label: ATTENDANCE_METHOD_LABELS[m] }),
)

export function AttendanceEntryScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canManage = hasPermission(HrPermissions.attendanceManage)
  const canRead = hasPermission(HrPermissions.attendanceRead)
  const { submit, busy } = useSubmit()

  const employeesQuery = useAsync(() => api.hr.employees.list(), [], { enabled: canRead })
  const employeeOptions: SelectOption<string>[] = React.useMemo(
    () => (employeesQuery.data ?? []).map((e) => ({ value: e.id, label: e.fullName })),
    [employeesQuery.data],
  )

  const [employeeId, setEmployeeId] = React.useState('')
  const [eventTime, setEventTime] = React.useState(() => new Date().toISOString())
  const [direction, setDirection] = React.useState<AttendanceDirection>('in')
  const [method, setMethod] = React.useState<AttendanceMethod>('manual')
  const [notes, setNotes] = React.useState('')

  const save = () => {
    if (!employeeId) {
      alert('Personel seçin')
      return
    }
    submit(async () => {
      const payload: CreateAttendanceRequest = {
        employeeId,
        eventTime,
        direction,
        method,
        notes: notes.trim() || null,
      }
      await api.hr.attendance.create(payload)
      nav.goBack()
    })
  }

  if (!canManage) {
    return (
      <Screen header={{ title: 'Elle kayıt', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Elle kayıt ekleme yetkiniz yok." />
      </Screen>
    )
  }

  return (
    <Screen
      header={{ title: 'Elle kayıt', onBack: nav.goBack }}
      footer={<Button title="Kaydet" icon="check" fullWidth loading={busy} onPress={save} />}
    >
      <Section title="Giriş/Çıkış">
        <Card>
          <View style={{ gap: t.spacing[4] }}>
            <FormSelect label="Personel" value={employeeId} options={employeeOptions} onChange={setEmployeeId} />
            <FormDatePicker label="Zaman" value={eventTime} onChange={setEventTime} mode="datetime" />
            <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
              <View style={{ flex: 1 }}>
                <FormSelect label="Yön" value={direction} options={DIRECTION_OPTIONS} onChange={setDirection} />
              </View>
              <View style={{ flex: 1 }}>
                <FormSelect label="Yöntem" value={method} options={METHOD_OPTIONS} onChange={setMethod} />
              </View>
            </View>
            <FormTextArea label="Notlar" value={notes} onChangeText={setNotes} />
          </View>
        </Card>
      </Section>
    </Screen>
  )
}
