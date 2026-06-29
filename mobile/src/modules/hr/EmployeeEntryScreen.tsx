import * as React from 'react'
import { ActivityIndicator, View } from 'react-native'
import {
  EMPLOYMENT_TYPES,
  EMPLOYMENT_TYPE_LABELS,
  HrPermissions,
  SALARY_TYPES,
  SALARY_TYPE_LABELS,
  SGK_STATUSES,
  SGK_STATUS_LABELS,
  type CreateEmployeeRequest,
  type EmploymentType,
  type SalaryType,
  type SgkStatus,
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
  type SelectOption,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'

const EMPLOYMENT_OPTIONS: SelectOption<EmploymentType>[] = EMPLOYMENT_TYPES.map((v) => ({
  value: v,
  label: EMPLOYMENT_TYPE_LABELS[v],
}))
const SALARY_OPTIONS: SelectOption<SalaryType>[] = SALARY_TYPES.map((v) => ({
  value: v,
  label: SALARY_TYPE_LABELS[v],
}))
const SGK_OPTIONS: SelectOption<SgkStatus>[] = SGK_STATUSES.map((v) => ({
  value: v,
  label: SGK_STATUS_LABELS[v],
}))

export function EmployeeEntryScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canWrite = hasPermission(HrPermissions.write)

  const id = nav.current.params?.id ? String(nav.current.params.id) : null
  const editing = !!id
  const { submit, busy } = useSubmit()

  const existing = useAsync(() => api.hr.employees.get(id as string), [id], { enabled: editing })

  const [firstName, setFirstName] = React.useState('')
  const [lastName, setLastName] = React.useState('')
  const [tcKimlikNo, setTcKimlikNo] = React.useState('')
  const [hireDate, setHireDate] = React.useState(() => new Date().toISOString())
  const [employmentType, setEmploymentType] = React.useState<EmploymentType>('full_time')
  const [salaryType, setSalaryType] = React.useState<SalaryType>('gross')
  const [salaryAmount, setSalaryAmount] = React.useState('0')
  const [departmentKey, setDepartmentKey] = React.useState('')
  const [positionKey, setPositionKey] = React.useState('')
  const [sgkStatus, setSgkStatus] = React.useState<SgkStatus>('normal')
  const [sgkSicilNo, setSgkSicilNo] = React.useState('')
  const [annualLeaveDays, setAnnualLeaveDays] = React.useState('14')
  const [phone, setPhone] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [iban, setIban] = React.useState('')
  const [bankName, setBankName] = React.useState('')
  const [address, setAddress] = React.useState('')
  const [notes, setNotes] = React.useState('')
  const [isActive, setIsActive] = React.useState(true)

  React.useEffect(() => {
    const d = existing.data
    if (!d) return
    setFirstName(d.firstName)
    setLastName(d.lastName)
    setTcKimlikNo(d.tcKimlikNo ?? '')
    setHireDate(d.hireDate)
    setEmploymentType(d.employmentType)
    setSalaryType(d.salaryType)
    setSalaryAmount(String(d.salaryAmount))
    setDepartmentKey(d.departmentKey ?? '')
    setPositionKey(d.positionKey ?? '')
    setSgkStatus(d.sgkStatus)
    setSgkSicilNo(d.sgkSicilNo ?? '')
    setAnnualLeaveDays(String(d.annualLeaveDays))
    setPhone(d.phone ?? '')
    setEmail(d.email ?? '')
    setIban(d.iban ?? '')
    setBankName(d.bankName ?? '')
    setAddress(d.address ?? '')
    setNotes(d.notes ?? '')
    setIsActive(d.isActive)
  }, [existing.data])

  const save = () => {
    if (!firstName.trim() || !lastName.trim()) {
      alert('Ad ve soyad zorunludur')
      return
    }
    submit(async () => {
      const payload: CreateEmployeeRequest = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        tcKimlikNo: tcKimlikNo.trim() || undefined,
        hireDate,
        employmentType,
        salaryType,
        salaryAmount: Number(salaryAmount) || 0,
        departmentKey: departmentKey.trim() || null,
        positionKey: positionKey.trim() || null,
        sgkStatus,
        sgkSicilNo: sgkSicilNo.trim() || null,
        annualLeaveDays: Number(annualLeaveDays) || 0,
        phone: phone.trim() || null,
        email: email.trim() || null,
        iban: iban.trim() || null,
        bankName: bankName.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
        isActive,
      }
      const target = editing
        ? await api.hr.employees.update(id as string, payload)
        : await api.hr.employees.create(payload)
      nav.navigate('hr.employee.detail', { id: target.id }, target.fullName)
    })
  }

  if (!canWrite) {
    return (
      <Screen header={{ title: editing ? 'Personel düzenle' : 'Yeni personel', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu sayfada düzenleme yapma yetkiniz yok." />
      </Screen>
    )
  }

  const loadingExisting = editing && existing.loading

  return (
    <Screen
      header={{ title: editing ? 'Personel düzenle' : 'Yeni personel', onBack: nav.goBack }}
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
          <Section title="Kişisel Bilgiler">
            <Card>
              <View style={{ gap: t.spacing[4] }}>
                <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
                  <View style={{ flex: 1 }}>
                    <Input label="Ad" value={firstName} onChangeText={setFirstName} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input label="Soyad" value={lastName} onChangeText={setLastName} />
                  </View>
                </View>
                <Input label="TC Kimlik No" keyboardType="numeric" value={tcKimlikNo} onChangeText={setTcKimlikNo} />
                <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
                  <View style={{ flex: 1 }}>
                    <Input label="Telefon" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input label="E-posta" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
                  </View>
                </View>
                <FormTextArea label="Adres" value={address} onChangeText={setAddress} />
              </View>
            </Card>
          </Section>

          <Section title="İstihdam">
            <Card>
              <View style={{ gap: t.spacing[4] }}>
                <FormDatePicker label="İşe Giriş" value={hireDate} onChange={setHireDate} mode="date" />
                <FormSelect label="Çalışma Türü" value={employmentType} options={EMPLOYMENT_OPTIONS} onChange={setEmploymentType} />
                <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
                  <View style={{ flex: 1 }}>
                    <Input label="Departman" value={departmentKey} onChangeText={setDepartmentKey} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input label="Pozisyon" value={positionKey} onChangeText={setPositionKey} />
                  </View>
                </View>
                <Input label="Yıllık İzin (gün)" keyboardType="numeric" value={annualLeaveDays} onChangeText={setAnnualLeaveDays} />
                <FormSwitchRow label="Aktif" description="Pasif personel bordroya dahil edilmez" value={isActive} onValueChange={setIsActive} />
              </View>
            </Card>
          </Section>

          <Section title="Maaş & SGK">
            <Card>
              <View style={{ gap: t.spacing[4] }}>
                <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
                  <View style={{ flex: 1 }}>
                    <FormSelect label="Maaş Türü" value={salaryType} options={SALARY_OPTIONS} onChange={setSalaryType} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Input label="Maaş Tutarı" keyboardType="numeric" value={salaryAmount} onChangeText={setSalaryAmount} />
                  </View>
                </View>
                <FormSelect label="SGK Durumu" value={sgkStatus} options={SGK_OPTIONS} onChange={setSgkStatus} />
                <Input label="SGK Sicil No" value={sgkSicilNo} onChangeText={setSgkSicilNo} />
              </View>
            </Card>
          </Section>

          <Section title="Banka">
            <Card>
              <View style={{ gap: t.spacing[4] }}>
                <Input label="IBAN" autoCapitalize="characters" value={iban} onChangeText={setIban} />
                <Input label="Banka" value={bankName} onChangeText={setBankName} />
              </View>
            </Card>
          </Section>

          <Section title="Notlar">
            <FormTextArea label="Notlar" placeholder="Personel notları..." value={notes} onChangeText={setNotes} />
          </Section>
        </>
      )}
    </Screen>
  )
}
