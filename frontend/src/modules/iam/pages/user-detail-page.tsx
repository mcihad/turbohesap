import * as React from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  ArrowLeft,
  Copy,
  History,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Wand2,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  IamPermissions,
  type RoleDto,
  toApiError,
  type UserDto,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { useRegisterBreadcrumbLabel } from '@/lib/layout/breadcrumb-store'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { formatDateTime } from '@/lib/datetime'
import { cn } from '@/lib/utils'
import { PageHeader, PageWrapper } from '@/components/layout/page'
import { AuditTrail } from '@/components/ui/audit-trail'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { PermissionGroups } from '../components/permission-groups'

const ROUTE = '/_authed/iam/users/$id'
const ACTIVITY_PAGE_SIZE = 10

function initialsOf(u: UserDto): string {
  const fromName = `${u.firstName?.[0] ?? ''}${u.lastName?.[0] ?? ''}`.trim()
  return (fromName || u.username.slice(0, 2)).toUpperCase()
}

function fullName(u: UserDto): string {
  return `${u.firstName} ${u.lastName}`.trim() || u.username
}

export function UserDetailPage() {
  const { id } = useParams({ from: ROUTE })
  const { hasPermission } = useAuth()
  const canRead = hasPermission(IamPermissions.usersRead)

  const userQuery = useQuery({
    queryKey: ['iam', 'users', id],
    queryFn: () => api.iam.users.get(id),
    enabled: canRead,
  })

  const user = userQuery.data

  return (
    <PermissionRequired permission={IamPermissions.usersRead}>
      <PageWrapper>
        {userQuery.isLoading ? (
          <DetailSkeleton />
        ) : !user ? (
          <NotFound />
        ) : (
          <UserDetail user={user} />
        )}
      </PageWrapper>
    </PermissionRequired>
  )
}

function UserDetail({ user }: { user: UserDto }) {
  const { hasPermission } = useAuth()
  const canWrite = hasPermission(IamPermissions.usersWrite)
  const canManageRoles = canWrite && hasPermission(IamPermissions.rolesRead)

  useRegisterBreadcrumbLabel(`/iam/users/${user.id}`, user.username)

  return (
    <>
      <PageHeader
        title={fullName(user)}
        description={`@${user.username} · ${user.email}`}
        audit={{
          entityType: 'User',
          entityId: user.id,
          title: 'Kullanıcı denetim kaydı',
        }}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/iam/users">
              <ArrowLeft />
              Kullanıcılar
            </Link>
          </Button>
        }
      />

      <UserInfoCard user={user} />

      <Tabs defaultValue="roles" className="mt-6">
        <TabsList>
          <TabsTrigger value="roles">
            <ShieldCheck />
            Roller ve Yetkiler
          </TabsTrigger>
          <TabsTrigger value="activity">
            <History />
            İşlem Geçmişi
          </TabsTrigger>
          <TabsTrigger value="ops">
            <KeyRound />
            Diğer İşlemler
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roles">
          <RolesTab key={user.id} user={user} canManageRoles={canManageRoles} />
        </TabsContent>
        <TabsContent value="activity">
          <ActivityTab key={user.id} userId={user.id} />
        </TabsContent>
        <TabsContent value="ops">
          <OperationsTab key={user.id} user={user} canWrite={canWrite} />
        </TabsContent>
      </Tabs>
    </>
  )
}

/* -------------------------------------------------------------------------- */
/* Top info card                                                               */
/* -------------------------------------------------------------------------- */

function UserInfoCard({ user }: { user: UserDto }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-5 pt-6 sm:flex-row sm:items-center">
        <Avatar className="size-16 text-lg">
          <AvatarFallback className="bg-primary/10 text-primary">
            {initialsOf(user)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">{fullName(user)}</h2>
            <Badge variant={user.isActive ? 'success' : 'outline'}>
              {user.isActive ? 'Aktif' : 'Pasif'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            @{user.username} · {user.email}
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {user.roles.length > 0 ? (
              user.roles.map((r) => (
                <Badge key={r.id} variant="secondary">
                  {r.name}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">Rol atanmamış</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-2xs tracking-wide text-muted-foreground uppercase">
              Şubeler:
            </span>
            {user.branches.length > 0 ? (
              user.branches.map((b) => (
                <Badge key={b.id} variant="outline">
                  {b.name}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">Atanmamış</span>
            )}
          </div>
        </div>

        <dl className="grid shrink-0 grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-1">
          <Meta
            label="Telegram Chat ID"
            value={user.telegramChatId || '—'}
          />
          <Meta
            label="Son giriş"
            value={user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'Hiç'}
          />
          <Meta label="Oluşturma" value={formatDateTime(user.createdAt)} />
        </dl>
      </CardContent>
    </Card>
  )
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-2xs tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Roles & permissions tab                                                     */
/* -------------------------------------------------------------------------- */

function RolesTab({
  user,
  canManageRoles,
}: {
  user: UserDto
  canManageRoles: boolean
}) {
  const qc = useQueryClient()

  const [selected, setSelected] = React.useState<string[]>(
    user.roles.map((r) => r.id),
  )

  const rolesQuery = useQuery({
    queryKey: ['iam', 'roles'],
    queryFn: () => api.iam.roles.list(),
    enabled: canManageRoles,
  })
  const allRoles = React.useMemo(
    () => rolesQuery.data ?? [],
    [rolesQuery.data],
  )

  const roleById = React.useMemo(() => {
    const m = new Map<string, RoleDto>()
    for (const r of [...allRoles, ...user.roles]) m.set(r.id, r)
    return m
  }, [allRoles, user.roles])

  const effectiveKeys = React.useMemo(() => {
    const set = new Set<string>()
    for (const rid of selected) {
      for (const p of roleById.get(rid)?.permissions ?? []) set.add(p)
    }
    return [...set].sort()
  }, [selected, roleById])

  const saveMutation = useMutation({
    mutationFn: () => api.iam.users.update(user.id, { roleIds: selected }),
    onSuccess: () => {
      toast.success('Roller güncellendi')
      void qc.invalidateQueries({ queryKey: ['iam', 'users'] })
    },
    onError: (e) =>
      toast.error('Kaydedilemedi', { description: toApiError(e).message }),
  })

  const dirty =
    selected.slice().sort().join(',') !==
    user.roles
      .map((r) => r.id)
      .sort()
      .join(',')

  const toggle = (rid: string, on: boolean) =>
    setSelected((s) => (on ? [...s, rid] : s.filter((x) => x !== rid)))

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Role assignment */}
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-sm">Roller</CardTitle>
          {canManageRoles ? (
            <Button
              size="sm"
              disabled={!dirty || saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              Kaydet
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {canManageRoles ? (
            <div className="space-y-1">
              {allRoles.map((r) => {
                const checked = selected.includes(r.id)
                return (
                  <label
                    key={r.id}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-md border border-transparent p-2 text-sm hover:bg-muted/50',
                      checked && 'border-border bg-muted/40',
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => toggle(r.id, Boolean(v))}
                    />
                    <span className="flex-1">
                      <span className="font-medium">{r.name}</span>
                      {r.description ? (
                        <span className="block text-xs text-muted-foreground">
                          {r.description}
                        </span>
                      ) : null}
                    </span>
                    <Badge variant="outline" className="shrink-0">
                      {r.permissions.length} izin
                    </Badge>
                  </label>
                )
              })}
              {rolesQuery.isLoading ? <Skeleton className="h-10 w-full" /> : null}
              {!rolesQuery.isLoading && allRoles.length === 0 ? (
                <p className="text-sm text-muted-foreground">Rol yok.</p>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {user.roles.length > 0 ? (
                user.roles.map((r) => (
                  <Badge key={r.id} variant="secondary">
                    {r.name}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Rol atanmamış.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Effective permissions — grouped by module, one open at a time. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Etkin yetkiler
            <span className="ml-2 text-xs font-normal text-muted-foreground tabular-nums">
              {effectiveKeys.length}
            </span>
            {canManageRoles && dirty ? (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                (kaydedilmemiş önizleme)
              </span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PermissionGroups
            keys={effectiveKeys}
            single
            emptyText="Seçili rollerden gelen bir yetki yok."
          />
        </CardContent>
      </Card>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Activity history tab                                                        */
/* -------------------------------------------------------------------------- */

function ActivityTab({ userId }: { userId: string }) {
  const { hasPermission } = useAuth()
  const canAudit = hasPermission(IamPermissions.auditRead)
  const [page, setPage] = React.useState(1)

  const query = useQuery({
    queryKey: ['iam', 'audit-logs', { userId, page }],
    queryFn: () =>
      api.iam.auditLogs.list({ userId, page, pageSize: ACTIVITY_PAGE_SIZE }),
    enabled: canAudit,
    placeholderData: keepPreviousData,
  })

  if (!canAudit) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          İşlem geçmişini görüntüleme yetkiniz yok.
        </CardContent>
      </Card>
    )
  }

  const total = query.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / ACTIVITY_PAGE_SIZE))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">
          Bu kullanıcının yaptığı işlemler
          <span className="ml-2 text-xs font-normal text-muted-foreground tabular-nums">
            {total}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <AuditTrail
          logs={query.data?.items ?? []}
          loading={query.isLoading}
          emptyText="Bu kullanıcı henüz bir işlem yapmamış."
          loadDetail={(id) => api.iam.auditLogs.get(id)}
        />
        {total > ACTIVITY_PAGE_SIZE ? (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              sayfa {page}/{totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Önceki
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Sonraki
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */
/* Operations tab                                                              */
/* -------------------------------------------------------------------------- */

function generatePassword(length = 14): string {
  const chars =
    'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%?'
  const buf = new Uint32Array(length)
  crypto.getRandomValues(buf)
  let out = ''
  for (let i = 0; i < length; i++) out += chars[buf[i] % chars.length]
  return out
}

function OperationsTab({
  user,
  canWrite,
}: {
  user: UserDto
  canWrite: boolean
}) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canResetPassword = hasPermission(IamPermissions.usersPassword)
  const [password, setPassword] = React.useState('')
  const [deleteOpen, setDeleteOpen] = React.useState(false)

  const invalidate = () => qc.invalidateQueries({ queryKey: ['iam', 'users'] })

  const statusMutation = useMutation({
    mutationFn: (isActive: boolean) =>
      api.iam.users.update(user.id, { isActive }),
    onSuccess: (_d, isActive) => {
      toast.success(
        isActive ? 'Hesap etkinleştirildi' : 'Hesap devre dışı bırakıldı',
      )
      void invalidate()
    },
    onError: (e) =>
      toast.error('İşlem başarısız', { description: toApiError(e).message }),
  })

  const passwordMutation = useMutation({
    mutationFn: () => api.iam.users.resetPassword(user.id, { password }),
    onSuccess: () => {
      toast.success('Parola sıfırlandı')
      setPassword('')
      void invalidate()
    },
    onError: (e) =>
      toast.error('Parola sıfırlanamadı', { description: toApiError(e).message }),
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.iam.users.remove(user.id),
    onSuccess: () => {
      toast.success('Kullanıcı silindi')
      void invalidate()
      void navigate({ to: '/iam/users' })
    },
    onError: (e) =>
      toast.error('Silme başarısız', { description: toApiError(e).message }),
  })

  if (!canWrite && !canResetPassword) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Bu işlemler için düzenleme yetkiniz yok.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Account status */}
      {canWrite ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Hesap durumu</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">
                {user.isActive ? 'Aktif' : 'Pasif'}
              </p>
              <p className="text-xs text-muted-foreground">
                Pasif kullanıcılar giriş yapamaz.
              </p>
            </div>
            <Switch
              checked={user.isActive}
              disabled={statusMutation.isPending}
              onCheckedChange={(v) => statusMutation.mutate(v)}
            />
          </CardContent>
        </Card>
      ) : null}

      {/* Password reset */}
      {canResetPassword ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Parola sıfırlama</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="new-pass">Yeni parola</Label>
              <div className="flex gap-2">
                <Input
                  id="new-pass"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Yeni parolayı girin veya üretin"
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPassword(generatePassword())}
                  title="Rastgele üret"
                >
                  <Wand2 />
                  <span className="hidden sm:inline">Üret</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={!password}
                  title="Kopyala"
                  onClick={() => {
                    void navigator.clipboard.writeText(password)
                    toast.success('Parola kopyalandı')
                  }}
                >
                  <Copy />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Parolayı kullanıcıya güvenli bir kanaldan iletin; burada tekrar
                görüntülenemez.
              </p>
              <p className="text-xs text-muted-foreground">
                Parola sıfırlandığında kullanıcının açık oturumları kapatılır ve
                yeniden giriş gerekir.
              </p>
            </div>
            <Button
              onClick={() => passwordMutation.mutate()}
              disabled={password.length < 6 || passwordMutation.isPending}
            >
              <RefreshCw />
              Parolayı sıfırla
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Danger zone */}
      {canWrite ? (
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-sm text-destructive">
            Tehlikeli bölge
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Kullanıcıyı sil</p>
            <p className="text-xs text-muted-foreground">
              Bu işlem geri alınamaz; onay için parolanız istenir.
            </p>
          </div>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 />
            Sil
          </Button>
        </CardContent>
      </Card>
      ) : null}

      {canWrite ? (
        <DeletePasswordDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          userName={user.username}
          onConfirmed={() => {
            setDeleteOpen(false)
            deleteMutation.mutate()
          }}
        />
      ) : null}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Delete confirmation (password)                                              */
/* -------------------------------------------------------------------------- */

function DeletePasswordDialog({
  open,
  onOpenChange,
  userName,
  onConfirmed,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  userName: string
  onConfirmed: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-destructive">Kullanıcıyı sil</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{userName}</span> kalıcı
            olarak silinecek. Onaylamak için kendi parolanızı girin.
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <DeletePasswordBody
            onCancel={() => onOpenChange(false)}
            onConfirmed={onConfirmed}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function DeletePasswordBody({
  onCancel,
  onConfirmed,
}: {
  onCancel: () => void
  onConfirmed: () => void
}) {
  const [pw, setPw] = React.useState('')

  const verify = useMutation({
    mutationFn: async () => {
      const { valid } = await api.auth.verifyPassword(pw)
      if (!valid) throw new Error('invalid-password')
    },
    onSuccess: onConfirmed,
    onError: (e) => {
      if (e instanceof Error && e.message === 'invalid-password') {
        toast.error('Parola hatalı')
      } else {
        toast.error('Doğrulanamadı', { description: toApiError(e).message })
      }
    },
  })

  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="del-pw">Parolanız</Label>
        <Input
          id="del-pw"
          type="password"
          value={pw}
          autoFocus
          onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && pw) verify.mutate()
          }}
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          İptal
        </Button>
        <Button
          variant="destructive"
          disabled={!pw || verify.isPending}
          onClick={() => verify.mutate()}
        >
          <Trash2 />
          Kalıcı olarak sil
        </Button>
      </DialogFooter>
    </>
  )
}

/* -------------------------------------------------------------------------- */
/* States                                                                      */
/* -------------------------------------------------------------------------- */

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-28 w-full rounded-xl" />
      <Skeleton className="h-9 w-80" />
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  )
}

function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground">
      <p>Kullanıcı bulunamadı.</p>
      <Button variant="outline" onClick={() => navigate({ to: '/iam/users' })}>
        <ArrowLeft />
        Kullanıcılara dön
      </Button>
    </div>
  )
}
