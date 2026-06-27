// RoleFormScreen — create or edit a role: name, owning module, description and a
// searchable permission checklist. Gated by iam.roles.write. System role names
// are locked.

import * as React from 'react'

import {
  IamPermissions,
  MODULES,
  type CreateRoleRequest,
} from '@turbohesap/shared'

import {
  Button,
  Checklist,
  EmptyState,
  FormSelect,
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
  module: string
  description: string
  permissionKeys: string[]
  isSystem: boolean
}

export function RoleFormScreen() {
  const nav = useNav()
  const { hasPermission } = useAuth()
  const id = nav.current.params?.id ? String(nav.current.params.id) : null
  const editing = !!id
  const { submit, busy } = useSubmit()

  const existing = useAsync(() => api.iam.roles.get(id as string), [id], { enabled: editing })
  const perms = useAsync(() => api.iam.permissions.list(), [])

  const [form, setForm] = React.useState<FormState>({
    name: '',
    module: MODULES[0]?.key ?? '',
    description: '',
    permissionKeys: [],
    isSystem: false,
  })
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  React.useEffect(() => {
    const r = existing.data
    if (!r) return
    setForm({
      name: r.name,
      module: r.module,
      description: r.description,
      permissionKeys: [...r.permissions],
      isSystem: r.isSystem,
    })
  }, [existing.data])

  if (!hasPermission(IamPermissions.rolesWrite)) {
    return (
      <Screen header={{ title: 'Rol', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu işlem için izniniz yok." />
      </Screen>
    )
  }

  function save() {
    const payload: CreateRoleRequest = {
      name: form.name.trim(),
      module: form.module,
      description: form.description,
      permissionKeys: form.permissionKeys,
    }
    void submit(
      async () => {
        if (editing) await api.iam.roles.update(id as string, payload)
        else await api.iam.roles.create(payload)
      },
      { onSuccess: nav.goBack },
    )
  }

  const canSave = form.name.trim() !== '' && form.module !== ''

  return (
    <Screen
      header={{ title: editing ? 'Rolü düzenle' : 'Yeni rol', onBack: nav.goBack }}
      footer={<Button title={editing ? 'Kaydet' : 'Oluştur'} fullWidth loading={busy} disabled={!canSave} onPress={save} />}
    >
      <Section title="Genel">
        <Input label="Ad" value={form.name} editable={!form.isSystem} onChangeText={(v) => set('name', v)} />
        <FormSelect
          label="Modül"
          value={form.module}
          onChange={(v) => set('module', v)}
          options={MODULES.map((m) => ({ value: m.key, label: m.label }))}
        />
        <FormTextArea label="Açıklama" value={form.description} onChangeText={(v) => set('description', v)} />
      </Section>

      <Section title="İzinler">
        <Checklist
          items={(perms.data ?? []).map((p) => ({ id: p.key, title: p.description, subtitle: p.key }))}
          selected={form.permissionKeys}
          onToggle={(key, on) =>
            setForm((f) => ({
              ...f,
              permissionKeys: on ? [...f.permissionKeys, key] : f.permissionKeys.filter((k) => k !== key),
            }))
          }
          emptyText="İzin yok"
          searchable
        />
      </Section>
    </Screen>
  )
}
