// RoleDetailScreen — a single role: info, its permissions grouped by module, the
// users who have it, and edit/delete (system roles can't be deleted). Gated by
// iam.roles.read.

import * as React from 'react'
import { View } from 'react-native'

import { IamPermissions, MODULES } from '@turbohesap/shared'

import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  HeaderAction,
  ListCard,
  ListRow,
  Screen,
  Section,
  Skeleton,
  Text,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { initials } from '../../lib/tokens'
import { useAsync } from '../../lib/use-async'
import { confirmDestructive, useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'

const MODULE_LABELS = new Map(MODULES.map((m) => [m.key, m.label]))
const moduleLabel = (k: string) => MODULE_LABELS.get(k) ?? k

export function RoleDetailScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canWrite = hasPermission(IamPermissions.rolesWrite)
  const canReadUsers = hasPermission(IamPermissions.usersRead)
  const canAudit = hasPermission(IamPermissions.auditRead)
  const id = String(nav.current.params?.id ?? '')
  const role = useAsync(() => api.iam.roles.get(id), [id], {
    enabled: hasPermission(IamPermissions.rolesRead) && !!id,
  })
  const users = useAsync(() => api.iam.users.list(), [], { enabled: canReadUsers })
  const { submit, busy } = useSubmit()
  const r = role.data

  const permGroups = React.useMemo(() => {
    const map = new Map<string, string[]>()
    for (const key of r?.permissions ?? []) {
      const mod = key.split('.')[0]
      const arr = map.get(mod) ?? []
      arr.push(key)
      map.set(mod, arr)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [r?.permissions])

  const roleUsers = React.useMemo(
    () => (users.data ?? []).filter((u) => u.roles.some((x) => x.id === id)),
    [users.data, id],
  )

  if (!hasPermission(IamPermissions.rolesRead)) {
    return (
      <Screen header={{ title: 'Rol', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu sayfayı görüntüleme izniniz yok." />
      </Screen>
    )
  }

  return (
    <Screen
      header={{
        title: r?.name ?? 'Rol',
        subtitle: r ? moduleLabel(r.module) : undefined,
        onBack: nav.goBack,
        right: r ? (
          <>
            {canAudit ? (
              <HeaderAction
                icon="clock"
                onPress={() => nav.navigate('iam.audit.entity', { entityType: 'Role', entityId: r.id, title: r.name }, 'Denetim geçmişi')}
              />
            ) : null}
            {canWrite ? (
              <HeaderAction icon="edit-2" onPress={() => nav.navigate('iam.roles.form', { id: r.id }, r.name)} />
            ) : null}
          </>
        ) : undefined,
      }}
      onRefresh={role.refetch}
      refreshing={role.refreshing}
    >
      {role.loading ? (
        <Card style={{ gap: t.spacing[3] }}>
          <Skeleton width="60%" height={18} />
          <Skeleton width="40%" height={13} />
        </Card>
      ) : role.error || !r ? (
        <EmptyState icon="alert-triangle" tone="destructive" title="Yüklenemedi" description={role.error ?? 'Rol bulunamadı.'} actionLabel="Tekrar dene" onAction={role.refetch} />
      ) : (
        <>
          <Card style={{ gap: t.spacing[3] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: t.spacing[2] }}>
              <Text variant="h2">{r.name}</Text>
              {r.isSystem ? <Badge label="Sistem" tone="info" /> : null}
              <Badge label={moduleLabel(r.module)} tone="primary" />
            </View>
            {r.description ? (
              <Text variant="label" tone="muted">
                {r.description}
              </Text>
            ) : null}
            <View style={{ flexDirection: 'row', gap: t.spacing[6] }}>
              <Stat label="İzin" value={String(r.permissions.length)} />
              <Stat label="Kullanıcı" value={canReadUsers ? String(roleUsers.length) : '—'} />
            </View>
          </Card>

          <Section title={`İzinler (${r.permissions.length})`}>
            {permGroups.length === 0 ? (
              <Card>
                <Text variant="label" tone="muted">
                  Bu role atanmış izin yok.
                </Text>
              </Card>
            ) : (
              permGroups.map(([mod, keys]) => (
                <Card key={mod} style={{ gap: t.spacing[2] }}>
                  <Text variant="overline" tone="primary">
                    {moduleLabel(mod)} · {keys.length}
                  </Text>
                  {keys.sort().map((k) => (
                    <Text key={k} variant="mono">
                      {k}
                    </Text>
                  ))}
                </Card>
              ))
            )}
          </Section>

          {canReadUsers ? (
            <Section title={`Bu role sahip kullanıcılar (${roleUsers.length})`}>
              {roleUsers.length === 0 ? (
                <Card>
                  <Text variant="label" tone="muted">
                    Bu role sahip kullanıcı yok.
                  </Text>
                </Card>
              ) : (
                <ListCard>
                  {roleUsers.map((u) => (
                    <ListRow
                      key={u.id}
                      leading={<Avatar initials={initials(u)} size={36} />}
                      title={`${u.firstName} ${u.lastName}`.trim() || u.username}
                      subtitle={u.email}
                      onPress={() => nav.navigate('iam.users.detail', { id: u.id }, u.username)}
                    />
                  ))}
                </ListCard>
              )}
            </Section>
          ) : null}

          {canWrite && !r.isSystem ? (
            <Button
              title="Rolü sil"
              variant="outline"
              icon="trash-2"
              fullWidth
              loading={busy}
              onPress={() =>
                confirmDestructive('Rolü sil', `"${r.name}" rolü silinsin mi?`, () =>
                  submit(() => api.iam.roles.remove(r.id), { onSuccess: nav.goBack }),
                )
              }
              style={{ marginTop: t.spacing[2] }}
            />
          ) : null}
        </>
      )}
    </Screen>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Text variant="h2">{value}</Text>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </View>
  )
}
