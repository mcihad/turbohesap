// PermissionsScreen — the IAM permission catalog (/api/iam/permissions),
// grouped by `group` (mirrors the web's grouped permission view). Gated by
// iam.permissions.read.

import * as React from 'react'

import { IamPermissions, type PermissionDto } from '@turbohesap/shared'

import {
  Badge,
  EmptyState,
  ListCard,
  ListRow,
  PermissionRequired,
  Screen,
  Section,
  SkeletonRows,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'

export function PermissionsScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(IamPermissions.permissionsRead)
  const perms = useAsync(() => api.iam.permissions.list(), [], { enabled: canRead })

  const groups = React.useMemo(() => {
    const map = new Map<string, PermissionDto[]>()
    for (const p of perms.data ?? []) {
      const arr = map.get(p.group) ?? []
      arr.push(p)
      map.set(p.group, arr)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [perms.data])

  return (
    <PermissionRequired permission={IamPermissions.permissionsRead} title="İzinler" onBack={nav.canGoBack ? nav.goBack : undefined}>
      <Screen header={{ title: 'İzinler', onBack: nav.canGoBack ? nav.goBack : undefined }} onRefresh={perms.refetch} refreshing={perms.refreshing} contentStyle={{ gap: t.spacing[5] }}>
        {perms.loading ? (
          <SkeletonRows count={6} />
        ) : perms.error ? (
          <EmptyState icon="alert-triangle" tone="destructive" title="Yüklenemedi" description={perms.error} actionLabel="Tekrar dene" onAction={perms.refetch} />
        ) : groups.length === 0 ? (
          <EmptyState icon="key" title="İzin yok" description="Katalog boş görünüyor." />
        ) : (
          groups.map(([group, items]) => (
            <Section key={group} title={`${group} · ${items.length}`}>
              <ListCard>
                {items.map((p) => (
                  <ListRow
                    key={p.key}
                    icon="key"
                    iconTone="muted"
                    title={p.description}
                    subtitle={p.key}
                    trailing={<Badge label={p.key.split('.').pop() ?? ''} tone="muted" />}
                    onPress={() => nav.navigate('iam.permissions.detail', { key: p.key }, p.description)}
                  />
                ))}
              </ListCard>
            </Section>
          ))
        )}
      </Screen>
    </PermissionRequired>
  )
}
