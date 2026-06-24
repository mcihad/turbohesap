import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, KeyRound, ShieldCheck, Users } from 'lucide-react'

import { IamPermissions, MODULES, type RoleDto } from '@turbohesap/shared'

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
import { UserMiniList } from '../components/user-mini-list'

const ROUTE = '/_authed/iam/permissions/$key'
const MODULE_LABELS = new Map(MODULES.map((m) => [m.key, m.label]))

function moduleLabel(key: string): string {
  return MODULE_LABELS.get(key) ?? key.charAt(0).toUpperCase() + key.slice(1)
}

export function PermissionDetailPage() {
  const { key } = useParams({ from: ROUTE })
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(IamPermissions.permissionsRead)
  const canReadRoles = hasPermission(IamPermissions.rolesRead)
  const canReadUsers = hasPermission(IamPermissions.usersRead)

  const permsQuery = useQuery({
    queryKey: ['iam', 'permissions'],
    queryFn: () => api.iam.permissions.list(),
    enabled: canRead,
  })
  const rolesQuery = useQuery({
    queryKey: ['iam', 'roles'],
    queryFn: () => api.iam.roles.list(),
    enabled: canReadRoles,
  })
  const usersQuery = useQuery({
    queryKey: ['iam', 'users'],
    queryFn: () => api.iam.users.list(),
    enabled: canReadUsers,
  })

  const permission = permsQuery.data?.find((p) => p.key === key)
  useRegisterBreadcrumbLabel(
    permission ? `/iam/permissions/${key}` : undefined,
    permission?.description || key,
  )

  if (permsQuery.isLoading) {
    return (
      <PermissionRequired permission={IamPermissions.permissionsRead}>
        <PageWrapper>
          <div className="space-y-6">
            <Skeleton className="h-9 w-72" />
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </PageWrapper>
      </PermissionRequired>
    )
  }

  if (!permission) {
    return (
      <PermissionRequired permission={IamPermissions.permissionsRead}>
        <PageWrapper>
          <div className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground">
            <p>İzin bulunamadı.</p>
            <Button
              variant="outline"
              onClick={() => navigate({ to: '/iam/permissions' })}
            >
              <ArrowLeft />
              İzinlere dön
            </Button>
          </div>
        </PageWrapper>
      </PermissionRequired>
    )
  }

  const [moduleKey, resource, action] = key.split('.')
  const rolesWithPerm: RoleDto[] = (rolesQuery.data ?? []).filter((r) =>
    r.permissions.includes(key),
  )
  const usersWithPerm = (usersQuery.data ?? []).filter((u) =>
    u.roles.some((r) => r.permissions.includes(key)),
  )

  return (
    <PermissionRequired permission={IamPermissions.permissionsRead}>
      <PageWrapper>
        <PageHeader
          title={permission.description || key}
          description={key}
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link to="/iam/permissions">
                <ArrowLeft />
                İzinler
              </Link>
            </Button>
          }
        />

        {/* Info card */}
        <Card>
          <CardContent className="flex flex-col gap-5 pt-6 sm:flex-row sm:items-center">
            <span className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <KeyRound className="size-7" />
            </span>
            <div className="min-w-0 flex-1 space-y-2">
              <p className="font-mono text-sm break-all">{key}</p>
              {permission.description ? (
                <p className="text-sm text-muted-foreground">
                  {permission.description}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <Badge variant="secondary">{moduleLabel(moduleKey)}</Badge>
                {resource ? <Badge variant="outline">{resource}</Badge> : null}
                {action ? (
                  <Badge variant="outline" className="font-mono">
                    {action}
                  </Badge>
                ) : null}
              </div>
            </div>
            <dl className="grid shrink-0 grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-1">
              <div className="space-y-0.5">
                <dt className="text-2xs tracking-wide text-muted-foreground uppercase">
                  Rol
                </dt>
                <dd className="font-medium tabular-nums">
                  {canReadRoles ? rolesWithPerm.length : '—'}
                </dd>
              </div>
              <div className="space-y-0.5">
                <dt className="text-2xs tracking-wide text-muted-foreground uppercase">
                  Kullanıcı
                </dt>
                <dd className="font-medium tabular-nums">
                  {canReadUsers ? usersWithPerm.length : '—'}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Tabs defaultValue="roles" className="mt-6">
          <TabsList>
            <TabsTrigger value="roles">
              <ShieldCheck />
              Roller
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users />
              Kullanıcılar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="roles">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Bu izni içeren roller
                  {canReadRoles ? (
                    <span className="ml-2 text-xs font-normal text-muted-foreground tabular-nums">
                      {rolesWithPerm.length}
                    </span>
                  ) : null}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!canReadRoles ? (
                  <p className="text-sm text-muted-foreground">
                    Rolleri görüntüleme yetkiniz yok.
                  </p>
                ) : rolesWithPerm.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Bu izni içeren rol yok.
                  </p>
                ) : (
                  <ul className="divide-y overflow-hidden rounded-lg border">
                    {rolesWithPerm.map((r) => (
                      <li key={r.id}>
                        <Link
                          to="/iam/roles/$id"
                          params={{ id: r.id }}
                          className="flex items-center gap-3 p-3 transition-colors hover:bg-muted/50"
                        >
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <ShieldCheck className="size-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {r.name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {moduleLabel(r.module)} · {r.permissions.length} izin
                            </p>
                          </div>
                          {r.isSystem ? (
                            <Badge variant="outline">Sistem</Badge>
                          ) : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Bu izne sahip kullanıcılar
                  {canReadUsers ? (
                    <span className="ml-2 text-xs font-normal text-muted-foreground tabular-nums">
                      {usersWithPerm.length}
                    </span>
                  ) : null}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {canReadUsers ? (
                  <UserMiniList
                    users={usersWithPerm}
                    loading={usersQuery.isLoading}
                    emptyText="Bu izne sahip kullanıcı yok."
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
