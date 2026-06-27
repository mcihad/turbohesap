// LookupListScreen — the items of ONE lookup list (params.list). Add (write-gated
// "+"), edit (tap a row), delete (swipe-free: a trailing delete on the row menu —
// here a long-press confirm). Gated by lookups.read.

import * as React from 'react'
import { View } from 'react-native'

import { LookupsPermissions } from '@turbohesap/shared'

import {
  Badge,
  Button,
  EmptyState,
  HeaderAction,
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
import { confirmDestructive, useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'

export function LookupListScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(LookupsPermissions.read)
  const canWrite = hasPermission(LookupsPermissions.write)
  const list = String(nav.current.params?.list ?? '')
  const items = useAsync(() => api.lookups.list(list), [list], { enabled: canRead && !!list })
  const { submit } = useSubmit()

  const rows = (items.data ?? [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.value.localeCompare(b.value))

  return (
    <PermissionRequired permission={LookupsPermissions.read} title={list} onBack={nav.goBack}>
      <Screen
        header={{
          title: list,
          subtitle: 'Tanım listesi',
          onBack: nav.goBack,
          right: canWrite ? (
            <HeaderAction icon="plus" onPress={() => nav.navigate('lookups.item.form', { list }, 'Yeni öğe')} />
          ) : undefined,
        }}
        onRefresh={items.refetch}
        refreshing={items.refreshing}
      >
        {items.loading ? (
          <SkeletonRows count={6} />
        ) : items.error ? (
          <EmptyState icon="alert-triangle" tone="destructive" title="Yüklenemedi" description={items.error} actionLabel="Tekrar dene" onAction={items.refetch} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="list"
            title="Öğe yok"
            description="Bu listede henüz öğe yok."
            actionLabel={canWrite ? 'Yeni öğe' : undefined}
            onAction={canWrite ? () => nav.navigate('lookups.item.form', { list }, 'Yeni öğe') : undefined}
          />
        ) : (
          <ListCard>
            {rows.map((item) => (
              <ListRow
                key={item.id}
                title={item.value}
                subtitle={item.key}
                trailing={
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[2] }}>
                    {!item.isActive ? <Badge label="Pasif" tone="muted" /> : null}
                    {canWrite ? (
                      <Button
                        title=""
                        icon="trash-2"
                        variant="ghost"
                        size="sm"
                        onPress={() =>
                          confirmDestructive('Sil', `"${item.value}" silinsin mi?`, () =>
                            submit(() => api.lookups.remove(item.id), { onSuccess: items.refetch }),
                          )
                        }
                      />
                    ) : null}
                  </View>
                }
                onPress={canWrite ? () => nav.navigate('lookups.item.form', { id: item.id, list }, item.value) : undefined}
                chevron={canWrite}
              />
            ))}
          </ListCard>
        )}

        {canWrite ? (
          <Text variant="caption" tone="muted" style={{ textAlign: 'center', paddingTop: t.spacing[2] }}>
            Düzenlemek için bir öğeye dokunun.
          </Text>
        ) : null}
      </Screen>
    </PermissionRequired>
  )
}
