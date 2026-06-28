import * as React from 'react'
import { ActivityIndicator, View } from 'react-native'
import {
  ADDRESS_TYPES,
  ContactsPermissions,
  type AddressType,
  type CreateContactAddressRequest,
} from '@turbohesap/shared'
import {
  Button,
  EmptyState,
  FormSelect,
  FormSwitchRow,
  Input,
  Screen,
  Section,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { confirmDestructive, useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'

const ADDRESS_TYPE_LABELS: Record<AddressType, string> = {
  billing: 'Fatura',
  shipping: 'Sevkiyat',
  office: 'Ofis',
  other: 'Diğer',
}

const ADDRESS_TYPE_OPTIONS = ADDRESS_TYPES.map((a) => ({ value: a, label: ADDRESS_TYPE_LABELS[a] }))

interface FormState {
  addressType: AddressType
  title: string
  line1: string
  line2: string
  district: string
  city: string
  postalCode: string
  country: string
  phone: string
  isPrimaryBilling: boolean
  isPrimaryShipping: boolean
}

const EMPTY: FormState = {
  addressType: 'billing',
  title: '',
  line1: '',
  line2: '',
  district: '',
  city: '',
  postalCode: '',
  country: 'Türkiye',
  phone: '',
  isPrimaryBilling: false,
  isPrimaryShipping: false,
}

export function ContactAddressFormScreen() {
  const nav = useNav()
  const { hasPermission } = useAuth()
  const contactId = String(nav.current.params?.contactId ?? '')
  const id = nav.current.params?.id ? String(nav.current.params.id) : null
  const editing = !!id
  const { submit, busy } = useSubmit()

  const existing = useAsync(() => api.contacts.addresses.get(id as string), [id], {
    enabled: editing,
  })

  const [form, setForm] = React.useState<FormState>(EMPTY)
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  React.useEffect(() => {
    if (existing.data) {
      const d = existing.data
      setForm({
        addressType: d.addressType,
        title: d.title ?? '',
        line1: d.line1,
        line2: d.line2 ?? '',
        district: d.district ?? '',
        city: d.city,
        postalCode: d.postalCode ?? '',
        country: d.country,
        phone: d.phone ?? '',
        isPrimaryBilling: d.isPrimaryBilling,
        isPrimaryShipping: d.isPrimaryShipping,
      })
    }
  }, [existing.data])

  const handleSave = () => {
    if (!form.line1.trim()) {
      alert('Adres satırı girilmelidir')
      return
    }
    if (!form.city.trim()) {
      alert('İl girilmelidir')
      return
    }

    submit(async () => {
      const fields = {
        addressType: form.addressType,
        title: form.title.trim() || null,
        line1: form.line1.trim(),
        line2: form.line2.trim() || null,
        district: form.district.trim() || null,
        city: form.city.trim(),
        postalCode: form.postalCode.trim() || null,
        country: form.country.trim() || 'Türkiye',
        phone: form.phone.trim() || null,
        isPrimaryBilling: form.isPrimaryBilling,
        isPrimaryShipping: form.isPrimaryShipping,
      }

      if (editing) {
        await api.contacts.addresses.update(id as string, fields)
      } else {
        await api.contacts.addresses.create({ contactId, ...fields } as CreateContactAddressRequest)
      }
      nav.goBack()
    })
  }

  const handleDelete = () => {
    if (!id) return
    confirmDestructive('Adresi sil', 'Bu adres silinsin mi?', () =>
      submit(() => api.contacts.addresses.remove(id), { onSuccess: nav.goBack }),
    )
  }

  if (!hasPermission(ContactsPermissions.contactsWrite)) {
    return (
      <Screen header={{ title: editing ? 'Adres düzenle' : 'Yeni adres', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu sayfada düzenleme yapma yetkiniz yok." />
      </Screen>
    )
  }

  return (
    <Screen
      header={{
        title: editing ? 'Adres düzenle' : 'Yeni adres',
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
          <Section title="Adres Bilgileri">
            <FormSelect
              label="Adres Türü"
              value={form.addressType}
              onChange={(v) => set('addressType', v)}
              options={ADDRESS_TYPE_OPTIONS}
            />
            <Input label="Başlık" placeholder="Örn: Merkez ofis" value={form.title} onChangeText={(v) => set('title', v)} />
            <Input label="Adres Satırı 1" value={form.line1} onChangeText={(v) => set('line1', v)} />
            <Input label="Adres Satırı 2" value={form.line2} onChangeText={(v) => set('line2', v)} />
            <Input label="İlçe" value={form.district} onChangeText={(v) => set('district', v)} />
            <Input label="İl" value={form.city} onChangeText={(v) => set('city', v)} />
            <Input label="Posta Kodu" keyboardType="numeric" value={form.postalCode} onChangeText={(v) => set('postalCode', v)} />
            <Input label="Ülke" value={form.country} onChangeText={(v) => set('country', v)} />
            <Input label="Telefon" keyboardType="phone-pad" value={form.phone} onChangeText={(v) => set('phone', v)} />
          </Section>

          <Section title="Tercihler">
            <FormSwitchRow label="Varsayılan fatura adresi" value={form.isPrimaryBilling} onValueChange={(v) => set('isPrimaryBilling', v)} />
            <FormSwitchRow label="Varsayılan sevkiyat adresi" value={form.isPrimaryShipping} onValueChange={(v) => set('isPrimaryShipping', v)} />
          </Section>

          {editing ? (
            <Button
              title="Adresi sil"
              variant="outline"
              icon="trash-2"
              fullWidth
              loading={busy}
              onPress={handleDelete}
            />
          ) : null}
        </>
      )}
    </Screen>
  )
}
