// ChannelFormScreen — create or edit a sales channel. Edit mode loads the record
// (params.id), submits via the shared client, and returns to the previous screen
// (which remounts and refetches). Gated by sales.channels.write.

import * as React from 'react'

import {
  SALES_CHANNEL_TYPES,
  SalesPermissions,
  type CreateSalesChannelRequest,
  type SalesChannelType,
} from '@turbohesap/shared'

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
import { SALES_CHANNEL_TYPE_LABELS } from './labels'

interface FormState {
  code: string
  name: string
  type: SalesChannelType
  description: string
  isActive: boolean
  isDefault: boolean
  sortOrder: string
  commissionRate: string
  currency: string
  website: string
  contactName: string
  contactTitle: string
  contactPhone: string
  contactEmail: string
  country: string
  city: string
  district: string
  addressLine: string
  postalCode: string
}

const EMPTY: FormState = {
  code: '',
  name: '',
  type: 'retail',
  description: '',
  isActive: true,
  isDefault: false,
  sortOrder: '0',
  commissionRate: '',
  currency: 'TRY',
  website: '',
  contactName: '',
  contactTitle: '',
  contactPhone: '',
  contactEmail: '',
  country: 'Türkiye',
  city: '',
  district: '',
  addressLine: '',
  postalCode: '',
}

export function ChannelFormScreen() {
  const nav = useNav()
  const { hasPermission } = useAuth()
  const id = nav.current.params?.id ? String(nav.current.params.id) : null
  const editing = !!id
  const { submit, busy } = useSubmit()

  const existing = useAsync(() => api.sales.channels.get(id as string), [id], {
    enabled: editing,
  })

  const [form, setForm] = React.useState<FormState>(EMPTY)
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  // Seed the form once the record loads (edit mode).
  React.useEffect(() => {
    const c = existing.data
    if (!c) return
    setForm({
      code: c.code,
      name: c.name,
      type: c.type,
      description: c.description,
      isActive: c.isActive,
      isDefault: c.isDefault,
      sortOrder: String(c.sortOrder),
      commissionRate: c.commissionRate == null ? '' : String(c.commissionRate),
      currency: c.currency,
      website: c.website,
      contactName: c.contactName,
      contactTitle: c.contactTitle,
      contactPhone: c.contactPhone,
      contactEmail: c.contactEmail,
      country: c.country,
      city: c.city,
      district: c.district,
      addressLine: c.addressLine,
      postalCode: c.postalCode,
    })
  }, [existing.data])

  if (!hasPermission(SalesPermissions.channelsWrite)) {
    return (
      <Screen header={{ title: 'Satış kanalı', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu işlem için izniniz yok." />
      </Screen>
    )
  }

  function save() {
    const payload: CreateSalesChannelRequest = {
      code: form.code.trim(),
      name: form.name.trim(),
      type: form.type,
      description: form.description,
      isActive: form.isActive,
      isDefault: form.isDefault,
      sortOrder: Number(form.sortOrder) || 0,
      commissionRate: form.commissionRate.trim() === '' ? null : Number(form.commissionRate),
      currency: form.currency,
      website: form.website,
      contactName: form.contactName,
      contactTitle: form.contactTitle,
      contactPhone: form.contactPhone,
      contactEmail: form.contactEmail,
      country: form.country,
      city: form.city,
      district: form.district,
      addressLine: form.addressLine,
      postalCode: form.postalCode,
    }
    void submit(
      async () => {
        if (editing) await api.sales.channels.update(id as string, payload)
        else await api.sales.channels.create(payload)
      },
      { onSuccess: nav.goBack },
    )
  }

  const canSave = form.code.trim() !== '' && form.name.trim() !== ''

  return (
    <Screen
      header={{ title: editing ? 'Kanalı düzenle' : 'Yeni satış kanalı', onBack: nav.goBack }}
      footer={
        <Button title={editing ? 'Kaydet' : 'Oluştur'} fullWidth loading={busy} disabled={!canSave} onPress={save} />
      }
    >
      <Section title="Genel">
        <Input label="Kod" value={form.code} editable={!editing} autoCapitalize="characters" onChangeText={(v) => set('code', v)} placeholder="WEB" />
        <Input label="Ad" value={form.name} onChangeText={(v) => set('name', v)} placeholder="Web Mağazası" />
        <FormSelect
          label="Tür"
          value={form.type}
          onChange={(v) => set('type', v)}
          options={SALES_CHANNEL_TYPES.map((tp) => ({ value: tp, label: SALES_CHANNEL_TYPE_LABELS[tp] }))}
        />
        <Input label="Para birimi" value={form.currency} onChangeText={(v) => set('currency', v)} placeholder="TRY" />
        <Input label="Komisyon (%)" value={form.commissionRate} onChangeText={(v) => set('commissionRate', v)} keyboardType="decimal-pad" placeholder="örn. 12.5" />
        <Input label="Sıra" value={form.sortOrder} onChangeText={(v) => set('sortOrder', v)} keyboardType="number-pad" />
        <Input label="Web sitesi" value={form.website} onChangeText={(v) => set('website', v)} autoCapitalize="none" placeholder="https://…" />
        <FormTextArea label="Açıklama" value={form.description} onChangeText={(v) => set('description', v)} />
        <FormSwitchRow label="Aktif" value={form.isActive} onValueChange={(v) => set('isActive', v)} />
        <FormSwitchRow label="Varsayılan kanal" value={form.isDefault} onValueChange={(v) => set('isDefault', v)} />
      </Section>

      <Section title="İletişim ve yetkili">
        <Input label="Yetkili adı" value={form.contactName} onChangeText={(v) => set('contactName', v)} />
        <Input label="Unvanı" value={form.contactTitle} onChangeText={(v) => set('contactTitle', v)} />
        <Input label="Telefon" value={form.contactPhone} onChangeText={(v) => set('contactPhone', v)} keyboardType="phone-pad" />
        <Input label="E-posta" value={form.contactEmail} onChangeText={(v) => set('contactEmail', v)} keyboardType="email-address" autoCapitalize="none" />
      </Section>

      <Section title="Adres">
        <Input label="Ülke" value={form.country} onChangeText={(v) => set('country', v)} />
        <Input label="İl" value={form.city} onChangeText={(v) => set('city', v)} />
        <Input label="İlçe" value={form.district} onChangeText={(v) => set('district', v)} />
        <Input label="Posta kodu" value={form.postalCode} onChangeText={(v) => set('postalCode', v)} keyboardType="number-pad" />
        <FormTextArea label="Açık adres" value={form.addressLine} onChangeText={(v) => set('addressLine', v)} />
      </Section>
    </Screen>
  )
}
