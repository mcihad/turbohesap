// LookupsScreen — overview of all lookup lists (groups + item counts). The tab
// root for the Listeler module. A write-gated "+" creates a new list; tapping a
// list opens its items. Gated by lookups.read.

import * as React from 'react'

import { LookupsPermissions } from '@turbohesap/shared'

import {
  Badge,
  EmptyState,
  HeaderAction,
  ListCard,
  ListRow,
  PermissionRequired,
  Screen,
  SkeletonRows,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useNav } from '../../navigation/nav-context'

export function LookupsScreen() {
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(LookupsPermissions.read)
  const canWrite = hasPermission(LookupsPermissions.write)
  const lists = useAsync(() => api.lookups.lists(), [], { enabled: canRead })

  return (
    <PermissionRequired permission={LookupsPermissions.read} title="Tanım Listeleri" onBack={nav.canGoBack ? nav.goBack : undefined}>
      <Screen
        header={{
          title: 'Tanım Listeleri',
          large: !nav.canGoBack,
          onBack: nav.canGoBack ? nav.goBack : undefined,
          right: canWrite ? (
            <HeaderAction icon="plus" onPress={() => nav.navigate('lookups.item.form', { newList: true }, 'Yeni liste')} />
          ) : undefined,
        }}
        onRefresh={lists.refetch}
        refreshing={lists.refreshing}
      >
        {lists.loading ? (
          <SkeletonRows count={5} />
        ) : lists.error ? (
          <EmptyState icon="alert-triangle" tone="destructive" title="Yüklenemedi" description={lists.error} actionLabel="Tekrar dene" onAction={lists.refetch} />
        ) : (lists.data ?? []).length === 0 ? (
          <EmptyState
            icon="list"
            title="Liste yok"
            description="Henüz tanım listesi yok."
            actionLabel={canWrite ? 'Yeni liste' : undefined}
            onAction={canWrite ? () => nav.navigate('lookups.item.form', { newList: true }, 'Yeni liste') : undefined}
          />
        ) : (
          <ListCard>
            {(lists.data ?? []).map((l) => (
              <ListRow
                key={l.list}
                icon="list"
                title={l.list}
                subtitle={`${l.count} öğe`}
                trailing={<Badge label={String(l.count)} tone="muted" />}
                onPress={() => nav.navigate('lookups.list', { list: l.list }, l.list)}
              />
            ))}
          </ListCard>
        )}
      </Screen>
    </PermissionRequired>
  )
}
