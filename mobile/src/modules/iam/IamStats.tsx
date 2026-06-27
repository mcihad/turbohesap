// IAM dashboard statistics (mobile) — users, active users, roles, permissions.

import * as React from 'react'
import { View } from 'react-native'

import { IamPermissions } from '@turbohesap/shared'

import { StatCard } from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useTheme } from '../../theme/theme-context'

export function IamStats() {
  const t = useTheme()
  const { hasPermission } = useAuth()
  const canUsers = hasPermission(IamPermissions.usersRead)
  const canRoles = hasPermission(IamPermissions.rolesRead)
  const canPerms = hasPermission(IamPermissions.permissionsRead)
  const users = useAsync(() => api.iam.users.list(), [], { enabled: canUsers })
  const roles = useAsync(() => api.iam.roles.list(), [], { enabled: canRoles })
  const perms = useAsync(() => api.iam.permissions.list(), [], { enabled: canPerms })

  const list = users.data ?? []
  const active = list.filter((u) => u.isActive).length

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[3] }}>
      {canUsers ? (
        <>
          <Cell><StatCard icon="users" tone="primary" label="Kullanıcı" value={String(list.length)} /></Cell>
          <Cell><StatCard icon="user-check" tone="success" label="Aktif" value={String(active)} /></Cell>
        </>
      ) : null}
      {canRoles ? <Cell><StatCard icon="shield" tone="info" label="Rol" value={String((roles.data ?? []).length)} /></Cell> : null}
      {canPerms ? <Cell><StatCard icon="key" tone="warning" label="İzin" value={String((perms.data ?? []).length)} /></Cell> : null}
    </View>
  )
}

function Cell({ children }: { children: React.ReactNode }) {
  return <View style={{ width: '47%', flexGrow: 1, flexDirection: 'row' }}>{children}</View>
}
