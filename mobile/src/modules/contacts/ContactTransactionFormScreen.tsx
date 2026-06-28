import * as React from 'react'
import { View } from 'react-native'
import {
  CONTACT_DOCUMENT_TYPES,
  ContactsPermissions,
  type BalanceSide,
  type ContactDocumentType,
  type CreateContactTransactionRequest,
} from '@turbohesap/shared'
import {
  Button,
  EmptyState,
  FormDatePicker,
  FormSelect,
  FormTextArea,
  Input,
  Screen,
  Section,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'

const DOC_TYPE_LABELS: Record<ContactDocumentType, string> = {
  invoice: 'Fatura',
  payment: 'Ödeme',
  receipt: 'Tahsilat',
  opening: 'Açılış',
  adjustment: 'Düzeltme',
  return: 'İade',
}

const DOC_TYPE_OPTIONS = CONTACT_DOCUMENT_TYPES.map((d) => ({ value: d, label: DOC_TYPE_LABELS[d] }))

const DIRECTION_OPTIONS: { value: BalanceSide; label: string }[] = [
  { value: 'debit', label: 'Borç' },
  { value: 'credit', label: 'Alacak' },
]

interface FormState {
  date: string
  documentType: ContactDocumentType
  direction: BalanceSide
  amount: string
  documentNo: string
  description: string
  dueDate: string
}

const EMPTY = (): FormState => ({
  date: new Date().toISOString(),
  documentType: 'invoice',
  direction: 'debit',
  amount: '',
  documentNo: '',
  description: '',
  dueDate: '',
})

export function ContactTransactionFormScreen() {
  const nav = useNav()
  const { hasPermission } = useAuth()
  const contactId = String(nav.current.params?.contactId ?? '')
  const { submit, busy } = useSubmit()

  const [form, setForm] = React.useState<FormState>(EMPTY())
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const handleSave = () => {
    if (!form.amount || Number(form.amount) <= 0) {
      alert('Geçerli bir tutar girilmelidir')
      return
    }
    if (!form.date) {
      alert('Tarih seçilmelidir')
      return
    }

    submit(async () => {
      const amount = Number(form.amount) || 0
      const payload: CreateContactTransactionRequest = {
        contactId,
        date: new Date(form.date).toISOString(),
        documentType: form.documentType,
        debit: form.direction === 'debit' ? amount : 0,
        credit: form.direction === 'credit' ? amount : 0,
        documentNo: form.documentNo.trim() || null,
        description: form.description.trim() || null,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
      }

      await api.contacts.transactions.create(payload)
      nav.goBack()
    })
  }

  if (!hasPermission(ContactsPermissions.transactionsWrite)) {
    return (
      <Screen header={{ title: 'Yeni Hareket', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu işlem üzerinde değişiklik yapma yetkiniz yok." />
      </Screen>
    )
  }

  return (
    <Screen
      header={{
        title: 'Yeni Hareket',
        onBack: nav.goBack,
      }}
      footer={
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Button title="Vazgeç" variant="outline" fullWidth onPress={nav.goBack} disabled={busy} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Kaydet" fullWidth loading={busy} onPress={handleSave} />
          </View>
        </View>
      }
    >
      <Section title="Hareket Detayları">
        <FormDatePicker label="Tarih" value={form.date} onChange={(v) => set('date', v)} mode="date" />

        <FormSelect
          label="Belge Türü"
          value={form.documentType}
          onChange={(v) => set('documentType', v)}
          options={DOC_TYPE_OPTIONS}
        />

        <FormSelect
          label="Yön"
          value={form.direction}
          onChange={(v) => set('direction', v)}
          options={DIRECTION_OPTIONS}
        />

        <Input
          label="Tutar"
          keyboardType="numeric"
          placeholder="0.00"
          value={form.amount}
          onChangeText={(v) => set('amount', v)}
        />

        <Input label="Belge No" value={form.documentNo} onChangeText={(v) => set('documentNo', v)} />

        <FormTextArea
          label="Açıklama"
          placeholder="Hareket açıklaması..."
          value={form.description}
          onChangeText={(v) => set('description', v)}
        />

        <FormDatePicker label="Vade Tarihi" value={form.dueDate} onChange={(v) => set('dueDate', v)} mode="date" />
      </Section>
    </Screen>
  )
}
