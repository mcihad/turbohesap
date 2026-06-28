// UserFormScreen — create or edit a user, with role and authorized-branch
// multi-select (branches only when the caller can read them — same key the
// server enforces). Gated by iam.users.write.

import * as React from 'react'
import { View } from 'react-native'

import {
  IamPermissions,
  OrgPermissions,
  type CreateUserRequest,
} from '@turbohesap/shared'

import {
  Button,
  Checklist,
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

interface FormState {
  username: string
  email: string
  password: string
  firstName: string
  lastName: string
  telegramChatId: string
  isActive: boolean
  roleIds: string[]
  branchIds: string[]
}

const EMPTY: FormState = {
  username: '',
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  telegramChatId: '',
  isActive: true,
  roleIds: [],
  branchIds: [],
}

export function UserFormScreen() {
  const nav = useNav()
  const { hasPermission } = useAuth()
  const id = nav.current.params?.id ? String(nav.current.params.id) : null
  const editing = !!id
  const canReadBranches = hasPermission(OrgPermissions.branchesRead)
  const { submit, busy } = useSubmit()

  const existing = useAsync(() => api.iam.users.get(id as string), [id], { enabled: editing })
  const roles = useAsync(() => api.iam.roles.list(), [])
  const branches = useAsync(() => api.org.branches.list(), [], { enabled: canReadBranches })

  const [form, setForm] = React.useState<FormState>(EMPTY)
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))
  const toggle = (key: 'roleIds' | 'branchIds', id2: string, on: boolean) =>
    setForm((f) => ({
      ...f,
      [key]: on ? [...f[key], id2] : f[key].filter((x) => x !== id2),
    }))

  React.useEffect(() => {
    const u = existing.data
    if (!u) return
    setForm({
      username: u.username,
      email: u.email,
      password: '',
      firstName: u.firstName,
      lastName: u.lastName,
      telegramChatId: u.telegramChatId ?? '',
      isActive: u.isActive,
      roleIds: u.roles.map((r) => r.id),
      branchIds: u.branches.map((b) => b.id),
    })
  }, [existing.data])

  if (!hasPermission(IamPermissions.usersWrite)) {
    return (
      <Screen header={{ title: 'Kullanıcı', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu işlem için izniniz yok." />
      </Screen>
    )
  }

  function save() {
    void submit(
      async () => {
        if (editing) {
          await api.iam.users.update(id as string, {
            email: form.email,
            firstName: form.firstName,
            lastName: form.lastName,
            telegramChatId: form.telegramChatId.trim() || null,
            isActive: form.isActive,
            roleIds: form.roleIds,
            ...(canReadBranches ? { branchIds: form.branchIds } : {}),
            ...(form.password ? { password: form.password } : {}),
          })
        } else {
          const payload: CreateUserRequest = {
            username: form.username.trim(),
            email: form.email.trim(),
            password: form.password,
            firstName: form.firstName,
            lastName: form.lastName,
            telegramChatId: form.telegramChatId.trim() || null,
            isActive: form.isActive,
            roleIds: form.roleIds,
            ...(canReadBranches ? { branchIds: form.branchIds } : {}),
          }
          await api.iam.users.create(payload)
        }
      },
      { onSuccess: nav.goBack },
    )
  }

  const canSave =
    form.email.trim() !== '' &&
    (editing || (form.username.trim() !== '' && form.password.length >= 6))

  return (
    <Screen
      header={{ title: editing ? 'Kullanıcıyı düzenle' : 'Yeni kullanıcı', onBack: nav.goBack }}
      footer={<Button title={editing ? 'Kaydet' : 'Oluştur'} fullWidth loading={busy} disabled={!canSave} onPress={save} />}
    >
      <Section title="Kimlik">
        <Input label="Kullanıcı adı" value={form.username} editable={!editing} autoCapitalize="none" onChangeText={(v) => set('username', v)} />
        <Input label="E-posta" value={form.email} onChangeText={(v) => set('email', v)} keyboardType="email-address" autoCapitalize="none" />
        <Input label="Ad" value={form.firstName} onChangeText={(v) => set('firstName', v)} />
        <Input label="Soyad" value={form.lastName} onChangeText={(v) => set('lastName', v)} />
        <View style={{ gap: 4 }}>
          <Input
            label="Telegram Chat ID"
            value={form.telegramChatId}
            onChangeText={(v) => set('telegramChatId', v)}
            keyboardType="numeric"
            autoCapitalize="none"
          />
          <Text variant="caption" tone="muted">
            Kişisel Telegram bildirimleri için (opsiyonel).
          </Text>
        </View>
        <Input
          label={editing ? 'Parola (değiştirmek için doldurun)' : 'Parola'}
          value={form.password}
          password
          onChangeText={(v) => set('password', v)}
        />
        <FormSwitchRow label="Aktif" description="Pasif kullanıcılar giriş yapamaz." value={form.isActive} onValueChange={(v) => set('isActive', v)} />
      </Section>

      <Section title="Roller">
        <Checklist
          items={(roles.data ?? []).map((r) => ({ id: r.id, title: r.name, subtitle: r.description || `${r.permissions.length} izin` }))}
          selected={form.roleIds}
          onToggle={(rid, on) => toggle('roleIds', rid, on)}
          emptyText="Rol yok"
        />
      </Section>

      {canReadBranches ? (
        <Section title="Yetkili olduğu şubeler">
          <Checklist
            items={(branches.data ?? []).map((b) => ({ id: b.id, title: b.name, subtitle: `${b.code}${b.city ? ` · ${b.city}` : ''}` }))}
            selected={form.branchIds}
            onToggle={(bid, on) => toggle('branchIds', bid, on)}
            emptyText="Şube yok"
            searchable
          />
        </Section>
      ) : null}
    </Screen>
  )
}
