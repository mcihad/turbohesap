import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import type { UserDto } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { PageHeader, PageWrapper } from '@/components/layout/page'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface FormState {
  username: string
  email: string
  password: string
  firstName: string
  lastName: string
  isActive: boolean
  roleIds: string[]
}

const EMPTY: FormState = {
  username: '',
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  isActive: true,
  roleIds: [],
}

export function UsersPage() {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canRead = hasPermission('iam.users.read')
  const canWrite = hasPermission('iam.users.write')

  const usersQuery = useQuery({
    queryKey: ['iam', 'users'],
    queryFn: () => api.users.list(),
    enabled: canRead,
  })
  const rolesQuery = useQuery({
    queryKey: ['iam', 'roles'],
    queryFn: () => api.roles.list(),
    enabled: canRead,
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
      isActive: u.isActive,
      roleIds: u.roles.map((r) => r.id),
    })
    setOpen(true)
  }

  const invalidate = () => qc.invalidateQueries({ queryKey: ['iam', 'users'] })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        await api.users.update(editing.id, {
          email: form.email,
          firstName: form.firstName,
          lastName: form.lastName,
          isActive: form.isActive,
          roleIds: form.roleIds,
          ...(form.password ? { password: form.password } : {}),
        })
      } else {
        await api.users.create({
          username: form.username,
          email: form.email,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
          isActive: form.isActive,
          roleIds: form.roleIds,
        })
      }
    },
    onSuccess: () => {
      toast.success(editing ? 'Kullanıcı güncellendi' : 'Kullanıcı oluşturuldu')
      setOpen(false)
      void invalidate()
    },
    onError: () => toast.error('İşlem başarısız'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.users.remove(id),
    onSuccess: () => {
      toast.success('Kullanıcı silindi')
      void invalidate()
    },
    onError: () => toast.error('Silme başarısız'),
  })

  const users = usersQuery.data ?? []
  const roles = rolesQuery.data ?? []

  return (
    <PermissionRequired permission="iam.users.read">
    <PageWrapper>
      <PageHeader
        title="Kullanıcılar"
        description="Sistem kullanıcılarını yönetin."
        actions={
          canWrite ? (
            <Button onClick={openCreate}>
              <Plus />
              Yeni kullanıcı
            </Button>
          ) : null
        }
      />

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kullanıcı adı</TableHead>
              <TableHead>Ad Soyad</TableHead>
              <TableHead>E-posta</TableHead>
              <TableHead>Roller</TableHead>
              <TableHead>Durum</TableHead>
              {canWrite ? <TableHead className="w-24 text-right">İşlem</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.username}</TableCell>
                <TableCell>{`${u.firstName} ${u.lastName}`.trim() || '—'}</TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {u.roles.map((r) => (
                      <Badge key={r.id} variant="secondary">
                        {r.name}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={u.isActive ? 'success' : 'outline'}>
                    {u.isActive ? 'Aktif' : 'Pasif'}
                  </Badge>
                </TableCell>
                {canWrite ? (
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon-sm" onClick={() => openEdit(u)} aria-label="Düzenle">
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => {
                        if (confirm(`"${u.username}" kullanıcısı silinsin mi?`))
                          deleteMutation.mutate(u.id)
                      }}
                      aria-label="Sil"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
            {!usersQuery.isLoading && users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Kullanıcı yok.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

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
