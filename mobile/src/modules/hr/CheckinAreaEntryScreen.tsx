// Giriş alanı oluşturma/düzenleme formu. Harita geometri editörü + öznitelikler +
// zaman aralıkları + (yetkiye bağlı) personel ataması. Web'deki CheckinAreaDialog'un
// mobil karşılığı.
import * as React from 'react'
import { ActivityIndicator, Pressable, View } from 'react-native'
import {
  HrPermissions,
  type CheckinTimeWindow,
  type CreateCheckinAreaRequest,
  type GeoJsonGeometry,
} from '@turbohesap/shared'

import {
  Button,
  Card,
  Checklist,
  EmptyState,
  FormSelect,
  FormSwitchRow,
  FormTextArea,
  Icon,
  Input,
  Screen,
  Section,
  Text,
  type ChecklistItem,
  type SelectOption,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { AreaGeometryEditor } from './components/map/AreaGeometryEditor'

const NO_BRANCH = ''
const DOW: { value: number; label: string }[] = [
  { value: 1, label: 'Pzt' },
  { value: 2, label: 'Sal' },
  { value: 3, label: 'Çar' },
  { value: 4, label: 'Per' },
  { value: 5, label: 'Cum' },
  { value: 6, label: 'Cmt' },
  { value: 7, label: 'Paz' },
]

export function CheckinAreaEntryScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canWrite = hasPermission(HrPermissions.areasWrite)
  const canAssign = hasPermission(HrPermissions.areasAssign)

  const id = nav.current.params?.id ? String(nav.current.params.id) : null
  const editing = !!id
  const { submit, busy } = useSubmit()

  const existing = useAsync(() => api.hr.checkinAreas.get(id as string), [id], { enabled: editing })
  const branchesAsync = useAsync(() => api.org.branches.list(), [])
  const employeesAsync = useAsync(() => api.hr.employees.list(), [], { enabled: canAssign })
  const assignedAsync = useAsync(
    () => api.hr.checkinAreas.listEmployees(id as string),
    [id],
    { enabled: editing && canAssign },
  )

  const [name, setName] = React.useState('')
  const [code, setCode] = React.useState('')
  const [geom, setGeom] = React.useState<GeoJsonGeometry | null>(null)
  const [toleranceMeters, setToleranceMeters] = React.useState('50')
  const [minAccuracyMeters, setMinAccuracyMeters] = React.useState('50')
  const [branchId, setBranchId] = React.useState<string>(NO_BRANCH)
  const [requireInside, setRequireInside] = React.useState(true)
  const [allowMockLocation, setAllowMockLocation] = React.useState(false)
  const [isActive, setIsActive] = React.useState(true)
  const [notes, setNotes] = React.useState('')
  const [windows, setWindows] = React.useState<CheckinTimeWindow[]>([])
  const [assigned, setAssigned] = React.useState<string[]>([])
  // Serbest öznitelikler bu ekranda düzenlenmez; düzenlemede korunur.
  const attributesRef = React.useRef<Record<string, unknown>>({})

  React.useEffect(() => {
    const d = existing.data
    if (!d) return
    setName(d.name)
    setCode(d.code ?? '')
    setGeom(d.geom)
    setToleranceMeters(String(d.toleranceMeters))
    setMinAccuracyMeters(String(d.minAccuracyMeters))
    setBranchId(d.branchId ?? NO_BRANCH)
    setRequireInside(d.requireInside)
    setAllowMockLocation(d.allowMockLocation)
    setIsActive(d.isActive)
    setNotes(d.notes ?? '')
    setWindows(d.timeWindows ?? [])
    attributesRef.current = d.attributes ?? {}
  }, [existing.data])

  React.useEffect(() => {
    if (assignedAsync.data) setAssigned(assignedAsync.data)
  }, [assignedAsync.data])

  const branchOptions: SelectOption<string>[] = React.useMemo(
    () => [
      { value: NO_BRANCH, label: 'Şube yok' },
      ...(branchesAsync.data ?? []).map((b) => ({ value: b.id, label: b.name })),
    ],
    [branchesAsync.data],
  )

  const employeeItems: ChecklistItem[] = React.useMemo(
    () => (employeesAsync.data ?? []).map((e) => ({ id: e.id, title: e.fullName })),
    [employeesAsync.data],
  )

  // ── zaman aralıkları ──
  const addWindow = () =>
    setWindows((w) => [...w, { dow: [], from: '08:00', to: '18:00' }])
  const removeWindow = (i: number) => setWindows((w) => w.filter((_, idx) => idx !== i))
  const patchWindow = (i: number, patch: Partial<CheckinTimeWindow>) =>
    setWindows((w) => w.map((win, idx) => (idx === i ? { ...win, ...patch } : win)))
  const toggleDow = (i: number, d: number) => {
    const cur = windows[i]?.dow ?? []
    const next = cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort((a, b) => a - b)
    patchWindow(i, { dow: next })
  }

  const save = () => {
    if (!name.trim()) {
      alert('Alan adı zorunludur')
      return
    }
    submit(async () => {
      const payload: CreateCheckinAreaRequest = {
        name: name.trim(),
        code: code.trim() || undefined,
        branchId: branchId === NO_BRANCH ? null : branchId,
        geom,
        toleranceMeters: Number(toleranceMeters) || 0,
        minAccuracyMeters: Number(minAccuracyMeters) || 0,
        timeWindows: windows.map((w) => ({
          dow: w.dow && w.dow.length > 0 ? w.dow : undefined,
          from: w.from,
          to: w.to,
        })),
        attributes: attributesRef.current,
        requireInside,
        allowMockLocation,
        isActive,
        notes: notes.trim() || null,
      }
      const saved = editing
        ? await api.hr.checkinAreas.update(id as string, payload)
        : await api.hr.checkinAreas.create(payload)
      if (canAssign) {
        await api.hr.checkinAreas.setEmployees(saved.id, { employeeIds: assigned })
      }
      nav.goBack()
    })
  }

  if (!canWrite) {
    return (
      <Screen header={{ title: editing ? 'Giriş alanını düzenle' : 'Yeni giriş alanı', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu sayfada düzenleme yapma yetkiniz yok." />
      </Screen>
    )
  }

  const loadingExisting = editing && existing.loading

  return (
    <Screen
      header={{ title: editing ? 'Giriş alanını düzenle' : 'Yeni giriş alanı', onBack: nav.goBack }}
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
          <Section title="Harita (geometri)">
            <Card>
              <AreaGeometryEditor
                value={geom}
                onChange={setGeom}
                toleranceMeters={Number(toleranceMeters) || 0}
              />
            </Card>
          </Section>

          <Section title="Öznitelikler">
            <Card>
              <View style={{ gap: t.spacing[4] }}>
                <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
                  <View style={{ flex: 1 }}>
                    <Input label="Ad" value={name} onChangeText={setName} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input label="Kod" autoCapitalize="characters" value={code} onChangeText={setCode} />
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Tolerans (m)"
                      keyboardType="numeric"
                      value={toleranceMeters}
                      onChangeText={setToleranceMeters}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Min. doğruluk (m)"
                      keyboardType="numeric"
                      value={minAccuracyMeters}
                      onChangeText={setMinAccuracyMeters}
                    />
                  </View>
                </View>
                <Text variant="caption" tone="muted">
                  Tolerans: poligonda dışa tampon / noktada yarıçap (m).
                </Text>
                <FormSelect label="Şube" value={branchId} options={branchOptions} onChange={setBranchId} />
                <FormSwitchRow
                  label="Alan içinde olmalı"
                  description="Giriş geçerli sayılması için konum alanın içinde olmalı."
                  value={requireInside}
                  onValueChange={setRequireInside}
                />
                <FormSwitchRow
                  label="Sahte konuma izin ver"
                  description="Kapalıyken sahte (mock) konum bildirimleri işaretlenir."
                  value={allowMockLocation}
                  onValueChange={setAllowMockLocation}
                />
                <FormSwitchRow
                  label="Aktif"
                  description="Pasif alanlardan giriş yapılamaz."
                  value={isActive}
                  onValueChange={setIsActive}
                />
                <FormTextArea label="Notlar" value={notes} onChangeText={setNotes} />
              </View>
            </Card>
          </Section>

          <Section title="Zaman aralıkları">
            <Card>
              <View style={{ gap: t.spacing[3] }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text variant="caption" tone="muted" style={{ flex: 1 }}>
                    {windows.length === 0 ? 'Boş = her zaman giriş yapılabilir.' : 'Seçili gün/saatlerde giriş yapılabilir.'}
                  </Text>
                  <Button title="Ekle" icon="plus" variant="outline" size="sm" onPress={addWindow} />
                </View>
                {windows.map((w, i) => (
                  <View
                    key={i}
                    style={{
                      gap: t.spacing[2.5],
                      padding: t.spacing[3],
                      borderRadius: t.radius.md,
                      borderWidth: 1,
                      borderColor: t.colors.border,
                      backgroundColor: t.colors.surface,
                    }}
                  >
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[1.5] }}>
                      {DOW.map((d) => {
                        const active = (w.dow ?? []).includes(d.value)
                        return (
                          <Pressable
                            key={d.value}
                            onPress={() => toggleDow(i, d.value)}
                            style={{
                              paddingHorizontal: t.spacing[2.5],
                              paddingVertical: t.spacing[1.5],
                              borderRadius: t.radius.sm,
                              backgroundColor: active ? t.colors.primary : t.colors.card,
                              borderWidth: 1,
                              borderColor: active ? t.colors.primary : t.colors.border,
                            }}
                          >
                            <Text variant="caption" weight="medium" tone={active ? 'onPrimary' : 'muted'}>
                              {d.label}
                            </Text>
                          </Pressable>
                        )
                      })}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: t.spacing[2] }}>
                      <View style={{ flex: 1 }}>
                        <Input
                          label="Başl."
                          placeholder="08:00"
                          value={w.from}
                          onChangeText={(v) => patchWindow(i, { from: v })}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Input
                          label="Bitiş"
                          placeholder="18:00"
                          value={w.to}
                          onChangeText={(v) => patchWindow(i, { to: v })}
                        />
                      </View>
                      <Pressable
                        onPress={() => removeWindow(i)}
                        hitSlop={8}
                        style={{
                          height: 48,
                          width: 48,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon name="trash-2" size={20} color={t.colors.destructive} />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            </Card>
          </Section>

          {canAssign ? (
            <Section title="Personel">
              <View style={{ gap: t.spacing[2] }}>
                <Text variant="caption" tone="muted">
                  Atama yoksa personel tüm aktif alanlardan giriş yapabilir.
                </Text>
                <Checklist
                  items={employeeItems}
                  selected={assigned}
                  onToggle={(eid, on) =>
                    setAssigned((prev) => (on ? [...prev, eid] : prev.filter((x) => x !== eid)))
                  }
                  searchable
                  emptyText="Personel yok"
                />
              </View>
            </Section>
          ) : null}
        </>
      )}
    </Screen>
  )
}
