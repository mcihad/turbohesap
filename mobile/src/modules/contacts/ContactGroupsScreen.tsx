// ContactGroupsScreen — cari grup ağacı, girintili liste olarak (stok
// kategorileri gibi). contacts.read ile yetkilendirilir; satır → grup detayı.

import * as React from 'react'
import { Pressable, View } from 'react-native'

import { ContactsPermissions, type ContactGroupDto } from '@turbohesap/shared'

import {
  Badge,
  EmptyState,
  Icon,
  ListCard,
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

/** Flatten the parent/child group tree into an indented (depth-tagged) list. */
function flattenGroups(groups: ContactGroupDto[]): Array<{ group: ContactGroupDto; depth: number }> {
  const byParent = new Map<string | null, ContactGroupDto[]>()
  for (const g of groups) {
    const arr = byParent.get(g.parentId) ?? []
    arr.push(g)
    byParent.set(g.parentId, arr)
  }
  const out: Array<{ group: ContactGroupDto; depth: number }> = []
  const walk = (parentId: string | null, depth: number) => {
    for (const g of (byParent.get(parentId) ?? []).sort((a, b) => a.name.localeCompare(b.name, 'tr'))) {
      out.push({ group: g, depth })
      walk(g.id, depth + 1)
    }
  }
  walk(null, 0)
  return out
}

export function ContactGroupsScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(ContactsPermissions.contactsRead)
  const queryResult = useAsync(() => api.contacts.groups.list(), [], { enabled: canRead })

  const flat = React.useMemo(() => flattenGroups(queryResult.data ?? []), [queryResult.data])

  return (
    <PermissionRequired permission={ContactsPermissions.contactsRead} title="Cari Grupları" onBack={nav.canGoBack ? nav.goBack : undefined}>
      <Screen
        header={{
          title: 'Cari Grupları',
          large: !nav.canGoBack,
          onBack: nav.canGoBack ? nav.goBack : undefined,
        }}
        onRefresh={queryResult.refetch}
        refreshing={queryResult.refreshing}
      >
        {queryResult.loading ? (
          <SkeletonRows count={6} />
        ) : queryResult.error ? (
          <EmptyState icon="alert-triangle" tone="destructive" title="Yüklenemedi" description={queryResult.error} actionLabel="Tekrar dene" onAction={queryResult.refetch} />
        ) : flat.length === 0 ? (
          <EmptyState icon="folder" title="Grup bulunamadı" description="Henüz cari grubu eklenmemiş." />
        ) : (
          <>
            <Text variant="overline" tone="muted" style={{ paddingHorizontal: t.spacing[1] }}>
              {flat.length} Grup
            </Text>
            <ListCard>
              {flat.map(({ group, depth }) => (
                <Pressable
                  key={group.id}
                  onPress={() => nav.navigate('contacts.groups.detail', { id: group.id }, group.name)}
                  android_ripple={{ color: t.colors.muted }}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: t.spacing[2.5],
                    paddingVertical: t.spacing[3],
                    paddingRight: t.spacing[4],
                    paddingLeft: t.spacing[4] + depth * 18,
                    backgroundColor: pressed ? t.colors.muted : 'transparent',
                  })}
                >
                  <Icon
                    name={depth === 0 ? 'folder' : 'corner-down-right'}
                    size={18}
                    color={depth === 0 ? t.colors.primary : t.colors.mutedForeground}
                  />
                  <View style={{ flex: 1 }}>
                    <Text variant="label" weight="semibold" numberOfLines={1}>
                      {group.name}
                    </Text>
                    {group.code ? (
                      <Text variant="caption" tone="muted">
                        {group.code}
                      </Text>
                    ) : null}
                  </View>
                  {group.contactCount > 0 ? <Badge label={`${group.contactCount} cari`} tone="muted" /> : null}
                  {!group.isActive ? <Badge label="Pasif" tone="muted" /> : null}
                  <Icon name="chevron-right" size={18} color={t.colors.mutedForeground} />
                </Pressable>
              ))}
            </ListCard>
          </>
        )}
      </Screen>
    </PermissionRequired>
  )
}
