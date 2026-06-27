// RolesScreen — IAM roles list (/api/iam/roles). Each role shows its module and
// permission count. Gated by iam.roles.read.

import * as React from 'react'

import { IamPermissions } from '@turbohesap/shared'

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

export function RolesScreen() {
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(IamPermissions.rolesRead)
  const canWrite = hasPermission(IamPermissions.rolesWrite)
  const roles = useAsync(() => api.iam.roles.list(), [], { enabled: canRead })

  return (
    <PermissionRequired permission={IamPermissions.rolesRead} title="Roller" onBack={nav.canGoBack ? nav.goBack : undefined}>
      <Screen
        header={{
          title: 'Roller',
          onBack: nav.canGoBack ? nav.goBack : undefined,
          right: canWrite ? (
            <HeaderAction icon="plus" onPress={() => nav.navigate('iam.roles.form', {}, 'Yeni rol')} />
          ) : undefined,
        }}
        onRefresh={roles.refetch}
        refreshing={roles.refreshing}
      >
        {roles.loading ? (
          <SkeletonRows count={5} />
        ) : roles.error ? (
          <EmptyState icon="alert-triangle" tone="destructive" title="Yüklenemedi" description={roles.error} actionLabel="Tekrar dene" onAction={roles.refetch} />
        ) : (roles.data ?? []).length === 0 ? (
          <EmptyState icon="shield" title="Rol yok" description="Henüz rol tanımlanmamış." actionLabel={canWrite ? 'Yeni rol' : undefined} onAction={canWrite ? () => nav.navigate('iam.roles.form', {}, 'Yeni rol') : undefined} />
        ) : (
          <ListCard>
            {(roles.data ?? []).map((r) => (
              <ListRow
                key={r.id}
                icon="shield"
                title={r.name}
                subtitle={r.description || `${r.permissions.length} izin`}
                trailing={<Badge label={r.isSystem ? 'Sistem' : r.module} tone={r.isSystem ? 'info' : 'primary'} />}
                onPress={() => nav.navigate('iam.roles.detail', { id: r.id }, r.name)}
              />
            ))}
          </ListCard>
        )}
      </Screen>
    </PermissionRequired>
  )
}
