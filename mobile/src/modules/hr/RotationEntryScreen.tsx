// Rotasyon oluştur/düzenle — cycle editor: one shift slot (or OFF) per cycle day
// plus an optional team label. Mirrors the web rotation-dialog.
import * as React from 'react'
import { ActivityIndicator, View } from 'react-native'
import {
  HrPermissions,
  type CreateShiftRotationRequest,
  type RotationDay,
} from '@turbohesap/shared'
import {
  Button,
  Card,
  EmptyState,
  FormDatePicker,
  FormSelect,
  FormSwitchRow,
  FormTextArea,
  Input,
  Screen,
  Section,
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

function buildDays(prev: RotationDay[], length: number): RotationDay[] {
  const out: RotationDay[] = []
  for (let i = 0; i < length; i++) {
    const existing = prev.find((d) => d.dayIndex === i)
    out.push(existing ?? { dayIndex: i, shiftId: null, teamLabel: null })
  }
  return out
}

function ymd(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function RotationEntryScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(HrPermissions.shiftsRead)
  const canWrite = hasPermission(HrPermissions.shiftsWrite)

  const id = nav.current.params?.id ? String(nav.current.params.id) : null
  const editing = !!id
  const { submit, busy } = useSubmit()

  const existing = useAsync(() => api.hr.shiftRotations.get(id as string), [id], { enabled: editing })
  const shiftsQuery = useAsync(() => api.hr.shifts.list(), [], { enabled: canRead })

  const [name, setName] = React.useState('')
  const [cycleLength, setCycleLength] = React.useState('7')
  const [anchorDate, setAnchorDate] = React.useState(() => new Date().toISOString())
  const [description, setDescription] = React.useState('')
  const [isActive, setIsActive] = React.useState(true)
  const [days, setDays] = React.useState<RotationDay[]>(() => buildDays([], 7))

  React.useEffect(() => {
    const d = existing.data
    if (!d) return
    setName(d.name)
    setCycleLength(String(d.cycleLengthDays))
    setAnchorDate(d.anchorDate ? new Date(d.anchorDate).toISOString() : new Date().toISOString())
    setDescription(d.description ?? '')
    setIsActive(d.isActive)
    setDays(buildDays(d.days ?? [], d.cycleLengthDays))
  }, [existing.data])

  const setLength = (raw: string) => {
    setCycleLength(raw)
    const n = Math.max(1, Math.min(60, Number(raw) || 1))
    setDays((prev) => buildDays(prev, n))
  }

  const setDay = (i: number, patch: Partial<RotationDay>) =>
    setDays((prev) => prev.map((d) => (d.dayIndex === i ? { ...d, ...patch } : d)))

  const shiftOptions: SelectOption<string>[] = React.useMemo(() => {
    const active = (shiftsQuery.data ?? []).filter((s) => s.isActive)
    return [
      { value: OFF, label: 'İzin / OFF (—)' },
      ...active.map((s) => ({ value: s.id, label: s.code ? `${s.code} · ${s.name}` : s.name })),
    ]
  }, [shiftsQuery.data])

  const save = () => {
    if (!name.trim()) {
      alert('Rotasyon adı zorunludur')
      return
    }
    const n = Math.max(1, Math.min(60, Number(cycleLength) || 1))
    submit(async () => {
      const payload: CreateShiftRotationRequest = {
        name: name.trim(),
        cycleLengthDays: n,
        anchorDate: ymd(anchorDate),
        description: description.trim() || null,
        isActive,
        days: buildDays(days, n).map((d) => ({
          dayIndex: d.dayIndex,
          shiftId: d.shiftId,
          teamLabel: d.teamLabel?.trim() ? d.teamLabel.trim() : null,
        })),
      }
      if (editing) await api.hr.shiftRotations.update(id as string, payload)
      else await api.hr.shiftRotations.create(payload)
      nav.goBack()
    })
  }

  const remove = () =>
    confirmDestructive('Rotasyon sil', `"${name}" rotasyonu silinsin mi?`, () =>
      submit(async () => {
        await api.hr.shiftRotations.remove(id as string)
        nav.goBack()
      }),
    )

  if (!canWrite) {
    return (
      <Screen header={{ title: editing ? 'Rotasyon düzenle' : 'Yeni rotasyon', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu sayfada düzenleme yapma yetkiniz yok." />
      </Screen>
    )
  }

  const loadingExisting = editing && existing.loading

  return (
    <Screen
      header={{ title: editing ? 'Rotasyon düzenle' : 'Yeni rotasyon', onBack: nav.goBack }}
      footer={
        !loadingExisting ? (
          <Button title={editing ? 'Kaydet' : 'Oluştur'} icon="check" fullWidth loading={busy} onPress={save} />
        ) : undefined
      }
    >
      {loadingExisting ? (
        <View style={{ flex: 1, padding: 32, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <>
          <Section title="Tanım">
            <Card>
              <View style={{ gap: t.spacing[4] }}>
                <Input label="Ad" placeholder="2 vardiya döngüsü" value={name} onChangeText={setName} />
                <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
                  <View style={{ flex: 1 }}>
                    <Input label="Döngü (gün)" keyboardType="numeric" value={cycleLength} onChangeText={setLength} />
                  </View>
                  <View style={{ flex: 1.4 }}>
                    <FormDatePicker label="Çapa tarihi" value={anchorDate} onChange={setAnchorDate} mode="date" />
                  </View>
                </View>
                <Text variant="caption" tone="muted">
                  Çapa tarihi, döngünün 0. gününün denk geldiği tarihtir.
                </Text>
                <FormSwitchRow label="Aktif" value={isActive} onValueChange={setIsActive} />
              </View>
            </Card>
          </Section>

          <Section title="Döngü düzeni">
            <View style={{ gap: t.spacing[3] }}>
              {days.map((d) => (
                <Card key={d.dayIndex}>
                  <View style={{ gap: t.spacing[3] }}>
                    <Text variant="label" weight="semibold">
                      {d.dayIndex + 1}. gün
                    </Text>
                    <FormSelect
                      label="Vardiya"
                      value={d.shiftId ?? OFF}
                      options={shiftOptions}
                      onChange={(v) => setDay(d.dayIndex, { shiftId: v === OFF ? null : v })}
                    />
                    <Input
                      label="Takım (ops.)"
                      placeholder="A"
                      value={d.teamLabel ?? ''}
                      onChangeText={(v) => setDay(d.dayIndex, { teamLabel: v })}
                    />
                  </View>
                </Card>
              ))}
            </View>
          </Section>

          <Section title="Açıklama">
            <FormTextArea label="Açıklama" value={description} onChangeText={setDescription} />
          </Section>

          {editing ? (
            <Section title="Tehlikeli bölge">
              <Button title="Rotasyonu sil" icon="trash-2" variant="destructive" fullWidth loading={busy} onPress={remove} />
            </Section>
          ) : null}
        </>
      )}
    </Screen>
  )
}
