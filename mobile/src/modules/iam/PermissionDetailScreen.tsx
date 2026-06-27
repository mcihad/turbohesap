// PermissionDetailScreen — a single permission key: its description, the module/
// resource/action breakdown, and the roles that grant it (iam.roles.read).
// Gated by iam.permissions.read. The key comes from navigation params.

import * as React from 'react'
import { View } from 'react-native'

import { IamPermissions, MODULES } from '@turbohesap/shared'

import {
  Badge,
  Card,
  EmptyState,
  ListCard,
  ListRow,
  Screen,
  Section,
  Skeleton,
  Text,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'

const MODULE_LABELS = new Map(MODULES.map((m) => [m.key, m.label]))
const moduleLabel = (k: string) => MODULE_LABELS.get(k) ?? k

export function PermissionDetailScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canReadRoles = hasPermission(IamPermissions.rolesRead)
  const key = String(nav.current.params?.key ?? '')
  const perms = useAsync(() => api.iam.permissions.list(), [], {
    enabled: hasPermission(IamPermissions.permissionsRead),
  })
  const roles = useAsync(() => api.iam.roles.list(), [], { enabled: canReadRoles })

  const permission = (perms.data ?? []).find((p) => p.key === key)
  const [moduleKey, resource, action] = key.split('.')
  const rolesWith = React.useMemo(
    () => (roles.data ?? []).filter((r) => r.permissions.includes(key)),
    [roles.data, key],
  )

  if (!hasPermission(IamPermissions.permissionsRead)) {
    return (
      <Screen header={{ title: 'İzin', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu sayfayı görüntüleme izniniz yok." />
      </Screen>
    )
  }

  return (
    <Screen header={{ title: permission?.description ?? 'İzin', subtitle: key, onBack: nav.goBack }} onRefresh={perms.refetch} refreshing={perms.refreshing}>
      {perms.loading ? (
        <Card style={{ gap: t.spacing[3] }}>
          <Skeleton width="70%" height={16} />
          <Skeleton width="50%" height={14} />
        </Card>
      ) : (
        <>
          <Card style={{ gap: t.spacing[3] }}>
            <Text variant="mono">{key}</Text>
            {permission?.description ? (
              <Text variant="label" tone="muted">
                {permission.description}
              </Text>
            ) : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[1.5] }}>
              <Badge label={moduleLabel(moduleKey)} tone="primary" />
              {resource ? <Badge label={resource} tone="muted" /> : null}
              {action ? <Badge label={action} tone="info" /> : null}
            </View>
          </Card>

          <Section title={`Bu izni içeren roller (${canReadRoles ? rolesWith.length : '—'})`}>
            {!canReadRoles ? (
              <Card>
                <Text variant="label" tone="muted">
                  Rolleri görüntüleme yetkiniz yok.
                </Text>
              </Card>
            ) : rolesWith.length === 0 ? (
              <Card>
                <Text variant="label" tone="muted">
                  Bu izni içeren rol yok.
                </Text>
              </Card>
            ) : (
              <ListCard>
                {rolesWith.map((r) => (
                  <ListRow
                    key={r.id}
                    icon="shield"
                    title={r.name}
                    subtitle={`${moduleLabel(r.module)} · ${r.permissions.length} izin`}
                    trailing={r.isSystem ? <Badge label="Sistem" tone="info" /> : undefined}
                    onPress={() => nav.navigate('iam.roles.detail', { id: r.id }, r.name)}
                  />
                ))}
              </ListCard>
            )}
          </Section>
        </>
      )}
    </Screen>
  )
}
