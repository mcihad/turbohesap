// BranchFormScreen — create or edit a branch with all address/contact/manager/
// tax fields. Gated by org.branches.write. openingDate is entered as YYYY-MM-DD.

import * as React from 'react'

import {
  BRANCH_TYPES,
  OrgPermissions,
  type BranchType,
  type CreateBranchRequest,
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
import { BRANCH_TYPE_LABELS } from './labels'

interface FormState {
  code: string
  name: string
  type: BranchType
  description: string
  isActive: boolean
  phone: string
  secondaryPhone: string
  fax: string
  email: string
  website: string
  country: string
  city: string
  district: string
  neighborhood: string
  addressLine: string
  postalCode: string
  latitude: string
  longitude: string
  managerName: string
  managerTitle: string
  managerPhone: string
  managerEmail: string
  taxOffice: string
  taxNumber: string
  openingDate: string
}

const EMPTY: FormState = {
  code: '',
  name: '',
  type: 'branch',
  description: '',
  isActive: true,
  phone: '',
  secondaryPhone: '',
  fax: '',
  email: '',
  website: '',
  country: 'Türkiye',
  city: '',
  district: '',
  neighborhood: '',
  addressLine: '',
  postalCode: '',
  latitude: '',
  longitude: '',
  managerName: '',
  managerTitle: '',
  managerPhone: '',
  managerEmail: '',
  taxOffice: '',
  taxNumber: '',
  openingDate: '',
}

export function BranchFormScreen() {
  const nav = useNav()
  const { hasPermission } = useAuth()
  const id = nav.current.params?.id ? String(nav.current.params.id) : null
  const editing = !!id
  const { submit, busy } = useSubmit()

  const existing = useAsync(() => api.org.branches.get(id as string), [id], {
    enabled: editing,
  })

  const [form, setForm] = React.useState<FormState>(EMPTY)
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  React.useEffect(() => {
    const b = existing.data
    if (!b) return
    setForm({
      code: b.code,
      name: b.name,
      type: b.type,
      description: b.description,
      isActive: b.isActive,
      phone: b.phone,
      secondaryPhone: b.secondaryPhone,
      fax: b.fax,
      email: b.email,
      website: b.website,
      country: b.country,
      city: b.city,
      district: b.district,
      neighborhood: b.neighborhood,
      addressLine: b.addressLine,
      postalCode: b.postalCode,
      latitude: b.latitude == null ? '' : String(b.latitude),
      longitude: b.longitude == null ? '' : String(b.longitude),
      managerName: b.managerName,
      managerTitle: b.managerTitle,
      managerPhone: b.managerPhone,
      managerEmail: b.managerEmail,
      taxOffice: b.taxOffice,
      taxNumber: b.taxNumber,
      openingDate: b.openingDate ? b.openingDate.slice(0, 10) : '',
    })
  }, [existing.data])

  if (!hasPermission(OrgPermissions.branchesWrite)) {
    return (
      <Screen header={{ title: 'Şube', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu işlem için izniniz yok." />
      </Screen>
    )
  }

  function save() {
    const num = (s: string) => (s.trim() === '' ? null : Number(s))
    const payload: CreateBranchRequest = {
      code: form.code.trim(),
      name: form.name.trim(),
      type: form.type,
      description: form.description,
      isActive: form.isActive,
      phone: form.phone,
      secondaryPhone: form.secondaryPhone,
      fax: form.fax,
      email: form.email,
      website: form.website,
      country: form.country,
      city: form.city,
      district: form.district,
      neighborhood: form.neighborhood,
      addressLine: form.addressLine,
      postalCode: form.postalCode,
      latitude: num(form.latitude),
      longitude: num(form.longitude),
      managerName: form.managerName,
      managerTitle: form.managerTitle,
      managerPhone: form.managerPhone,
      managerEmail: form.managerEmail,
      taxOffice: form.taxOffice,
      taxNumber: form.taxNumber,
      openingDate: form.openingDate.trim() === '' ? null : form.openingDate.trim(),
    }
    void submit(
      async () => {
        if (editing) await api.org.branches.update(id as string, payload)
        else await api.org.branches.create(payload)
      },
      { onSuccess: nav.goBack },
    )
  }

  const canSave = form.code.trim() !== '' && form.name.trim() !== ''

  return (
    <Screen
      header={{ title: editing ? 'Şubeyi düzenle' : 'Yeni şube', onBack: nav.goBack }}
      footer={<Button title={editing ? 'Kaydet' : 'Oluştur'} fullWidth loading={busy} disabled={!canSave} onPress={save} />}
    >
      <Section title="Genel">
        <Input label="Kod" value={form.code} editable={!editing} autoCapitalize="characters" onChangeText={(v) => set('code', v)} placeholder="IST-01" />
        <Input label="Ad" value={form.name} onChangeText={(v) => set('name', v)} placeholder="İstanbul Merkez" />
        <FormSelect
          label="Tür"
          value={form.type}
          onChange={(v) => set('type', v)}
          options={BRANCH_TYPES.map((tp) => ({ value: tp, label: BRANCH_TYPE_LABELS[tp] }))}
        />
        <Input label="Açılış tarihi (YYYY-AA-GG)" value={form.openingDate} onChangeText={(v) => set('openingDate', v)} placeholder="2020-01-15" autoCapitalize="none" />
        <FormTextArea label="Açıklama" value={form.description} onChangeText={(v) => set('description', v)} />
        <FormSwitchRow label="Aktif" value={form.isActive} onValueChange={(v) => set('isActive', v)} />
      </Section>

      <Section title="İletişim">
        <Input label="Telefon" value={form.phone} onChangeText={(v) => set('phone', v)} keyboardType="phone-pad" />
        <Input label="İkinci telefon" value={form.secondaryPhone} onChangeText={(v) => set('secondaryPhone', v)} keyboardType="phone-pad" />
        <Input label="Faks" value={form.fax} onChangeText={(v) => set('fax', v)} keyboardType="phone-pad" />
        <Input label="E-posta" value={form.email} onChangeText={(v) => set('email', v)} keyboardType="email-address" autoCapitalize="none" />
        <Input label="Web sitesi" value={form.website} onChangeText={(v) => set('website', v)} autoCapitalize="none" placeholder="https://…" />
      </Section>

      <Section title="Adres">
        <Input label="Ülke" value={form.country} onChangeText={(v) => set('country', v)} />
        <Input label="İl" value={form.city} onChangeText={(v) => set('city', v)} />
        <Input label="İlçe" value={form.district} onChangeText={(v) => set('district', v)} />
        <Input label="Mahalle" value={form.neighborhood} onChangeText={(v) => set('neighborhood', v)} />
        <Input label="Posta kodu" value={form.postalCode} onChangeText={(v) => set('postalCode', v)} keyboardType="number-pad" />
        <FormTextArea label="Açık adres" value={form.addressLine} onChangeText={(v) => set('addressLine', v)} />
        <Input label="Enlem (lat)" value={form.latitude} onChangeText={(v) => set('latitude', v)} keyboardType="decimal-pad" placeholder="41.0082" />
        <Input label="Boylam (lng)" value={form.longitude} onChangeText={(v) => set('longitude', v)} keyboardType="decimal-pad" placeholder="28.9784" />
      </Section>

      <Section title="Yetkili / Şube müdürü">
        <Input label="Ad soyad" value={form.managerName} onChangeText={(v) => set('managerName', v)} />
        <Input label="Unvanı" value={form.managerTitle} onChangeText={(v) => set('managerTitle', v)} />
        <Input label="Telefon" value={form.managerPhone} onChangeText={(v) => set('managerPhone', v)} keyboardType="phone-pad" />
        <Input label="E-posta" value={form.managerEmail} onChangeText={(v) => set('managerEmail', v)} keyboardType="email-address" autoCapitalize="none" />
      </Section>

      <Section title="Yasal / Vergi">
        <Input label="Vergi dairesi" value={form.taxOffice} onChangeText={(v) => set('taxOffice', v)} />
        <Input label="Vergi / TC no" value={form.taxNumber} onChangeText={(v) => set('taxNumber', v)} keyboardType="number-pad" />
      </Section>
    </Screen>
  )
}
