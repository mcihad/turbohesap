// Vardiya takvimi — atama kuralları (rotasyon/sabit), takvim materyalizasyonu
// (Takvim Oluştur) ve personel × gün listesi. Bir güne dokununca o günün
// vardiyası setDay ile değiştirilebilir. Mirrors the web shift-schedule-page.
import * as React from 'react'
import { Pressable, View } from 'react-native'
import {
  HrPermissions,
  type GenerateScheduleResult,
} from '@turbohesap/shared'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  FormDatePicker,
  FormSelect,
  FormSwitchRow,
  Icon,
  Input,
  PermissionRequired,
  Screen,
  SegmentedControl,
  Section,
  SkeletonRows,
  Text,
  type SelectOption,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { confirmDestructive, useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'

const OFF = '__off__'

function ymd(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
function plusDaysISO(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString()
}
function dayLabel(workDate: string): string {
  const d = new Date(workDate.slice(0, 10) + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return workDate.slice(0, 10)
  return d.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'short' })
}

export function ShiftScheduleScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(HrPermissions.shiftsRead)
  const canAssign = hasPermission(HrPermissions.shiftsAssign)

  const employeesQuery = useAsync(() => api.hr.employees.list(), [], { enabled: canRead })
  const rotationsQuery = useAsync(() => api.hr.shiftRotations.list(), [], { enabled: canRead })
  const shiftsQuery = useAsync(() => api.hr.shifts.list(), [], { enabled: canRead })
  const assignmentsQuery = useAsync(() => api.hr.shiftSchedule.listAssignments(), [], { enabled: canRead })

  const employees = employeesQuery.data ?? []
  const rotations = rotationsQuery.data ?? []
  const shifts = shiftsQuery.data ?? []
  const assignments = assignmentsQuery.data ?? []

  const employeeOptions: SelectOption<string>[] = React.useMemo(
    () => employees.map((e) => ({ value: e.id, label: e.fullName })),
    [employees],
  )
  const rotationOptions: SelectOption<string>[] = React.useMemo(
    () => rotations.map((r) => ({ value: r.id, label: r.name })),
    [rotations],
  )
  const fixedShiftOptions: SelectOption<string>[] = React.useMemo(
    () => shifts.map((s) => ({ value: s.id, label: s.code ? `${s.code} · ${s.name}` : s.name })),
    [shifts],
  )
  const dayShiftOptions: SelectOption<string>[] = React.useMemo(
    () => [
      { value: OFF, label: 'İzin / OFF (—)' },
      ...shifts.map((s) => ({ value: s.id, label: s.code ? `${s.code} · ${s.name}` : s.name })),
    ],
    [shifts],
  )

  // ── Atama formu ─────────────────────────────────────────────────────────────
  const [aEmployee, setAEmployee] = React.useState('')
  const [aMode, setAMode] = React.useState<'rotation' | 'fixed'>('rotation')
  const [aRotation, setARotation] = React.useState('')
  const [aOffset, setAOffset] = React.useState('0')
  const [aFixedShift, setAFixedShift] = React.useState('')
  const [aFrom, setAFrom] = React.useState(() => new Date().toISOString())
  const [aHasTo, setAHasTo] = React.useState(false)
  const [aTo, setATo] = React.useState(() => plusDaysISO(30))
  const assignSubmit = useSubmit()

  const doAssign = () => {
    if (!aEmployee || (aMode === 'rotation' ? !aRotation : !aFixedShift)) {
      alert('Personel ve rotasyon/vardiya seçin')
      return
    }
    assignSubmit.submit(async () => {
      await api.hr.shiftSchedule.assign({
        employeeId: aEmployee,
        rotationId: aMode === 'rotation' ? aRotation : null,
        rotationOffset: Number(aOffset) || 0,
        fixedShiftId: aMode === 'fixed' ? aFixedShift : null,
        effectiveFrom: ymd(aFrom),
        effectiveTo: aHasTo ? ymd(aTo) : null,
      })
      setAEmployee('')
      setARotation('')
      setAFixedShift('')
      assignmentsQuery.refetch()
    })
  }

  const removeSubmit = useSubmit()
  const removeAssignment = (id: string) =>
    confirmDestructive('Atama sil', 'Bu atama silinsin mi?', () =>
      removeSubmit.submit(async () => {
        await api.hr.shiftSchedule.removeAssignment(id)
        assignmentsQuery.refetch()
      }),
    )

  // ── Takvim oluşturma ────────────────────────────────────────────────────────
  const [gFrom, setGFrom] = React.useState(() => new Date().toISOString())
  const [gTo, setGTo] = React.useState(() => plusDaysISO(30))
  const [gPublish, setGPublish] = React.useState(true)
  const [gOverwrite, setGOverwrite] = React.useState(false)
  const [gResult, setGResult] = React.useState<GenerateScheduleResult | null>(null)
  const generateSubmit = useSubmit()

  const doGenerate = () =>
    generateSubmit.submit(async () => {
      const res = await api.hr.shiftSchedule.generate({
        from: ymd(gFrom),
        to: ymd(gTo),
        publish: gPublish,
        overwriteManual: gOverwrite,
      })
      setGResult(res)
      daysQuery.refetch()
    })

  // ── Takvim görünümü ─────────────────────────────────────────────────────────
  const [vEmployee, setVEmployee] = React.useState('')
  const [vFrom, setVFrom] = React.useState(() => new Date().toISOString())
  const [vTo, setVTo] = React.useState(() => plusDaysISO(13))

  const daysQuery = useAsync(
    () =>
      api.hr.shiftSchedule.listDays({
        employeeId: vEmployee || undefined,
        from: ymd(vFrom),
        to: ymd(vTo),
      }),
    [vEmployee, vFrom, vTo],
    { enabled: canRead && !!vEmployee },
  )
  const days = React.useMemo(
    () => [...(daysQuery.data ?? [])].sort((a, b) => a.workDate.localeCompare(b.workDate)),
    [daysQuery.data],
  )

  const setDaySubmit = useSubmit()
  const setDay = (workDate: string, shiftId: string | null) =>
    setDaySubmit.submit(async () => {
      await api.hr.shiftSchedule.setDay({ employeeId: vEmployee, workDate: ymd(workDate), shiftId })
      daysQuery.refetch()
    })

  const refresh = () => {
    employeesQuery.refetch()
    rotationsQuery.refetch()
    shiftsQuery.refetch()
    assignmentsQuery.refetch()
    if (vEmployee) daysQuery.refetch()
  }

  return (
    <PermissionRequired
      permission={HrPermissions.shiftsRead}
      title="Vardiya Takvimi"
      onBack={nav.canGoBack ? nav.goBack : undefined}
    >
      <Screen
        header={{ title: 'Vardiya Takvimi', large: !nav.canGoBack, onBack: nav.canGoBack ? nav.goBack : undefined }}
        onRefresh={refresh}
        refreshing={assignmentsQuery.refreshing}
      >
        {canAssign ? (
          <Section title="Personel ataması">
            <Card>
              <View style={{ gap: t.spacing[4] }}>
                <FormSelect label="Personel" value={aEmployee} options={employeeOptions} onChange={setAEmployee} />
                <SegmentedControl
                  options={[
                    { value: 'rotation', label: 'Rotasyon' },
                    { value: 'fixed', label: 'Sabit vardiya' },
                  ]}
                  value={aMode}
                  onChange={setAMode}
                />
                {aMode === 'rotation' ? (
                  <>
                    <FormSelect label="Rotasyon" value={aRotation} options={rotationOptions} onChange={setARotation} />
                    <Input label="Çapa ofseti" keyboardType="numeric" value={aOffset} onChangeText={setAOffset} />
                  </>
                ) : (
                  <FormSelect label="Sabit vardiya" value={aFixedShift} options={fixedShiftOptions} onChange={setAFixedShift} />
                )}
                <FormDatePicker label="Başlangıç" value={aFrom} onChange={setAFrom} mode="date" />
                <FormSwitchRow label="Bitiş tarihi belirle" value={aHasTo} onValueChange={setAHasTo} />
                {aHasTo ? <FormDatePicker label="Bitiş" value={aTo} onChange={setATo} mode="date" /> : null}
                <Button title="Ata" icon="user-plus" fullWidth loading={assignSubmit.busy} onPress={doAssign} />
              </View>
            </Card>
          </Section>
        ) : null}

        {canAssign ? (
          <Section title="Takvim Oluştur">
            <Card>
              <View style={{ gap: t.spacing[4] }}>
                <Text variant="caption" tone="muted">
                  Atama kurallarını seçilen tarih aralığında günlük takvime materyalize eder.
                </Text>
                <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
                  <View style={{ flex: 1 }}>
                    <FormDatePicker label="Başlangıç" value={gFrom} onChange={setGFrom} mode="date" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <FormDatePicker label="Bitiş" value={gTo} onChange={setGTo} mode="date" />
                  </View>
                </View>
                <FormSwitchRow label="Yayınla" value={gPublish} onValueChange={setGPublish} />
                <FormSwitchRow label="Elle değişiklikleri ez" value={gOverwrite} onValueChange={setGOverwrite} />
                <Button title="Takvim Oluştur" icon="calendar" fullWidth loading={generateSubmit.busy} onPress={doGenerate} />
                {gResult ? (
                  <View style={{ flexDirection: 'row', gap: t.spacing[2] }}>
                    <Badge label={`${gResult.created} eklendi`} tone="success" />
                    <Badge label={`${gResult.updated} güncellendi`} tone="primary" />
                    <Badge label={`${gResult.skipped} atlandı`} tone="muted" />
                  </View>
                ) : null}
              </View>
            </Card>
          </Section>
        ) : null}

        <Section title="Atamalar">
          {assignmentsQuery.loading ? (
            <SkeletonRows count={3} />
          ) : assignments.length === 0 ? (
            <Card>
              <Text variant="caption" tone="muted">
                Atama yok.
              </Text>
            </Card>
          ) : (
            <View style={{ gap: t.spacing[2] }}>
              {assignments.map((a) => (
                <Card key={a.id}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[3] }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text variant="label" weight="semibold" numberOfLines={1}>
                        {a.employeeName}
                      </Text>
                      <Text variant="caption" tone="muted">
                        {a.rotationName
                          ? `${a.rotationName} (ofset ${a.rotationOffset})`
                          : a.fixedShift
                            ? `Sabit: ${a.fixedShift.name}`
                            : '—'}
                        {' · '}
                        {a.effectiveFrom.slice(0, 10)} → {a.effectiveTo?.slice(0, 10) ?? 'süresiz'}
                      </Text>
                    </View>
                    {canAssign ? (
                      <Pressable onPress={() => removeAssignment(a.id)} hitSlop={8}>
                        <Icon name="trash-2" size={20} color={t.colors.destructive} />
                      </Pressable>
                    ) : null}
                  </View>
                </Card>
              ))}
            </View>
          )}
        </Section>

        <Section title="Takvim">
          <Card>
            <View style={{ gap: t.spacing[4] }}>
              <FormSelect label="Personel" value={vEmployee} options={employeeOptions} onChange={setVEmployee} />
              <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
                <View style={{ flex: 1 }}>
                  <FormDatePicker label="Başlangıç" value={vFrom} onChange={setVFrom} mode="date" />
                </View>
                <View style={{ flex: 1 }}>
                  <FormDatePicker label="Bitiş" value={vTo} onChange={setVTo} mode="date" />
                </View>
              </View>
            </View>
          </Card>

          {!vEmployee ? (
            <Card>
              <Text variant="caption" tone="muted">
                Takvimi görüntülemek için bir personel seçin.
              </Text>
            </Card>
          ) : daysQuery.loading ? (
            <SkeletonRows count={5} />
          ) : days.length === 0 ? (
            <Card>
              <Text variant="caption" tone="muted">
                Bu aralıkta takvim yok. Önce "Takvim Oluştur" çalıştırın.
              </Text>
            </Card>
          ) : (
            <View style={{ gap: t.spacing[2], marginTop: t.spacing[2] }}>
              {days.map((d) => (
                <Card key={d.id}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[3] }}>
                    <View
                      style={{
                        width: 4,
                        alignSelf: 'stretch',
                        borderRadius: 2,
                        backgroundColor: d.shift?.color || t.colors.border,
                      }}
                    />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text variant="label" weight="semibold">
                        {dayLabel(d.workDate)}
                      </Text>
                      <Text variant="caption" tone="muted">
                        {d.shift ? (d.shift.code ? `${d.shift.code} · ${d.shift.name}` : d.shift.name) : 'İzin (OFF)'}
                      </Text>
                    </View>
                    {canAssign ? (
                      <View style={{ width: 150 }}>
                        <FormSelect
                          value={d.shift?.id ?? OFF}
                          options={dayShiftOptions}
                          onChange={(v) => setDay(d.workDate, v === OFF ? null : v)}
                        />
                      </View>
                    ) : (
                      <Badge label={d.status === 'published' ? 'Yayında' : 'Taslak'} tone={d.status === 'published' ? 'success' : 'muted'} />
                    )}
                  </View>
                </Card>
              ))}
            </View>
          )}
        </Section>
      </Screen>
    </PermissionRequired>
  )
}
