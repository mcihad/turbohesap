import * as React from 'react'
import { ActivityIndicator, View } from 'react-native'
import { FinancePermissions, type CreateCashAccountRequest } from '@turbohesap/shared'
import {
  Button,
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

interface FormState {
  name: string
  currency: string
  openingBalance: string
  description: string
  isActive: boolean
}

const EMPTY: FormState = {
  name: '',
  currency: 'TRY',
  openingBalance: '0',
  description: '',
  isActive: true,
}

export function CashAccountFormScreen() {
  const nav = useNav()
  const { hasPermission } = useAuth()
  const id = nav.current.params?.id ? String(nav.current.params.id) : null
  const editing = !!id
  const { submit, busy } = useSubmit()

  const existing = useAsync(() => api.finance.cashAccounts.get(id as string), [id], {
    enabled: editing,
  })

  const [form, setForm] = React.useState<FormState>(EMPTY)
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  React.useEffect(() => {
    if (existing.data) {
      setForm({
        name: existing.data.name,
        currency: existing.data.currency,
        openingBalance: String(existing.data.openingBalance),
        description: existing.data.description,
        isActive: existing.data.isActive,
      })
    }
  }, [existing.data])

  const handleSave = () => {
    if (!form.name.trim()) {
      alert('Kasa adı girilmelidir')
      return
    }

    submit(async () => {
      const payload: CreateCashAccountRequest = {
        name: form.name.trim(),
        currency: form.currency,
        openingBalance: Number(form.openingBalance) || 0,
        description: form.description.trim(),
        isActive: form.isActive,
      }

      if (editing) {
        await api.finance.cashAccounts.update(id as string, payload)
      } else {
        await api.finance.cashAccounts.create(payload)
      }
      nav.goBack()
    })
  }

  if (!hasPermission(FinancePermissions.cashAccountsWrite)) {
    return (
      <Screen header={{ title: editing ? 'Kasayı Düzenle' : 'Yeni Kasa', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu sayfada düzenleme yapma yetkiniz yok." />
      </Screen>
    )
  }

  return (
    <Screen
      header={{
        title: editing ? 'Kasayı Düzenle' : 'Yeni Kasa',
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
          <Section title="Genel Bilgiler">
            <Input label="Kasa Adı" placeholder="Örn: Merkez TL Kasası" value={form.name} onChangeText={(v) => set('name', v)} />
            
            {editing ? (
              <Input label="Para Birimi" value={form.currency} editable={false} />
            ) : (
              <FormSelect
                label="Para Birimi"
                value={form.currency}
                onChange={(v: string) => set('currency', v)}
                options={[
                  { value: 'TRY', label: 'TRY (₺)' },
                  { value: 'USD', label: 'USD ($)' },
                  { value: 'EUR', label: 'EUR (€)' },
                  { value: 'GBP', label: 'GBP (£)' },
                ]}
              />
            )}

            <Input
              label="Açılış Tutarı"
              keyboardType="numeric"
              placeholder="0.00"
              value={form.openingBalance}
              onChangeText={(v) => set('openingBalance', v)}
              editable={!editing}
            />

            <FormTextArea label="Açıklama" placeholder="Kasa detayları..." value={form.description} onChangeText={(v) => set('description', v)} />

            <FormSwitchRow label="Aktif" value={form.isActive} onValueChange={(v) => set('isActive', v)} />
          </Section>
        </>
      )}
    </Screen>
  )
}
