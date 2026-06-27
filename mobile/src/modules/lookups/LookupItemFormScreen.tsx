// LookupItemFormScreen — create or edit a lookup item. Params:
//   { id }       → edit
//   { list }     → create in that list (list fixed)
//   { newList }  → create with an editable list name
// Gated by lookups.write.

import * as React from 'react'

import { LookupsPermissions } from '@turbohesap/shared'

import {
  Button,
  EmptyState,
  FormSwitchRow,
  Input,
  Screen,
  Section,
  Text,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'

interface FormState {
  list: string
  value: string
  key: string
  sortOrder: string
  isActive: boolean
}

export function LookupItemFormScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const id = nav.current.params?.id ? String(nav.current.params.id) : null
  const presetList = nav.current.params?.list ? String(nav.current.params.list) : ''
  const isNewList = nav.current.params?.newList === true
  const editing = !!id
  const { submit, busy } = useSubmit()

  const existing = useAsync(() => api.lookups.get(id as string), [id], { enabled: editing })

  const [form, setForm] = React.useState<FormState>({
    list: presetList,
    value: '',
    key: '',
    sortOrder: '0',
    isActive: true,
  })
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  React.useEffect(() => {
    const i = existing.data
    if (!i) return
    setForm({
      list: i.list,
      value: i.value,
      key: i.key,
      sortOrder: String(i.sortOrder),
      isActive: i.isActive,
    })
  }, [existing.data])

  if (!hasPermission(LookupsPermissions.write)) {
    return (
      <Screen header={{ title: 'Liste öğesi', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu işlem için izniniz yok." />
      </Screen>
    )
  }

  function save() {
    void submit(
      async () => {
        if (editing) {
          await api.lookups.update(id as string, {
            value: form.value.trim(),
            key: form.key.trim() || undefined,
            sortOrder: Number(form.sortOrder) || 0,
            isActive: form.isActive,
          })
        } else {
          await api.lookups.create({
            list: form.list.trim(),
            value: form.value.trim(),
            key: form.key.trim() || undefined,
            sortOrder: Number(form.sortOrder) || 0,
            isActive: form.isActive,
          })
        }
      },
      { onSuccess: nav.goBack },
    )
  }

  const listEditable = isNewList && !editing
  const canSave = form.value.trim() !== '' && form.list.trim() !== ''

  return (
    <Screen
      header={{ title: editing ? 'Öğeyi düzenle' : isNewList ? 'Yeni liste' : 'Yeni öğe', onBack: nav.goBack }}
      footer={<Button title={editing ? 'Kaydet' : 'Ekle'} fullWidth loading={busy} disabled={!canSave} onPress={save} />}
    >
      <Section title="Öğe">
        <Input label="Liste adı" value={form.list} editable={listEditable} autoCapitalize="none" onChangeText={(v) => set('list', v)} placeholder="örn. birim" />
        <Input label="Değer" value={form.value} onChangeText={(v) => set('value', v)} placeholder="örn. Kilogram" />
        <Input label="Anahtar (opsiyonel)" value={form.key} onChangeText={(v) => set('key', v)} autoCapitalize="characters" placeholder="otomatik üretilir" />
        <Input label="Sıra" value={form.sortOrder} onChangeText={(v) => set('sortOrder', v)} keyboardType="number-pad" />
        <FormSwitchRow label="Aktif" value={form.isActive} onValueChange={(v) => set('isActive', v)} />
        <Text variant="caption" tone="muted">
          Anahtar boş bırakılırsa değerden otomatik üretilir.
        </Text>
      </Section>
    </Screen>
  )
}
