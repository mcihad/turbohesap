import * as React from 'react'
import { ActivityIndicator, View } from 'react-native'
import { FinancePermissions, type CreateBankAccountRequest } from '@turbohesap/shared'
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
  bankName: string
  branchName: string
  branchCode: string
  accountNumber: string
  iban: string
  currency: string
  openingBalance: string
  description: string
  isActive: boolean
}

const EMPTY: FormState = {
  name: '',
  bankName: '',
  branchName: '',
  branchCode: '',
  accountNumber: '',
  iban: '',
  currency: 'TRY',
  openingBalance: '0',
  description: '',
  isActive: true,
}

export function BankAccountFormScreen() {
  const nav = useNav()
  const { hasPermission } = useAuth()
  const id = nav.current.params?.id ? String(nav.current.params.id) : null
  const editing = !!id
  const { submit, busy } = useSubmit()

  const existing = useAsync(() => api.finance.bankAccounts.get(id as string), [id], {
    enabled: editing,
  })

  const [form, setForm] = React.useState<FormState>(EMPTY)
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  React.useEffect(() => {
    if (existing.data) {
      setForm({
        name: existing.data.name,
        bankName: existing.data.bankName,
        branchName: existing.data.branchName,
        branchCode: existing.data.branchCode,
        accountNumber: existing.data.accountNumber,
        iban: formatIbanInput(existing.data.iban),
        currency: existing.data.currency,
        openingBalance: String(existing.data.openingBalance),
        description: existing.data.description,
        isActive: existing.data.isActive,
      })
    }
  }, [existing.data])

  const formatIbanInput = (text: string) => {
    let clean = text.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
    if (clean.length > 2 && !clean.startsWith('TR')) {
      clean = 'TR' + clean
    } else if (clean.length === 0) {
      clean = 'TR'
    }
    const parts = []
    if (clean.length > 0) {
      parts.push(clean.substring(0, 4))
    }
    for (let i = 4; i < clean.length; i += 4) {
      parts.push(clean.substring(i, i + 4))
    }
    return parts.slice(0, 7).join(' ') // Max 26 characters: TRxx xxxx xxxx xxxx xxxx xxxx xx
  }

  const handleIbanChange = (text: string) => {
    const formatted = formatIbanInput(text)
    set('iban', formatted)
  }

  const handleSave = () => {
    if (!form.name.trim()) {
      alert('Hesap adı / tanımı girilmelidir')
      return
    }
    if (!form.bankName.trim()) {
      alert('Banka adı girilmelidir')
      return
    }
    const cleanIban = form.iban.replace(/\s/g, '')
    if (cleanIban.length < 26) {
      alert('Geçerli bir IBAN girilmelidir (TR + 24 hane)')
      return
    }

    submit(async () => {
      const payload: CreateBankAccountRequest = {
        name: form.name.trim(),
        bankName: form.bankName.trim(),
        branchName: form.branchName.trim(),
        branchCode: form.branchCode.trim(),
        accountNumber: form.accountNumber.trim(),
        iban: cleanIban,
        currency: form.currency,
        openingBalance: Number(form.openingBalance) || 0,
        description: form.description.trim(),
        isActive: form.isActive,
      }

      if (editing) {
        await api.finance.bankAccounts.update(id as string, payload)
      } else {
        await api.finance.bankAccounts.create(payload)
      }
      nav.goBack()
    })
  }

  if (!hasPermission(FinancePermissions.bankAccountsWrite)) {
    return (
      <Screen header={{ title: editing ? 'Hesabı Düzenle' : 'Yeni Banka Hesabı', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu sayfada düzenleme yapma yetkiniz yok." />
      </Screen>
    )
  }

  return (
    <Screen
      header={{
        title: editing ? 'Hesabı Düzenle' : 'Yeni Banka Hesabı',
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
          <Section title="Hesap Bilgileri">
            <Input label="Hesap Adı / Tanımı" placeholder="Örn: Akbank Ticari Hesabı" value={form.name} onChangeText={(v) => set('name', v)} />
            <Input label="Banka Adı" placeholder="Örn: Akbank" value={form.bankName} onChangeText={(v) => set('bankName', v)} />
            <Input label="Şube Adı" placeholder="Örn: Kadıköy" value={form.branchName} onChangeText={(v) => set('branchName', v)} />
            <Input label="Şube Kodu" placeholder="Örn: 123" value={form.branchCode} onChangeText={(v) => set('branchCode', v)} />
            <Input label="Hesap Numarası" placeholder="Örn: 456789" value={form.accountNumber} onChangeText={(v) => set('accountNumber', v)} />
            <Input label="IBAN" placeholder="TR99 0006 ..." value={form.iban} onChangeText={handleIbanChange} maxLength={32} />
          </Section>

          <Section title="Finansal Tanımlar">
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

            <FormTextArea label="Açıklama" placeholder="Banka hesabı detayları..." value={form.description} onChangeText={(v) => set('description', v)} />

            <FormSwitchRow label="Aktif" value={form.isActive} onValueChange={(v) => set('isActive', v)} />
          </Section>
        </>
      )}
    </Screen>
  )
}
