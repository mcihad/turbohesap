// CategoryFormScreen — create or edit a category's core fields. Params:
//   { id } edit · { parentId } create child · { newRoot } create root.
// Custom fields are managed from the detail screen. Gated by
// inventory.categories.write.

import * as React from 'react'

import { InventoryPermissions } from '@turbohesap/shared'

import {
  Button,
  EmptyState,
  FormSwitchRow,
  FormTextArea,
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
  name: string
  code: string
  imageUrl: string
  description: string
  isActive: boolean
  sortOrder: string
}

const EMPTY: FormState = { name: '', code: '', imageUrl: '', description: '', isActive: true, sortOrder: '0' }

export function CategoryFormScreen() {
  const nav = useNav()
  const { hasPermission } = useAuth()
  const id = nav.current.params?.id ? String(nav.current.params.id) : null
  const parentId = nav.current.params?.parentId ? String(nav.current.params.parentId) : null
  const editing = !!id
  const { submit, busy } = useSubmit()
  const existing = useAsync(() => api.inventory.categories.get(id as string), [id], { enabled: editing })

  const [form, setForm] = React.useState<FormState>(EMPTY)
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }))

  React.useEffect(() => {
    const c = existing.data
    if (!c) return
    setForm({ name: c.name, code: c.code, imageUrl: c.imageUrl, description: c.description, isActive: c.isActive, sortOrder: String(c.sortOrder) })
  }, [existing.data])

  if (!hasPermission(InventoryPermissions.categoriesWrite)) {
    return (
      <Screen header={{ title: 'Kategori', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu işlem için izniniz yok." />
      </Screen>
    )
  }

  function save() {
    const base = {
      name: form.name.trim(),
      code: form.code,
      imageUrl: form.imageUrl,
      description: form.description,
      isActive: form.isActive,
      sortOrder: Number(form.sortOrder) || 0,
    }
    void submit(
      async () => {
        if (editing) await api.inventory.categories.update(id as string, base)
        else await api.inventory.categories.create({ ...base, parentId })
      },
      { onSuccess: nav.goBack },
    )
  }

  return (
    <Screen
      header={{ title: editing ? 'Kategoriyi düzenle' : 'Yeni kategori', onBack: nav.goBack }}
      footer={<Button title={editing ? 'Kaydet' : 'Oluştur'} fullWidth loading={busy} disabled={form.name.trim() === ''} onPress={save} />}
    >
      <Section title="Genel">
        <Input label="Ad" value={form.name} onChangeText={(v) => set('name', v)} placeholder="örn. Tekstil" />
        <Input label="Kod" value={form.code} onChangeText={(v) => set('code', v)} autoCapitalize="characters" />
        <Input label="Görsel adresi" value={form.imageUrl} onChangeText={(v) => set('imageUrl', v)} autoCapitalize="none" placeholder="https://…" />
        <FormTextArea label="Açıklama" value={form.description} onChangeText={(v) => set('description', v)} />
        <Input label="Sıra" value={form.sortOrder} onChangeText={(v) => set('sortOrder', v)} keyboardType="number-pad" />
        <FormSwitchRow label="Aktif" value={form.isActive} onValueChange={(v) => set('isActive', v)} />
        {!editing ? (
          <Text variant="caption" tone="muted">
            {parentId ? 'Bu kategori, seçili kategorinin altına eklenecek.' : 'Kök kategori olarak eklenecek.'} Özel ürün alanlarını oluşturduktan sonra detay ekranından ekleyin.
          </Text>
        ) : null}
      </Section>
    </Screen>
  )
}
