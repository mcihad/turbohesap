import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  IamPermissions,
  OrgPermissions,
  toApiError,
  type UserDto,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { PageWrapper } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { DataGrid, type ColumnDef } from '@/components/data-grid'

interface FormState {
  username: string
  email: string
  password: string
  firstName: string
  lastName: string
  telegramChatId: string
  isActive: boolean
  roleIds: string[]
  branchIds: string[]
}

const EMPTY: FormState = {
  username: '',
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  telegramChatId: '',
  isActive: true,
  roleIds: [],
  branchIds: [],
}

export function UsersPage() {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(IamPermissions.usersRead)
  const canWrite = hasPermission(IamPermissions.usersWrite)
  // Branch assignment needs branch read access (the same key the server enforces).
  const canReadBranches = hasPermission(OrgPermissions.branchesRead)
  const navigate = useNavigate()

  const usersQuery = useQuery({
    queryKey: ['iam', 'users'],
    queryFn: () => api.iam.users.list(),
    enabled: canRead,
  })
  const rolesQuery = useQuery({
    queryKey: ['iam', 'roles'],
    queryFn: () => api.iam.roles.list(),
    enabled: canRead,
  })
  const branchesQuery = useQuery({
    queryKey: ['org', 'branches'],
    queryFn: () => api.org.branches.list(),
    enabled: canRead && canReadBranches,
  })

  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<UserDto | null>(null)
  const [form, setForm] = React.useState<FormState>(EMPTY)

  function openCreate() {
    setEditing(null)
    setForm(EMPTY)
    setOpen(true)
  }
  function openEdit(u: UserDto) {
    setEditing(u)
    setForm({
      username: u.username,
      email: u.email,
      password: '',
      firstName: u.firstName,
      lastName: u.lastName,
      telegramChatId: u.telegramChatId ?? '',
      isActive: u.isActive,
      roleIds: u.roles.map((r) => r.id),
      branchIds: u.branches.map((b) => b.id),
    })
    setOpen(true)
  }

  const invalidate = () => qc.invalidateQueries({ queryKey: ['iam', 'users'] })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        await api.iam.users.update(editing.id, {
          email: form.email,
          firstName: form.firstName,
          lastName: form.lastName,
          telegramChatId: form.telegramChatId.trim() || null,
          isActive: form.isActive,
          roleIds: form.roleIds,
          ...(canReadBranches ? { branchIds: form.branchIds } : {}),
          ...(form.password ? { password: form.password } : {}),
        })
      } else {
        await api.iam.users.create({
          username: form.username,
          email: form.email,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
          telegramChatId: form.telegramChatId.trim() || null,
          isActive: form.isActive,
          roleIds: form.roleIds,
          ...(canReadBranches ? { branchIds: form.branchIds } : {}),
        })
      }
    },
    onSuccess: () => {
      toast.success(editing ? 'Kullanıcı güncellendi' : 'Kullanıcı oluşturuldu')
      setOpen(false)
      void invalidate()
    },
    onError: (e) =>
      toast.error('İşlem başarısız', { description: toApiError(e).message }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.iam.users.remove(id),
    onSuccess: () => {
      toast.success('Kullanıcı silindi')
      void invalidate()
    },
    onError: () => toast.error('Silme başarısız'),
  })

  const users = usersQuery.data ?? []
  const roles = rolesQuery.data ?? []
  const branches = branchesQuery.data ?? []

  const columns: ColumnDef<UserDto>[] = [
    {
      id: 'username',
      accessorKey: 'username',
      header: 'Kullanıcı adı',
      cell: ({ row }) => <span className="font-medium">{row.original.username}</span>,
    },
    {
      id: 'fullName',
      accessorFn: (u) => `${u.firstName} ${u.lastName}`.trim() || '—',
      header: 'Ad Soyad',
      cell: ({ row }) => `${row.original.firstName} ${row.original.lastName}`.trim() || '—',
    },
    {
      id: 'email',
      accessorKey: 'email',
      header: 'E-posta',
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span>,
    },
    {
      id: 'roles',
      header: 'Roller',
      enableSorting: false,
      enableColumnFilter: false,
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.roles.map((r) => (
            <Badge key={r.id} variant="secondary">
              {r.name}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      id: 'isActive',
      accessorKey: 'isActive',
      header: 'Durum',
      enableGrouping: true,
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? 'success' : 'outline'}>
          {row.original.isActive ? 'Aktif' : 'Pasif'}
        </Badge>
      ),
    },
    ...(canWrite
      ? [
          {
            id: 'actions',
            header: '',
            size: 90,
            enableSorting: false,
            enableHiding: false,
            enableColumnFilter: false,
            enableGrouping: false,
            cell: ({ row }) => (
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    openEdit(row.original)
                  }}
                  aria-label="Düzenle"
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm(`"${row.original.username}" kullanıcısı silinsin mi?`))
                      deleteMutation.mutate(row.original.id)
                  }}
                  aria-label="Sil"
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ),
          } as ColumnDef<UserDto>,
        ]
      : []),
  ]

  return (
    <PermissionRequired permission={IamPermissions.usersRead}>
    <PageWrapper>
      <DataGrid
        gridId="iam.users"
        data={users}
        columns={columns}
        getRowId={(u) => u.id}
        loading={usersQuery.isLoading}
        onRowClick={(u) => navigate({ to: '/iam/users/$id', params: { id: u.id } })}
        emptyText="Kullanıcı yok."
        toolbar={
          canWrite ? (
            <Button onClick={openCreate}>
              <Plus />
              Yeni kullanıcı
            </Button>
          ) : null
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Kullanıcıyı düzenle' : 'Yeni kullanıcı'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Parolayı değiştirmek istemiyorsanız boş bırakın.'
                : 'Yeni bir kullanıcı oluşturun ve roller atayın.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="u-username">Kullanıcı adı</Label>
                <Input
                  id="u-username"
                  value={form.username}
                  disabled={!!editing}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="u-email">E-posta</Label>
                <Input
                  id="u-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="u-first">Ad</Label>
                <Input
                  id="u-first"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="u-last">Soyad</Label>
                <Input
                  id="u-last"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="u-telegram">Telegram Chat ID</Label>
              <Input
                id="u-telegram"
                value={form.telegramChatId}
                onChange={(e) => setForm({ ...form, telegramChatId: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Bildirim ve mesajların Telegram'dan gönderilebilmesi için kullanıcının chat
                ID'si.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="u-pass">Parola {editing ? '(opsiyonel)' : ''}</Label>
              <Input
                id="u-pass"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Roller</Label>
              <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
                {roles.map((r) => {
                  const checked = form.roleIds.includes(r.id)
                  return (
                    <label key={r.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) =>
                          setForm({
                            ...form,
                            roleIds: v
                              ? [...form.roleIds, r.id]
                              : form.roleIds.filter((id) => id !== r.id),
                          })
                        }
                      />
                      {r.name}
                    </label>
                  )
                })}
                {roles.length === 0 ? (
                  <span className="text-sm text-muted-foreground">Rol yok</span>
                ) : null}
              </div>
            </div>

            {canReadBranches ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Yetkili olduğu şubeler</Label>
                  <span className="text-xs text-muted-foreground">
                    {form.branchIds.length} seçili
                  </span>
                </div>
                <div className="grid max-h-40 grid-cols-1 gap-2 overflow-auto rounded-md border p-3 sm:grid-cols-2">
                  {branches.map((b) => {
                    const checked = form.branchIds.includes(b.id)
                    return (
                      <label key={b.id} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) =>
                            setForm({
                              ...form,
                              branchIds: v
                                ? [...form.branchIds, b.id]
                                : form.branchIds.filter((id) => id !== b.id),
                            })
                          }
                        />
                        <span className="truncate">
                          {b.name}
                          <span className="ml-1 font-mono text-xs text-muted-foreground">
                            {b.code}
                          </span>
                        </span>
                      </label>
                    )
                  })}
                  {branches.length === 0 ? (
                    <span className="text-sm text-muted-foreground">Şube yok</span>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="flex items-center gap-2">
              <Switch
                id="u-active"
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
              <Label htmlFor="u-active">Aktif</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              İptal
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              {editing ? 'Kaydet' : 'Oluştur'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
    </PermissionRequired>
  )
}
