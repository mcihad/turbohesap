// Personel kartı oluştur/düzenle — bir kart numarasını personele eşler. Mirrors
// the web employee-card dialog.
import * as React from 'react'
import { ActivityIndicator, View } from 'react-native'
import {
  HrPermissions,
  type CreateEmployeeCardRequest,
} from '@turbohesap/shared'
import {
  Button,
  Card,
  EmptyState,
  FormDatePicker,
  FormSelect,
  FormSwitchRow,
  Input,
  Screen,
  Section,
  type SelectOption,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { confirmDestructive, useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'

function ymd(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function EmployeeCardEntryScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canWrite = hasPermission(HrPermissions.cardsWrite)

  const id = nav.current.params?.id ? String(nav.current.params.id) : null
  const editing = !!id
  const { submit, busy } = useSubmit()

  // The list endpoint carries the row; there is no single-card GET, so hydrate
  // an edit from the list (small, already cached on the previous screen).
  const cardsQuery = useAsync(() => api.hr.cardSources.listCards(), [], { enabled: editing })
  const employeesQuery = useAsync(() => api.hr.employees.list(), [], { enabled: canWrite })
  const employeeOptions: SelectOption<string>[] = React.useMemo(
    () => (employeesQuery.data ?? []).map((e) => ({ value: e.id, label: e.fullName })),
    [employeesQuery.data],
  )

  const [employeeId, setEmployeeId] = React.useState('')
  const [cardNo, setCardNo] = React.useState('')
  const [externalPersonnelId, setExternalPersonnelId] = React.useState('')
  const [hasFrom, setHasFrom] = React.useState(false)
  const [validFrom, setValidFrom] = React.useState(() => new Date().toISOString())
  const [hasTo, setHasTo] = React.useState(false)
  const [validTo, setValidTo] = React.useState(() => new Date().toISOString())
  const [isActive, setIsActive] = React.useState(true)

  React.useEffect(() => {
    if (!editing) return
    const d = (cardsQuery.data ?? []).find((c) => c.id === id)
    if (!d) return
    setEmployeeId(d.employeeId)
    setCardNo(d.cardNo)
    setExternalPersonnelId(d.externalPersonnelId ?? '')
    if (d.validFrom) {
      setHasFrom(true)
      setValidFrom(new Date(d.validFrom).toISOString())
    }
    if (d.validTo) {
      setHasTo(true)
      setValidTo(new Date(d.validTo).toISOString())
    }
    setIsActive(d.isActive)
  }, [cardsQuery.data, editing, id])

  const save = () => {
    if (!cardNo.trim()) {
      alert('Kart numarası zorunludur')
      return
    }
    if (!editing && !employeeId) {
      alert('Personel seçin')
      return
    }
    submit(async () => {
      const base = {
        cardNo: cardNo.trim(),
        externalPersonnelId: externalPersonnelId.trim() || null,
        validFrom: hasFrom ? ymd(validFrom) : null,
        validTo: hasTo ? ymd(validTo) : null,
        isActive,
      }
      if (editing) await api.hr.cardSources.updateCard(id as string, base)
      else await api.hr.cardSources.createCard({ employeeId, ...base } as CreateEmployeeCardRequest)
      nav.goBack()
    })
  }

  const remove = () =>
    confirmDestructive('Kart sil', 'Bu kart silinsin mi?', () =>
      submit(async () => {
        await api.hr.cardSources.removeCard(id as string)
        nav.goBack()
      }),
    )

  if (!canWrite) {
    return (
      <Screen header={{ title: editing ? 'Kartı düzenle' : 'Yeni kart', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu sayfada düzenleme yapma yetkiniz yok." />
      </Screen>
    )
  }

  const loadingExisting = editing && cardsQuery.loading

  return (
    <Screen
      header={{ title: editing ? 'Kartı düzenle' : 'Yeni personel kartı', onBack: nav.goBack }}
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
          <Section title="Eşleme">
            <Card>
              <View style={{ gap: t.spacing[4] }}>
                {!editing ? (
                  <FormSelect label="Personel" value={employeeId} options={employeeOptions} onChange={setEmployeeId} />
                ) : null}
                <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
                  <View style={{ flex: 1 }}>
                    <Input label="Kart No" autoCapitalize="none" value={cardNo} onChangeText={setCardNo} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input
                      label="Personel ID"
                      autoCapitalize="none"
                      value={externalPersonnelId}
                      onChangeText={setExternalPersonnelId}
                    />
                  </View>
                </View>
                <FormSwitchRow label="Aktif" value={isActive} onValueChange={setIsActive} />
              </View>
            </Card>
          </Section>

          <Section title="Geçerlilik">
            <Card>
              <View style={{ gap: t.spacing[4] }}>
                <FormSwitchRow label="Başlangıç tarihi" value={hasFrom} onValueChange={setHasFrom} />
                {hasFrom ? <FormDatePicker label="Geçerli (baş.)" value={validFrom} onChange={setValidFrom} mode="date" /> : null}
                <FormSwitchRow label="Bitiş tarihi" value={hasTo} onValueChange={setHasTo} />
                {hasTo ? <FormDatePicker label="Geçerli (bitiş)" value={validTo} onChange={setValidTo} mode="date" /> : null}
              </View>
            </Card>
          </Section>

          {editing ? (
            <Section title="Tehlikeli bölge">
              <Button title="Kartı sil" icon="trash-2" variant="destructive" fullWidth loading={busy} onPress={remove} />
            </Section>
          ) : null}
        </>
      )}
    </Screen>
  )
}
