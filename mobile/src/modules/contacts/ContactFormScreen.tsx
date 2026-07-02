import * as React from 'react'
import { ActivityIndicator, View } from 'react-native'
import {
  CONTACT_ROLES,
  CodePrefixContexts,
  ContactsPermissions,
  type BalanceSide,
  type ContactRole,
  type ContactType,
  type CreateContactRequest,
} from '@turbohesap/shared'
import {
  Button,
  CodePrefixInput,
  type CodePrefixInputHandle,
  EmptyState,
  FormSelect,
  FormSwitchRow,
  FormTextArea,
  Input,
  Screen,
  Section,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { CrmAttributeFields } from './CrmAttributeFields'

const ROLE_LABELS: Record<ContactRole, string> = {
  customer: 'Müşteri',
  supplier: 'Tedarikçi',
  both: 'Müşteri+Tedarikçi',
  lead: 'Aday',
}

const TYPE_OPTIONS: { value: ContactType; label: string }[] = [
  { value: 'company', label: 'Kurumsal' },
  { value: 'individual', label: 'Bireysel' },
]

const ROLE_OPTIONS = CONTACT_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))

const SIDE_OPTIONS: { value: BalanceSide; label: string }[] = [
  { value: 'debit', label: 'Borç' },
  { value: 'credit', label: 'Alacak' },
]

interface FormState {
  contactType: ContactType
  role: ContactRole
  name: string
  code: string
  taxOffice: string
  taxNumber: string
  nationalId: string
  email: string
  phone: string
  mobile: string
  currencyCode: string
  openingBalance: string
  openingBalanceSide: BalanceSide
  creditLimit: string
  paymentTermDays: string
  iban: string
  leadSource: string
  leadStatus: string
  notes: string
  isActive: boolean
}

const EMPTY: FormState = {
  contactType: 'company',
  role: 'customer',
  name: '',
  code: '',
  taxOffice: '',
  taxNumber: '',
  nationalId: '',
  email: '',
  phone: '',
  mobile: '',
  currencyCode: 'TRY',
  openingBalance: '0',
  openingBalanceSide: 'debit',
  creditLimit: '0',
  paymentTermDays: '0',
  iban: '',
  leadSource: '',
  leadStatus: '',
  notes: '',
  isActive: true,
}

export function ContactFormScreen() {
  const nav = useNav()
  const { hasPermission } = useAuth()
  const id = nav.current.params?.id ? String(nav.current.params.id) : null
  const editing = !!id
  // When opened from the Adaylar (leads) list the new record defaults to `lead`.
  const roleParam = nav.current.params?.role as ContactRole | undefined
  const isLead = !editing && roleParam === 'lead'
  const title = editing ? 'Cari düzenle' : isLead ? 'Yeni aday' : 'Yeni cari'
  const { submit, busy } = useSubmit()
  const codeRef = React.useRef<CodePrefixInputHandle>(null)

  const existing = useAsync(() => api.contacts.contacts.get(id as string), [id], {
    enabled: editing,
  })

  const fieldDefs = useAsync(() => api.contacts.fields.get('contact'), [])

  const [form, setForm] = React.useState<FormState>(() =>
    roleParam ? { ...EMPTY, role: roleParam } : EMPTY,
  )
  const [attributes, setAttributes] = React.useState<Record<string, unknown>>({})
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))
  const setAttr = (key: string, value: unknown) =>
    setAttributes((a) => ({ ...a, [key]: value }))

  React.useEffect(() => {
    if (existing.data) {
      const d = existing.data
      setForm({
        contactType: d.contactType,
        role: d.role,
        name: d.name,
        code: d.code,
        taxOffice: d.taxOffice ?? '',
        taxNumber: d.taxNumber ?? '',
        nationalId: d.nationalId ?? '',
        email: d.email ?? '',
        phone: d.phone ?? '',
        mobile: d.mobile ?? '',
        currencyCode: d.currencyCode,
        openingBalance: String(d.openingBalance),
        openingBalanceSide: d.openingBalanceSide,
        creditLimit: String(d.creditLimit),
        paymentTermDays: String(d.paymentTermDays),
        iban: d.iban ?? '',
        leadSource: d.leadSource ?? '',
        leadStatus: d.leadStatus ?? '',
        notes: d.notes ?? '',
        isActive: d.isActive,
      })
      setAttributes(d.attributes ?? {})
    }
  }, [existing.data])

  const handleSave = () => {
    if (!form.name.trim()) {
      alert('Cari adı girilmelidir')
      return
    }

    submit(async () => {
      const code = await (codeRef.current?.finalize() ?? Promise.resolve(form.code))
      const payload: CreateContactRequest = {
        contactType: form.contactType,
        role: form.role,
        name: form.name.trim(),
        code: code.trim() || undefined,
        taxOffice: form.taxOffice.trim() || null,
        taxNumber: form.contactType === 'company' ? form.taxNumber.trim() || null : null,
        nationalId: form.contactType === 'individual' ? form.nationalId.trim() || null : null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        mobile: form.mobile.trim() || null,
        currencyCode: form.currencyCode.trim() || 'TRY',
        openingBalance: Number(form.openingBalance) || 0,
        openingBalanceSide: form.openingBalanceSide,
        creditLimit: Number(form.creditLimit) || 0,
        paymentTermDays: Number(form.paymentTermDays) || 0,
        iban: form.iban.trim() || null,
        leadSource: form.leadSource.trim() || null,
        leadStatus: form.leadStatus.trim() || null,
        notes: form.notes.trim() || null,
        isActive: form.isActive,
        attributes,
      }

      if (editing) {
        await api.contacts.contacts.update(id as string, payload)
      } else {
        await api.contacts.contacts.create(payload)
      }
      nav.goBack()
    })
  }

  if (!hasPermission(ContactsPermissions.contactsWrite)) {
    return (
      <Screen header={{ title, onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu sayfada düzenleme yapma yetkiniz yok." />
      </Screen>
    )
  }

  return (
    <Screen
      header={{
        title,
        onBack: nav.goBack,
      }}
      footer={
        !(editing && existing.loading) ? (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Button title="Vazgeç" variant="outline" fullWidth onPress={nav.goBack} disabled={busy} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Kaydet" fullWidth loading={busy} onPress={handleSave} />
            </View>
          </View>
        ) : undefined
      }
    >
      {editing && existing.loading ? (
        <View style={{ flex: 1, padding: 32, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <>
          <Section title="Genel Bilgiler">
            <FormSelect
              label="Tür"
              value={form.contactType}
              onChange={(v) => set('contactType', v)}
              options={TYPE_OPTIONS}
            />
            <FormSelect
              label="Rol"
              value={form.role}
              onChange={(v) => set('role', v)}
              options={ROLE_OPTIONS}
            />
            <Input label="Cari Adı" placeholder="Ünvan veya ad soyad" value={form.name} onChangeText={(v) => set('name', v)} />
            <CodePrefixInput
              ref={codeRef}
              label="Cari Kodu"
              context={CodePrefixContexts.contactsContacts}
              value={form.code}
              onChange={(v) => set('code', v)}
              autoAssign={!editing}
              placeholder="0001"
            />
          </Section>

          <Section title="Vergi Bilgileri">
            <Input label="Vergi Dairesi" value={form.taxOffice} onChangeText={(v) => set('taxOffice', v)} />
            {form.contactType === 'company' ? (
              <Input
                label="Vergi No (VKN)"
                keyboardType="numeric"
                value={form.taxNumber}
                onChangeText={(v) => set('taxNumber', v)}
              />
            ) : (
              <Input
                label="TCKN"
                keyboardType="numeric"
                value={form.nationalId}
                onChangeText={(v) => set('nationalId', v)}
              />
            )}
          </Section>

          <Section title="İletişim">
            <Input label="E-posta" keyboardType="email-address" autoCapitalize="none" value={form.email} onChangeText={(v) => set('email', v)} />
            <Input label="Telefon" keyboardType="phone-pad" value={form.phone} onChangeText={(v) => set('phone', v)} />
            <Input label="Cep" keyboardType="phone-pad" value={form.mobile} onChangeText={(v) => set('mobile', v)} />
          </Section>

          <Section title="Finans">
            <Input label="Para Birimi" autoCapitalize="characters" value={form.currencyCode} onChangeText={(v) => set('currencyCode', v)} />
            <Input
              label="Açılış Bakiyesi"
              keyboardType="numeric"
              placeholder="0.00"
              value={form.openingBalance}
              onChangeText={(v) => set('openingBalance', v)}
            />
            <FormSelect
              label="Açılış Bakiyesi Yönü"
              value={form.openingBalanceSide}
              onChange={(v) => set('openingBalanceSide', v)}
              options={SIDE_OPTIONS}
            />
            <Input
              label="Risk Limiti"
              keyboardType="numeric"
              placeholder="0 = Limitsiz"
              value={form.creditLimit}
              onChangeText={(v) => set('creditLimit', v)}
            />
            <Input
              label="Vade (gün)"
              keyboardType="numeric"
              value={form.paymentTermDays}
              onChangeText={(v) => set('paymentTermDays', v)}
            />
            <Input label="IBAN" autoCapitalize="characters" value={form.iban} onChangeText={(v) => set('iban', v)} />
          </Section>

          <Section title="Aday Bilgileri">
            <Input
              label="Kaynak"
              placeholder="Örn: Web sitesi, Fuar, Referans"
              value={form.leadSource}
              onChangeText={(v) => set('leadSource', v)}
            />
            <Input
              label="Durum"
              placeholder="Örn: Yeni, İletişimde, Teklif verildi"
              value={form.leadStatus}
              onChangeText={(v) => set('leadStatus', v)}
            />
          </Section>

          <Section title="Diğer">
            <FormTextArea label="Notlar" placeholder="Cari hakkında notlar..." value={form.notes} onChangeText={(v) => set('notes', v)} />
            <FormSwitchRow label="Aktif" value={form.isActive} onValueChange={(v) => set('isActive', v)} />
          </Section>

          {fieldDefs.data && fieldDefs.data.fields.length > 0 ? (
            <Section title="Ek Alanlar">
              <CrmAttributeFields fields={fieldDefs.data.fields} values={attributes} onChange={setAttr} />
            </Section>
          ) : null}
        </>
      )}
    </Screen>
  )
}
