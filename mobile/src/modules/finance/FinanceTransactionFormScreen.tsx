import * as React from 'react'
import { ActivityIndicator, View } from 'react-native'
import { FinancePermissions, type CreateFinanceTransactionRequest } from '@turbohesap/shared'
import {
  Button,
  EmptyState,
  FormSelect,
  FormDatePicker,
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
import { useTheme } from '../../theme/theme-context'

interface FormState {
  type: 'in' | 'out'
  amount: string
  date: string
  description: string
}

const EMPTY = (): FormState => ({
  type: 'in',
  amount: '',
  date: new Date().toISOString().substring(0, 16),
  description: '',
})

export function FinanceTransactionFormScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const id = nav.current.params?.id ? String(nav.current.params.id) : null
  const cashAccountId = nav.current.params?.cashAccountId ? String(nav.current.params.cashAccountId) : null
  const bankAccountId = nav.current.params?.bankAccountId ? String(nav.current.params.bankAccountId) : null
  
  const editing = !!id
  const { submit, busy } = useSubmit()

  const existing = useAsync(() => api.finance.transactions.get(id as string), [id], {
    enabled: editing,
  })

  const [form, setForm] = React.useState<FormState>(EMPTY())
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  React.useEffect(() => {
    if (existing.data) {
      setForm({
        type: existing.data.type,
        amount: String(existing.data.amount),
        date: existing.data.date.substring(0, 16),
        description: existing.data.description,
      })
    }
  }, [existing.data])

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
      const payload: CreateFinanceTransactionRequest = {
        cashAccountId: cashAccountId || null,
        bankAccountId: bankAccountId || null,
        type: form.type,
        amount: Number(form.amount) || 0,
        date: new Date(form.date).toISOString(),
        description: form.description.trim(),
      }

      if (editing) {
        await api.finance.transactions.update(id as string, payload)
      } else {
        await api.finance.transactions.create(payload)
      }
      nav.goBack()
    })
  }

  const handleDelete = () => {
    confirmDestructive(
      'İşlemi Sil',
      'Bu finansal işlem kaydı kalıcı olarak silinecektir. Emin misiniz?',
      async () => {
        await submit(() => api.finance.transactions.remove(id as string))
        nav.goBack()
      }
    )
  }

  if (!hasPermission(FinancePermissions.transactionsWrite)) {
    return (
      <Screen header={{ title: editing ? 'İşlemi Düzenle' : 'Yeni İşlem', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu işlem üzerinde değişiklik yapma yetkiniz yok." />
      </Screen>
    )
  }

  return (
    <Screen
      header={{
        title: editing ? 'İşlemi Düzenle' : 'Yeni İşlem',
        onBack: nav.goBack,
      }}
      footer={
        !(editing && existing.loading) ? (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Button title="Vazgeç" variant="outline" fullWidth onPress={nav.goBack} disabled={busy} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title={editing ? 'Kaydet' : 'Kaydet'} fullWidth loading={busy} onPress={handleSave} />
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
          <Section title="İşlem Detayları">
            <FormSelect
              label="İşlem Yönü"
              value={form.type}
              onChange={(v: 'in' | 'out') => set('type', v)}
              options={[
                { value: 'in', label: 'Giriş (Tahsilat)' },
                { value: 'out', label: 'Çıkış (Ödeme)' },
              ]}
            />

            <Input
              label="Tutar"
              keyboardType="numeric"
              placeholder="0.00"
              value={form.amount}
              onChangeText={(v) => set('amount', v)}
            />

            <FormDatePicker
              label="İşlem Tarihi"
              value={form.date}
              onChange={(v) => set('date', v)}
              mode="datetime"
            />

            <FormTextArea
              label="Açıklama"
              placeholder="İşlem detay açıklaması..."
              value={form.description}
              onChangeText={(v) => set('description', v)}
            />
          </Section>

          {editing ? (
            <Button
              title="İşlemi sil"
              variant="outline"
              icon="trash-2"
              fullWidth
              loading={busy}
              onPress={handleDelete}
              style={{ marginTop: t.spacing[4], marginBottom: t.spacing[4] }}
            />
          ) : null}
        </>
      )}
    </Screen>
  )
}
