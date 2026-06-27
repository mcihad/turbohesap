// IAM dashboard statistics — users, roles, permissions, active users.

import { useQuery } from '@tanstack/react-query'
import { KeyRound, ShieldCheck, UserCheck, Users } from 'lucide-react'

import { IamPermissions } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { StatGrid, StatTile } from '@/components/layout/stat-tile'

export function IamStats() {
  const { hasPermission } = useAuth()
  const canUsers = hasPermission(IamPermissions.usersRead)
  const canRoles = hasPermission(IamPermissions.rolesRead)
  const canPerms = hasPermission(IamPermissions.permissionsRead)

  const usersQuery = useQuery({
    queryKey: ['iam', 'users'],
    queryFn: () => api.iam.users.list(),
    enabled: canUsers,
  })
  const rolesQuery = useQuery({
    queryKey: ['iam', 'roles'],
    queryFn: () => api.iam.roles.list(),
    enabled: canRoles,
  })
  const permsQuery = useQuery({
    queryKey: ['iam', 'permissions'],
    queryFn: () => api.iam.permissions.list(),
    enabled: canPerms,
  })

  const users = usersQuery.data ?? []
  const active = users.filter((u) => u.isActive).length

  return (
    <StatGrid>
      {canUsers ? (
        <>
          <StatTile icon={Users} tone="primary" label="Kullanıcı" value={users.length} loading={usersQuery.isLoading} />
          <StatTile icon={UserCheck} tone="success" label="Aktif kullanıcı" value={active} loading={usersQuery.isLoading} />
        </>
      ) : null}
      {canRoles ? (
        <StatTile icon={ShieldCheck} tone="info" label="Rol" value={(rolesQuery.data ?? []).length} loading={rolesQuery.isLoading} />
      ) : null}
      {canPerms ? (
        <StatTile icon={KeyRound} tone="muted" label="İzin" value={(permsQuery.data ?? []).length} loading={permsQuery.isLoading} />
      ) : null}
    </StatGrid>
  )
}
