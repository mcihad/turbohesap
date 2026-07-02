// InstrumentFormScreen — create/edit a çek/senet. CRUD only works while
// status === 'open' (guarded on the detail screen; the backend re-checks).
// No document/evrak field here — `documentId` is fully system-managed
// (a linked Evrak row is created automatically on the backend).

import * as React from 'react'
import { ActivityIndicator, View } from 'react-native'
import {
  FinancePermissions,
  INSTRUMENT_DIRECTIONS,
  INSTRUMENT_TYPES,
  type CreateFinancialInstrumentRequest,
  type InstrumentDirection,
  type InstrumentType,
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
  SegmentedControl,
  type SegmentOption,
  type SelectOption,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { INSTRUMENT_DIRECTION_LABELS, INSTRUMENT_TYPE_LABELS } from './instrument-labels'

const TYPE_OPTIONS: SegmentOption<InstrumentType>[] = INSTRUMENT_TYPES.map((ty) => ({
  value: ty,
  label: INSTRUMENT_TYPE_LABELS[ty],
}))
const DIRECTION_OPTIONS: SegmentOption<InstrumentDirection>[] = INSTRUMENT_DIRECTIONS.map((d) => ({
  value: d,
  label: INSTRUMENT_DIRECTION_LABELS[d],
}))
const CURRENCY_OPTIONS: SelectOption<string>[] = [
  { value: 'TRY', label: 'TRY (₺)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
]

interface FormState {
  instrumentType: InstrumentType
  direction: InstrumentDirection
  contactId: string
  amount: string
  currencyCode: string
  issueDate: string
  dueDate: string
  instrumentNo: string
  bankName: string
  bankBranch: string
  accountNo: string
  drawerName: string
  notes: string
}

const EMPTY = (): FormState => ({
  instrumentType: 'check',
  direction: 'received',
  contactId: '',
  amount: '',
  currencyCode: 'TRY',
  issueDate: new Date().toISOString(),
  dueDate: new Date().toISOString(),
  instrumentNo: '',
  bankName: '',
  bankBranch: '',
  accountNo: '',
  drawerName: '',
  notes: '',
})

export function InstrumentFormScreen() {
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canWrite = hasPermission(FinancePermissions.instrumentsWrite)
  const id = nav.current.params?.id ? String(nav.current.params.id) : null
  const editing = !!id
  const { submit, busy } = useSubmit()

  const existing = useAsync(() => api.finance.instruments.get(id as string), [id], { enabled: editing })
  const contacts = useAsync(() => api.contacts.contacts.list(), [])

  const [form, setForm] = React.useState<FormState>(EMPTY())
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }))

  React.useEffect(() => {
    const d = existing.data
    if (!d) return
    if (d.status !== 'open') {
      // Non-open records aren't editable — bounce back to the detail screen.
      nav.navigate('finance.instruments.detail', { id: d.id }, d.contactName ?? 'Çek/Senet')
      return
    }
    setForm({
      instrumentType: d.instrumentType,
      direction: d.direction,
      contactId: d.contactId,
      amount: String(d.amount),
      currencyCode: d.currencyCode,
      issueDate: d.issueDate,
      dueDate: d.dueDate,
      instrumentNo: d.instrumentNo ?? '',
      bankName: d.bankName ?? '',
      bankBranch: d.bankBranch ?? '',
      accountNo: d.accountNo ?? '',
      drawerName: d.drawerName ?? '',
      notes: d.notes ?? '',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing.data])

  const contactOptions = React.useMemo<SelectOption<string>[]>(
    () => [{ value: '', label: 'Cari seçin' }, ...(contacts.data ?? []).map((c) => ({ value: c.id, label: c.name }))],
    [contacts.data],
  )

  const handleSave = () => {
    if (!form.contactId) {
      alert('Cari seçilmelidir')
      return
    }
    if (!form.amount || Number(form.amount) <= 0) {
      alert('Geçerli bir tutar girilmelidir')
      return
    }
    if (!form.issueDate || !form.dueDate) {
      alert('Düzenleme ve vade tarihleri seçilmelidir')
      return
    }

    submit(async () => {
      const base = {
        contactId: form.contactId,
        amount: Number(form.amount) || 0,
        currencyCode: form.currencyCode,
        issueDate: form.issueDate,
        dueDate: form.dueDate,
        instrumentNo: form.instrumentNo.trim() || undefined,
        bankName: form.instrumentType === 'check' ? form.bankName.trim() || null : null,
        bankBranch: form.instrumentType === 'check' ? form.bankBranch.trim() || null : null,
        accountNo: form.instrumentType === 'check' ? form.accountNo.trim() || null : null,
        drawerName: form.drawerName.trim() || null,
        notes: form.notes.trim() || null,
      }

      if (editing) {
        await api.finance.instruments.update(id as string, base)
        nav.navigate('finance.instruments.detail', { id }, form.contactId)
      } else {
        const payload: CreateFinancialInstrumentRequest = {
          instrumentType: form.instrumentType,
          direction: form.direction,
          ...base,
        }
        const created = await api.finance.instruments.create(payload)
        nav.navigate('finance.instruments.detail', { id: created.id }, created.contactName ?? 'Çek/Senet')
      }
    })
  }

  if (!canWrite) {
    return (
      <Screen header={{ title: editing ? 'Çek/Senet Düzenle' : 'Yeni Çek/Senet', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu sayfada düzenleme yapma yetkiniz yok." />
      </Screen>
    )
  }

  const loadingExisting = editing && existing.loading

  return (
    <Screen
      header={{ title: editing ? 'Çek/Senet Düzenle' : 'Yeni Çek/Senet', onBack: nav.goBack }}
      footer={
        !loadingExisting ? (
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
      {loadingExisting ? (
        <View style={{ flex: 1, padding: 32, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <>
          <Section title="Genel Bilgiler">
            {editing ? (
              // instrumentType/direction can't be changed once created (the backend
              // update DTO omits them) — show read-only.
              <Input
                label="Tür / Yön"
                value={`${INSTRUMENT_TYPE_LABELS[form.instrumentType]} · ${INSTRUMENT_DIRECTION_LABELS[form.direction]}`}
                editable={false}
              />
            ) : (
              <>
                <SegmentedControl options={TYPE_OPTIONS} value={form.instrumentType} onChange={(v) => set('instrumentType', v)} />
                <SegmentedControl options={DIRECTION_OPTIONS} value={form.direction} onChange={(v) => set('direction', v)} />
              </>
            )}

            <FormSelect label="Cari" value={form.contactId} options={contactOptions} onChange={(v) => set('contactId', v)} />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 2 }}>
                <Input
                  label="Tutar"
                  keyboardType="numeric"
                  placeholder="0.00"
                  value={form.amount}
                  onChangeText={(v) => set('amount', v)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <FormSelect label="Para Birimi" value={form.currencyCode} options={CURRENCY_OPTIONS} onChange={(v) => set('currencyCode', v)} />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <FormDatePicker label="Düzenleme Tarihi" value={form.issueDate} onChange={(v) => set('issueDate', v)} mode="date" />
              </View>
              <View style={{ flex: 1 }}>
                <FormDatePicker label="Vade Tarihi" value={form.dueDate} onChange={(v) => set('dueDate', v)} mode="date" />
              </View>
            </View>

            <Input
              label="Çek/Senet No"
              placeholder="Opsiyonel"
              value={form.instrumentNo}
              onChangeText={(v) => set('instrumentNo', v)}
            />
          </Section>

          {form.instrumentType === 'check' ? (
            <Section title="Banka Bilgileri">
              <Input label="Banka" value={form.bankName} onChangeText={(v) => set('bankName', v)} />
              <Input label="Şube" value={form.bankBranch} onChangeText={(v) => set('bankBranch', v)} />
              <Input label="Hesap No" value={form.accountNo} onChangeText={(v) => set('accountNo', v)} />
            </Section>
          ) : null}

          <Section title="Diğer">
            <Input label="Keşideci" placeholder="Opsiyonel" value={form.drawerName} onChangeText={(v) => set('drawerName', v)} />
            <FormTextArea label="Notlar" placeholder="Opsiyonel notlar…" value={form.notes} onChangeText={(v) => set('notes', v)} />
          </Section>
        </>
      )}
    </Screen>
  )
}
