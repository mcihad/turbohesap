// Vardiya oluştur/düzenle — dedicated form screen with a breaks (mola) editor,
// colour swatches, gece/izin switches and HH:MM time inputs. Mirrors the web
// shift-dialog.
import * as React from 'react'
import { ActivityIndicator, Pressable, View } from 'react-native'
import {
  HrPermissions,
  type CreateShiftRequest,
  type ShiftBreak,
} from '@turbohesap/shared'
import {
  Button,
  Card,
  EmptyState,
  FormSwitchRow,
  FormTextArea,
  Icon,
  Input,
  Screen,
  Section,
  Text,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { confirmDestructive, useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'

const SWATCHES = ['#2563eb', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed', '#db2777', '#475569']

export function ShiftEntryScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canWrite = hasPermission(HrPermissions.shiftsWrite)

  const id = nav.current.params?.id ? String(nav.current.params.id) : null
  const editing = !!id
  const { submit, busy } = useSubmit()

  const existing = useAsync(() => api.hr.shifts.get(id as string), [id], { enabled: editing })

  const [name, setName] = React.useState('')
  const [code, setCode] = React.useState('')
  const [startTime, setStartTime] = React.useState('09:00')
  const [endTime, setEndTime] = React.useState('18:00')
  const [crossesMidnight, setCrossesMidnight] = React.useState(false)
  const [isDayOff, setIsDayOff] = React.useState(false)
  const [expectedMinutes, setExpectedMinutes] = React.useState('480')
  const [lateGraceMin, setLateGraceMin] = React.useState('15')
  const [earlyLeaveGraceMin, setEarlyLeaveGraceMin] = React.useState('15')
  const [earlyInClampMin, setEarlyInClampMin] = React.useState('0')
  const [color, setColor] = React.useState('#2563eb')
  const [isActive, setIsActive] = React.useState(true)
  const [notes, setNotes] = React.useState('')
  const [breaks, setBreaks] = React.useState<ShiftBreak[]>([])

  React.useEffect(() => {
    const d = existing.data
    if (!d) return
    setName(d.name)
    setCode(d.code ?? '')
    setStartTime(d.startTime)
    setEndTime(d.endTime)
    setCrossesMidnight(d.crossesMidnight)
    setIsDayOff(d.isDayOff)
    setExpectedMinutes(String(d.expectedMinutes))
    setLateGraceMin(String(d.lateGraceMin))
    setEarlyLeaveGraceMin(String(d.earlyLeaveGraceMin))
    setEarlyInClampMin(String(d.earlyInClampMin))
    setColor(d.color || '#2563eb')
    setIsActive(d.isActive)
    setNotes(d.notes ?? '')
    setBreaks(d.breaks ?? [])
  }, [existing.data])

  const num = (s: string, def = 0) => {
    const n = Number(s)
    return Number.isFinite(n) ? n : def
  }

  const addBreak = () =>
    setBreaks((b) => [...b, { startOffsetMin: 240, durationMin: 60, paid: false, label: 'Yemek' }])
  const setBreak = (i: number, patch: Partial<ShiftBreak>) =>
    setBreaks((b) => b.map((x, idx) => (idx === i ? { ...x, ...patch } : x)))
  const removeBreak = (i: number) => setBreaks((b) => b.filter((_, idx) => idx !== i))

  const save = () => {
    if (!name.trim()) {
      alert('Vardiya adı zorunludur')
      return
    }
    submit(async () => {
      const payload: CreateShiftRequest = {
        name: name.trim(),
        code: code.trim() || undefined,
        startTime,
        endTime,
        crossesMidnight,
        expectedMinutes: num(expectedMinutes, 480),
        lateGraceMin: num(lateGraceMin),
        earlyLeaveGraceMin: num(earlyLeaveGraceMin),
        earlyInClampMin: num(earlyInClampMin),
        color,
        isDayOff,
        isActive,
        notes: notes.trim() || null,
        breaks,
      }
      if (editing) await api.hr.shifts.update(id as string, payload)
      else await api.hr.shifts.create(payload)
      nav.goBack()
    })
  }

  const remove = () =>
    confirmDestructive('Vardiya sil', `"${name}" vardiyası silinsin mi?`, () =>
      submit(async () => {
        await api.hr.shifts.remove(id as string)
        nav.goBack()
      }),
    )

  if (!canWrite) {
    return (
      <Screen header={{ title: editing ? 'Vardiya düzenle' : 'Yeni vardiya', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu sayfada düzenleme yapma yetkiniz yok." />
      </Screen>
    )
  }

  const loadingExisting = editing && existing.loading

  return (
    <Screen
      header={{ title: editing ? 'Vardiya düzenle' : 'Yeni vardiya', onBack: nav.goBack }}
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
                <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
                  <View style={{ flex: 1.6 }}>
                    <Input label="Ad" placeholder="Gündüz" value={name} onChangeText={setName} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input label="Kod" placeholder="G1" autoCapitalize="characters" value={code} onChangeText={setCode} />
                  </View>
                </View>
                <FormSwitchRow
                  label="İzin günü (OFF)"
                  description="Rotasyon yuvası olarak kullanılan sözde vardiya"
                  value={isDayOff}
                  onValueChange={setIsDayOff}
                />
                {!isDayOff ? (
                  <>
                    <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
                      <View style={{ flex: 1 }}>
                        <Input label="Başlangıç" placeholder="09:00" value={startTime} onChangeText={setStartTime} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Input label="Bitiş" placeholder="18:00" value={endTime} onChangeText={setEndTime} />
                      </View>
                    </View>
                    <FormSwitchRow
                      label="Gece vardiyası (gün aşar)"
                      value={crossesMidnight}
                      onValueChange={setCrossesMidnight}
                    />
                  </>
                ) : null}
                <FormSwitchRow label="Aktif" value={isActive} onValueChange={setIsActive} />
              </View>
            </Card>
          </Section>

          {!isDayOff ? (
            <Section title="Tolerans (dakika)">
              <Card>
                <View style={{ gap: t.spacing[4] }}>
                  <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
                    <View style={{ flex: 1 }}>
                      <Input label="Beklenen" keyboardType="numeric" value={expectedMinutes} onChangeText={setExpectedMinutes} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Input label="Geç tolerans" keyboardType="numeric" value={lateGraceMin} onChangeText={setLateGraceMin} />
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
                    <View style={{ flex: 1 }}>
                      <Input label="Erken çıkış" keyboardType="numeric" value={earlyLeaveGraceMin} onChangeText={setEarlyLeaveGraceMin} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Input label="Erken giriş kırpma" keyboardType="numeric" value={earlyInClampMin} onChangeText={setEarlyInClampMin} />
                    </View>
                  </View>
                </View>
              </Card>
            </Section>
          ) : null}

          <Section title="Renk">
            <Card>
              <View style={{ gap: t.spacing[3] }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[2] }}>
                  {SWATCHES.map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => setColor(c)}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: t.radius.full,
                        backgroundColor: c,
                        borderWidth: color === c ? 3 : 1,
                        borderColor: color === c ? t.colors.foreground : t.colors.border,
                      }}
                    />
                  ))}
                </View>
                <Input label="Renk (hex)" autoCapitalize="none" value={color} onChangeText={setColor} />
              </View>
            </Card>
          </Section>

          {!isDayOff ? (
            <Section
              title="Molalar"
              action={
                <Pressable onPress={addBreak} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Icon name="plus" size={16} color={t.colors.primary} />
                  <Text variant="label" weight="medium" tone="primary">
                    Mola ekle
                  </Text>
                </Pressable>
              }
            >
              <Card>
                {breaks.length === 0 ? (
                  <Text variant="caption" tone="muted">
                    Mola tanımlı değil.
                  </Text>
                ) : (
                  <View style={{ gap: t.spacing[4] }}>
                    {breaks.map((b, i) => (
                      <View
                        key={i}
                        style={{
                          gap: t.spacing[3],
                          paddingBottom: i < breaks.length - 1 ? t.spacing[4] : 0,
                          borderBottomWidth: i < breaks.length - 1 ? 1 : 0,
                          borderBottomColor: t.colors.border,
                        }}
                      >
                        <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
                          <View style={{ flex: 1 }}>
                            <Input
                              label="Başl. (dk)"
                              keyboardType="numeric"
                              value={String(b.startOffsetMin)}
                              onChangeText={(v) => setBreak(i, { startOffsetMin: Number(v) || 0 })}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Input
                              label="Süre (dk)"
                              keyboardType="numeric"
                              value={String(b.durationMin)}
                              onChangeText={(v) => setBreak(i, { durationMin: Number(v) || 0 })}
                            />
                          </View>
                        </View>
                        <Input label="Etiket" value={b.label} onChangeText={(v) => setBreak(i, { label: v })} placeholder="Yemek" />
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <View style={{ flex: 1 }}>
                            <FormSwitchRow label="Ücretli" value={b.paid} onValueChange={(v) => setBreak(i, { paid: v })} />
                          </View>
                          <Pressable
                            onPress={() => removeBreak(i)}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: t.spacing[3] }}
                          >
                            <Icon name="trash-2" size={18} color={t.colors.destructive} />
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </Card>
            </Section>
          ) : null}

          <Section title="Notlar">
            <FormTextArea label="Notlar" placeholder="Vardiya notları..." value={notes} onChangeText={setNotes} />
          </Section>

          {editing ? (
            <Section title="Tehlikeli bölge">
              <Button title="Vardiyayı sil" icon="trash-2" variant="destructive" fullWidth loading={busy} onPress={remove} />
            </Section>
          ) : null}
        </>
      )}
    </Screen>
  )
}
