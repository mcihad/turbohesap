// UsersScreen — IAM users list (/api/iam/users). Gated by iam.users.read both
// as a page guard and on the query (no request fires without access), mirroring
// the web. Free-text search filters client-side; rows drill into the detail.

import * as React from 'react'
import { View } from 'react-native'

import { IamPermissions, type UserDto } from '@turbohesap/shared'

import {
  Avatar,
  Badge,
  EmptyState,
  HeaderAction,
  Input,
  ListCard,
  ListRow,
  PermissionRequired,
  Screen,
  SkeletonRows,
  Text,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { initials } from '../../lib/tokens'
import { useAsync } from '../../lib/use-async'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'

export function UsersScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(IamPermissions.usersRead)
  const canWrite = hasPermission(IamPermissions.usersWrite)
  const [query, setQuery] = React.useState('')
  const users = useAsync(() => api.iam.users.list(), [], { enabled: canRead })

  const filtered = React.useMemo(() => {
    const list = users.data ?? []
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter((u) =>
      [u.username, u.email, u.firstName, u.lastName].some((f) => f?.toLowerCase().includes(q)),
    )
  }, [users.data, query])

  return (
    <PermissionRequired permission={IamPermissions.usersRead} title="Kullanıcılar" onBack={nav.canGoBack ? nav.goBack : undefined}>
      <Screen
        header={{
          title: 'Kullanıcılar',
          onBack: nav.canGoBack ? nav.goBack : undefined,
          right: canWrite ? (
            <HeaderAction icon="plus" onPress={() => nav.navigate('iam.users.form', {}, 'Yeni kullanıcı')} />
          ) : undefined,
        }}
        onRefresh={users.refetch}
        refreshing={users.refreshing}
      >
        <Input icon="search" placeholder="Ada veya e-postaya göre ara" value={query} onChangeText={setQuery} />

        {users.loading ? (
          <SkeletonRows count={6} />
        ) : users.error ? (
          <EmptyState icon="alert-triangle" tone="destructive" title="Yüklenemedi" description={users.error} actionLabel="Tekrar dene" onAction={users.refetch} />
        ) : filtered.length === 0 ? (
          <EmptyState icon="users" title="Kullanıcı yok" description={query ? 'Aramanızla eşleşen kullanıcı bulunamadı.' : 'Henüz kullanıcı bulunmuyor.'} />
        ) : (
          <>
            <Text variant="overline" tone="muted" style={{ paddingHorizontal: t.spacing[1] }}>
              {filtered.length} kullanıcı
            </Text>
            <ListCard>
              {filtered.map((u: UserDto) => (
                <ListRow
                  key={u.id}
                  leading={<Avatar initials={initials(u)} />}
                  title={`${u.firstName} ${u.lastName}`.trim() || u.username}
                  subtitle={u.email}
                  trailing={
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Badge label={u.isActive ? 'Aktif' : 'Pasif'} tone={u.isActive ? 'success' : 'muted'} />
                    </View>
                  }
                  onPress={() =>
                    nav.navigate('iam.users.detail', { id: u.id }, `${u.firstName} ${u.lastName}`.trim() || u.username)
                  }
                />
              ))}
            </ListCard>
          </>
        )}
      </Screen>
    </PermissionRequired>
  )
}
