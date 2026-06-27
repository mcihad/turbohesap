// UserDetailScreen — a single IAM user (/api/iam/users/:id). Identity header,
// role chips and account metadata. Gated by iam.users.read. The user id comes
// from the navigation params set by the list row.

import * as React from 'react'
import { View } from 'react-native'

import { IamPermissions } from '@turbohesap/shared'

import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  HeaderAction,
  ListCard,
  ListRow,
  PermissionRequired,
  Screen,
  Skeleton,
  Text,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { formatDateTime, formatRelative } from '../../lib/datetime'
import { initials } from '../../lib/tokens'
import { useAsync } from '../../lib/use-async'
import { confirmDestructive, useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'

export function UserDetailScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const id = String(nav.current.params?.id ?? '')
  const canRead = hasPermission(IamPermissions.usersRead)
  const canWrite = hasPermission(IamPermissions.usersWrite)
  const canReadRoles = hasPermission(IamPermissions.rolesRead)
  const canAudit = hasPermission(IamPermissions.auditRead)
  const user = useAsync(() => api.iam.users.get(id), [id], { enabled: canRead && !!id })
  const { submit, busy } = useSubmit()

  return (
    <PermissionRequired permission={IamPermissions.usersRead} title="Kullanıcı" onBack={nav.goBack}>
      <Screen
        header={{
          title: 'Kullanıcı',
          onBack: nav.goBack,
          right: user.data ? (
            <>
              {canAudit ? (
                <HeaderAction
                  icon="clock"
                  onPress={() => nav.navigate('iam.audit.entity', { entityType: 'User', entityId: user.data!.id, title: user.data!.username }, 'Denetim geçmişi')}
                />
              ) : null}
              {canWrite ? (
                <HeaderAction icon="edit-2" onPress={() => nav.navigate('iam.users.form', { id: user.data!.id }, 'Kullanıcıyı düzenle')} />
              ) : null}
            </>
          ) : undefined,
        }}
        onRefresh={user.refetch}
        refreshing={user.refreshing}
      >
        {user.loading ? (
          <Card style={{ gap: t.spacing[3] }}>
            <Skeleton width={64} height={64} radius={t.radius.full} />
            <Skeleton width="60%" height={18} />
            <Skeleton width="40%" height={13} />
          </Card>
        ) : user.error || !user.data ? (
          <EmptyState icon="alert-triangle" tone="destructive" title="Yüklenemedi" description={user.error ?? 'Kullanıcı bulunamadı.'} actionLabel="Tekrar dene" onAction={user.refetch} />
        ) : (
          <>
            <Card style={{ alignItems: 'center', gap: t.spacing[3] }}>
              <Avatar initials={initials(user.data)} size={72} />
              <View style={{ alignItems: 'center', gap: 4 }}>
                <Text variant="h2">{`${user.data.firstName} ${user.data.lastName}`.trim() || user.data.username}</Text>
                <Text variant="label" tone="muted">
                  {user.data.email}
                </Text>
              </View>
              <Badge label={user.data.isActive ? 'Aktif hesap' : 'Pasif hesap'} tone={user.data.isActive ? 'success' : 'muted'} />
            </Card>

            <View style={{ gap: t.spacing[2.5] }}>
              <Text variant="overline" tone="muted" style={{ paddingHorizontal: t.spacing[1] }}>
                Roller ({user.data.roles.length})
              </Text>
              {user.data.roles.length === 0 ? (
                <Card>
                  <Text variant="label" tone="muted">
                    Atanmış rol yok.
                  </Text>
                </Card>
              ) : (
                <ListCard>
                  {user.data.roles.map((r) => (
                    <ListRow
                      key={r.id}
                      icon="shield"
                      title={r.name}
                      subtitle={r.description || `${r.permissions.length} izin`}
                      trailing={<Badge label={r.module} tone="primary" />}
                      chevron={canReadRoles}
                      onPress={canReadRoles ? () => nav.navigate('iam.roles.detail', { id: r.id }, r.name) : undefined}
                    />
                  ))}
                </ListCard>
              )}
            </View>

            <View style={{ gap: t.spacing[2.5] }}>
              <Text variant="overline" tone="muted" style={{ paddingHorizontal: t.spacing[1] }}>
                Yetkili olduğu şubeler ({user.data.branches.length})
              </Text>
              {user.data.branches.length === 0 ? (
                <Card>
                  <Text variant="label" tone="muted">
                    Atanmış şube yok.
                  </Text>
                </Card>
              ) : (
                <ListCard>
                  {user.data.branches.map((b) => (
                    <ListRow
                      key={b.id}
                      icon="map-pin"
                      iconTone="muted"
                      title={b.name}
                      subtitle={`${b.code}${b.city ? ` · ${b.city}` : ''}`}
                      chevron={false}
                    />
                  ))}
                </ListCard>
              )}
            </View>

            <View style={{ gap: t.spacing[2.5] }}>
              <Text variant="overline" tone="muted" style={{ paddingHorizontal: t.spacing[1] }}>
                Hesap
              </Text>
              <Card style={{ gap: t.spacing[3] }}>
                <MetaRow label="Kullanıcı adı" value={user.data.username} />
                <MetaRow label="Son giriş" value={user.data.lastLoginAt ? formatRelative(user.data.lastLoginAt) : 'Hiç'} />
                <MetaRow label="Oluşturulma" value={formatDateTime(user.data.createdAt)} />
              </Card>
            </View>

            {canWrite ? (
              <Button
                title="Kullanıcıyı sil"
                variant="outline"
                icon="trash-2"
                fullWidth
                loading={busy}
                onPress={() =>
                  confirmDestructive('Kullanıcıyı sil', `"${user.data!.username}" silinsin mi?`, () =>
                    submit(() => api.iam.users.remove(user.data!.id), { onSuccess: nav.goBack }),
                  )
                }
                style={{ marginTop: t.spacing[2] }}
              />
            ) : null}
          </>
        )}
      </Screen>
    </PermissionRequired>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
      <Text variant="label" tone="muted">
        {label}
      </Text>
      <Text variant="label" weight="medium" style={{ flexShrink: 1, textAlign: 'right' }}>
        {value}
      </Text>
    </View>
  )
}
