// BranchesScreen — branches list (/api/org/branches). Gated by org.branches.read;
// a write-gated "+" opens the create form; rows drill into the detail.

import * as React from 'react'
import { View } from 'react-native'

import { OrgPermissions } from '@turbohesap/shared'

import {
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
import { useAsync } from '../../lib/use-async'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { branchTypeLabel } from './labels'

export function BranchesScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(OrgPermissions.branchesRead)
  const canWrite = hasPermission(OrgPermissions.branchesWrite)
  const [query, setQuery] = React.useState('')
  const branches = useAsync(() => api.org.branches.list(), [], { enabled: canRead })

  const filtered = React.useMemo(() => {
    const list = branches.data ?? []
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter((b) =>
      [b.code, b.name, b.city, b.managerName].some((f) => f?.toLowerCase().includes(q)),
    )
  }, [branches.data, query])

  return (
    <PermissionRequired permission={OrgPermissions.branchesRead} title="Şubeler" onBack={nav.canGoBack ? nav.goBack : undefined}>
      <Screen
        header={{
          title: 'Şubeler',
          large: !nav.canGoBack,
          onBack: nav.canGoBack ? nav.goBack : undefined,
          right: canWrite ? (
            <HeaderAction icon="plus" onPress={() => nav.navigate('org.branches.form', {}, 'Yeni şube')} />
          ) : undefined,
        }}
        onRefresh={branches.refetch}
        refreshing={branches.refreshing}
      >
        <Input icon="search" placeholder="Kod, ad, şehir veya yetkiliye göre ara" value={query} onChangeText={setQuery} />

        {branches.loading ? (
          <SkeletonRows count={6} />
        ) : branches.error ? (
          <EmptyState icon="alert-triangle" tone="destructive" title="Yüklenemedi" description={branches.error} actionLabel="Tekrar dene" onAction={branches.refetch} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="map-pin"
            title="Şube yok"
            description={query ? 'Eşleşen şube bulunamadı.' : 'Henüz şube eklenmemiş.'}
            actionLabel={canWrite && !query ? 'Yeni şube' : undefined}
            onAction={canWrite && !query ? () => nav.navigate('org.branches.form', {}, 'Yeni şube') : undefined}
          />
        ) : (
          <>
            <Text variant="overline" tone="muted" style={{ paddingHorizontal: t.spacing[1] }}>
              {filtered.length} şube
            </Text>
            <ListCard>
              {filtered.map((b) => (
                <ListRow
                  key={b.id}
                  icon="map-pin"
                  title={b.name}
                  subtitle={`${b.code} · ${branchTypeLabel(b.type)}${b.city ? ` · ${b.city}` : ''}`}
                  trailing={
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Badge label={b.isActive ? 'Aktif' : 'Pasif'} tone={b.isActive ? 'success' : 'muted'} />
                    </View>
                  }
                  onPress={() => nav.navigate('org.branches.detail', { id: b.id }, b.name)}
                />
              ))}
            </ListCard>
          </>
        )}
      </Screen>
    </PermissionRequired>
  )
}
