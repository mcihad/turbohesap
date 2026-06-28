import * as React from 'react'
import { ActivityIndicator, View } from 'react-native'
import {
  ContactsPermissions,
  type CreateContactPersonRequest,
} from '@turbohesap/shared'
import {
  Button,
  EmptyState,
  FormSwitchRow,
  FormTextArea,
  Input,
  Screen,
  Section,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { confirmDestructive, useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'

interface FormState {
  firstName: string
  lastName: string
  title: string
  department: string
  email: string
  phone: string
  mobile: string
  isPrimary: boolean
  notes: string
}

const EMPTY: FormState = {
  firstName: '',
  lastName: '',
  title: '',
  department: '',
  email: '',
  phone: '',
  mobile: '',
  isPrimary: false,
  notes: '',
}

export function ContactPersonFormScreen() {
  const nav = useNav()
  const { hasPermission } = useAuth()
  const contactId = String(nav.current.params?.contactId ?? '')
  const id = nav.current.params?.id ? String(nav.current.params.id) : null
  const editing = !!id
  const { submit, busy } = useSubmit()

  const existing = useAsync(() => api.contacts.persons.get(id as string), [id], {
    enabled: editing,
  })

  const [form, setForm] = React.useState<FormState>(EMPTY)
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  React.useEffect(() => {
    if (existing.data) {
      const d = existing.data
      setForm({
        firstName: d.firstName,
        lastName: d.lastName,
        title: d.title ?? '',
        department: d.department ?? '',
        email: d.email ?? '',
        phone: d.phone ?? '',
        mobile: d.mobile ?? '',
        isPrimary: d.isPrimary,
        notes: d.notes ?? '',
      })
    }
  }, [existing.data])

  const handleSave = () => {
    if (!form.firstName.trim()) {
      alert('Ad girilmelidir')
      return
    }

    submit(async () => {
      const fields = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        title: form.title.trim() || null,
        department: form.department.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        mobile: form.mobile.trim() || null,
        isPrimary: form.isPrimary,
        notes: form.notes.trim() || null,
      }

      if (editing) {
        await api.contacts.persons.update(id as string, fields)
      } else {
        await api.contacts.persons.create({ contactId, ...fields } as CreateContactPersonRequest)
      }
      nav.goBack()
    })
  }

  const handleDelete = () => {
    if (!id) return
    confirmDestructive('Kişiyi sil', 'Bu kişi silinsin mi?', () =>
      submit(() => api.contacts.persons.remove(id), { onSuccess: nav.goBack }),
    )
  }

  if (!hasPermission(ContactsPermissions.contactsWrite)) {
    return (
      <Screen header={{ title: editing ? 'Kişi düzenle' : 'Yeni kişi', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu sayfada düzenleme yapma yetkiniz yok." />
      </Screen>
    )
  }

  return (
    <Screen
      header={{
        title: editing ? 'Kişi düzenle' : 'Yeni kişi',
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
          <Section title="Kişi Bilgileri">
            <Input label="Ad" value={form.firstName} onChangeText={(v) => set('firstName', v)} />
            <Input label="Soyad" value={form.lastName} onChangeText={(v) => set('lastName', v)} />
            <Input label="Görev" placeholder="Örn: Satın alma müdürü" value={form.title} onChangeText={(v) => set('title', v)} />
            <Input label="Departman" value={form.department} onChangeText={(v) => set('department', v)} />
          </Section>

          <Section title="İletişim">
            <Input label="E-posta" keyboardType="email-address" autoCapitalize="none" value={form.email} onChangeText={(v) => set('email', v)} />
            <Input label="Telefon" keyboardType="phone-pad" value={form.phone} onChangeText={(v) => set('phone', v)} />
            <Input label="Cep" keyboardType="phone-pad" value={form.mobile} onChangeText={(v) => set('mobile', v)} />
          </Section>

          <Section title="Diğer">
            <FormSwitchRow label="Birincil kişi" value={form.isPrimary} onValueChange={(v) => set('isPrimary', v)} />
            <FormTextArea label="Notlar" placeholder="Kişi hakkında notlar..." value={form.notes} onChangeText={(v) => set('notes', v)} />
          </Section>

          {editing ? (
            <Button
              title="Kişiyi sil"
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
