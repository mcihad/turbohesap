// CodePrefixFormScreen — create or edit a code-prefix definition. Params:
//   { id } → edit, else create. Gated by lookups.codePrefixes.write.
// RN counterpart of the create/edit dialog in the web code-prefixes-page.

import * as React from 'react'

import { CODE_PREFIX_CONTEXT_LABELS, LookupsPermissions } from '@turbohesap/shared'

import {
  Button,
  EmptyState,
  FormSelect,
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

interface FormState {
  context: string
  prefix: string
  padding: string
  nextNumber: string
  incrementOnSave: boolean
  isActive: boolean
}

const CONTEXT_OPTIONS = (Object.entries(CODE_PREFIX_CONTEXT_LABELS) as [string, string][]).map(
  ([value, label]) => ({ value, label }),
)

export function CodePrefixFormScreen() {
  const nav = useNav()
  const { hasPermission } = useAuth()
  const id = nav.current.params?.id ? String(nav.current.params.id) : null
  const editing = !!id
  const { submit, busy } = useSubmit()

  const existing = useAsync(() => api.codePrefixes.get(id as string), [id], { enabled: editing })

  const [form, setForm] = React.useState<FormState>({
    context: CONTEXT_OPTIONS[0]?.value ?? '',
    prefix: '',
    padding: '4',
    nextNumber: '1',
    incrementOnSave: false,
    isActive: true,
  })
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }))

  React.useEffect(() => {
    const p = existing.data
    if (!p) return
    setForm({
      context: p.context,
      prefix: p.prefix,
      padding: String(p.padding),
      nextNumber: String(p.nextNumber),
      incrementOnSave: p.incrementOnSave,
      isActive: p.isActive,
    })
  }, [existing.data])

  if (!hasPermission(LookupsPermissions.codePrefixesWrite)) {
    return (
      <Screen header={{ title: 'Kod öneki', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu işlem için izniniz yok." />
      </Screen>
    )
  }

  function save() {
    const payload = {
      context: form.context.trim(),
      prefix: form.prefix.trim(),
      padding: Number(form.padding) || 4,
      nextNumber: Number(form.nextNumber) || 1,
      incrementOnSave: form.incrementOnSave,
      isActive: form.isActive,
    }
    void submit(
      async () => {
        if (editing) await api.codePrefixes.update(id as string, payload)
        else await api.codePrefixes.create(payload)
      },
      { onSuccess: nav.goBack },
    )
  }

  const canSave = form.context.trim() !== '' && form.prefix.trim() !== ''

  return (
    <Screen
      header={{ title: editing ? 'Öneki düzenle' : 'Yeni kod öneki', onBack: nav.goBack }}
      footer={<Button title={editing ? 'Kaydet' : 'Oluştur'} fullWidth loading={busy} disabled={!canSave} onPress={save} />}
    >
      <Section title="Önek">
        <FormSelect label="Bağlam" value={form.context} options={CONTEXT_OPTIONS} onChange={(v) => set('context', v)} />
        <Input label="Önek" value={form.prefix} onChangeText={(v) => set('prefix', v)} autoCapitalize="characters" placeholder="ST-" />
        <Input label="Dolgu (basamak)" value={form.padding} onChangeText={(v) => set('padding', v)} keyboardType="number-pad" />
        <Input label="Sıradaki sayı" value={form.nextNumber} onChangeText={(v) => set('nextNumber', v)} keyboardType="number-pad" />
        <FormSwitchRow
          label="Kaydettikten sonra artır"
          description="Kapalıysa: seçilir seçilmez artırılır"
          value={form.incrementOnSave}
          onValueChange={(v) => set('incrementOnSave', v)}
        />
        <FormSwitchRow label="Aktif" value={form.isActive} onValueChange={(v) => set('isActive', v)} />
        <Text variant="caption" tone="muted">
          "Sıradaki sayı"yı elle değiştirmek boşluk veya çakışma yaratabilir — dikkatli kullanın.
        </Text>
      </Section>
    </Screen>
  )
}
