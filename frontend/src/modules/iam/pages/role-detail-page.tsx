import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ShieldCheck, Users } from 'lucide-react'

import { IamPermissions, MODULES, type UserDto } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { useRegisterBreadcrumbLabel } from '@/lib/layout/breadcrumb-store'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { PageHeader, PageWrapper } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { PermissionGroups } from '../components/permission-groups'
import { UserMiniList } from '../components/user-mini-list'

const ROUTE = '/_authed/iam/roles/$id'
const MODULE_LABELS = new Map(MODULES.map((m) => [m.key, m.label]))

function moduleLabel(key: string): string {
  return MODULE_LABELS.get(key) ?? key.charAt(0).toUpperCase() + key.slice(1)
}

export function RoleDetailPage() {
  const { id } = useParams({ from: ROUTE })
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(IamPermissions.rolesRead)
  const canReadUsers = hasPermission(IamPermissions.usersRead)

  const roleQuery = useQuery({
    queryKey: ['iam', 'roles', id],
    queryFn: () => api.iam.roles.get(id),
    enabled: canRead,
  })
  const usersQuery = useQuery({
    queryKey: ['iam', 'users'],
    queryFn: () => api.iam.users.list(),
    enabled: canReadUsers,
  })

  const role = roleQuery.data
  useRegisterBreadcrumbLabel(role ? `/iam/roles/${id}` : undefined, role?.name)

  if (roleQuery.isLoading) {
    return (
      <PermissionRequired permission={IamPermissions.rolesRead}>
        <PageWrapper>
          <div className="space-y-6">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </PageWrapper>
      </PermissionRequired>
    )
  }

  if (!role) {
    return (
      <PermissionRequired permission={IamPermissions.rolesRead}>
        <PageWrapper>
          <div className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground">
            <p>Rol bulunamadı.</p>
            <Button variant="outline" onClick={() => navigate({ to: '/iam/roles' })}>
              <ArrowLeft />
              Rollere dön
            </Button>
          </div>
        </PageWrapper>
      </PermissionRequired>
    )
  }

  const usersWithRole: UserDto[] = (usersQuery.data ?? []).filter((u) =>
    u.roles.some((r) => r.id === role.id),
  )

  // Modules the role touches: its own module + the modules of its permissions.
  const affectedModules = [
    ...new Set(
      [
        role.module,
        ...role.permissions.map((p) => p.split('.')[0]),
      ].filter(Boolean),
    ),
  ].sort()

  return (
    <PermissionRequired permission={IamPermissions.rolesRead}>
      <PageWrapper>
        <PageHeader
          title={role.name}
          description={role.description || 'Rol'}
          audit={{
            entityType: 'Role',
            entityId: role.id,
            title: 'Rol denetim kaydı',
          }}
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link to="/iam/roles">
                <ArrowLeft />
                Roller
              </Link>
            </Button>
          }
        />

        {/* Info card */}
        <Card>
          <CardContent className="flex flex-col gap-5 pt-6 sm:flex-row sm:items-center">
            <span className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="size-7" />
            </span>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">{role.name}</h2>
                {role.isSystem ? <Badge variant="outline">Sistem</Badge> : null}
                <Badge variant="secondary">{moduleLabel(role.module)}</Badge>
              </div>
              {role.description ? (
                <p className="text-sm text-muted-foreground">{role.description}</p>
              ) : null}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-xs text-muted-foreground">
                  Etkilenen modüller:
                </span>
                {affectedModules.map((m) => (
                  <Badge key={m} variant="outline">
                    {moduleLabel(m)}
                  </Badge>
                ))}
              </div>
            </div>
            <dl className="grid shrink-0 grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-1">
              <div className="space-y-0.5">
                <dt className="text-2xs tracking-wide text-muted-foreground uppercase">
                  İzin
                </dt>
                <dd className="font-medium tabular-nums">
                  {role.permissions.length}
                </dd>
              </div>
              <div className="space-y-0.5">
                <dt className="text-2xs tracking-wide text-muted-foreground uppercase">
                  Kullanıcı
                </dt>
                <dd className="font-medium tabular-nums">
                  {canReadUsers ? usersWithRole.length : '—'}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Tabs defaultValue="perms" className="mt-6">
          <TabsList>
            <TabsTrigger value="perms">
              <ShieldCheck />
              İzinler
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users />
              Kullanıcılar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="perms">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Bu role bağlı izinler
                  <span className="ml-2 text-xs font-normal text-muted-foreground tabular-nums">
                    {role.permissions.length}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PermissionGroups
                  keys={role.permissions}
                  single
                  emptyText="Bu role atanmış izin yok."
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Bu role sahip kullanıcılar
                  {canReadUsers ? (
                    <span className="ml-2 text-xs font-normal text-muted-foreground tabular-nums">
                      {usersWithRole.length}
                    </span>
                  ) : null}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {canReadUsers ? (
                  <UserMiniList
                    users={usersWithRole}
                    loading={usersQuery.isLoading}
                    emptyText="Bu role sahip kullanıcı yok."
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Kullanıcıları görüntüleme yetkiniz yok.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </PageWrapper>
    </PermissionRequired>
  )
}
