import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { IamPermissions, MODULES, toApiError, type RoleDto } from '@turbohesap/shared'

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DataGrid, type ColumnDef } from '@/components/data-grid'

function moduleLabel(key: string): string {
  return MODULES.find((m) => m.key === key)?.label ?? (key || '—')
}

interface FormState {
  name: string
  module: string
  description: string
  permissionKeys: string[]
}

const EMPTY: FormState = {
  name: '',
  module: MODULES[0]?.key ?? '',
  description: '',
  permissionKeys: [],
}

export function RolesPage() {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(IamPermissions.rolesRead)
  const canWrite = hasPermission(IamPermissions.rolesWrite)
  const navigate = useNavigate()

  const rolesQuery = useQuery({
    queryKey: ['iam', 'roles'],
    queryFn: () => api.iam.roles.list(),
    enabled: canRead,
  })
  const permsQuery = useQuery({
    queryKey: ['iam', 'permissions'],
    queryFn: () => api.iam.permissions.list(),
    enabled: canRead,
  })

  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<RoleDto | null>(null)
  const [form, setForm] = React.useState<FormState>(EMPTY)
  const [permQuery, setPermQuery] = React.useState('')

  function openCreate() {
    setEditing(null)
    setForm(EMPTY)
    setPermQuery('')
    setOpen(true)
  }
  function openEdit(r: RoleDto) {
    setEditing(r)
    setForm({
      name: r.name,
      module: r.module,
      description: r.description,
      permissionKeys: [...r.permissions],
    })
    setPermQuery('')
    setOpen(true)
  }

  const invalidate = () => qc.invalidateQueries({ queryKey: ['iam', 'roles'] })

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        await api.iam.roles.update(editing.id, {
          name: form.name,
          module: form.module,
          description: form.description,
          permissionKeys: form.permissionKeys,
        })
      } else {
        await api.iam.roles.create({
          name: form.name,
          module: form.module,
          description: form.description,
          permissionKeys: form.permissionKeys,
        })
      }
    },
    onSuccess: () => {
      toast.success(editing ? 'Rol güncellendi' : 'Rol oluşturuldu')
      setOpen(false)
      void invalidate()
    },
    onError: (e) =>
      toast.error('İşlem başarısız', { description: toApiError(e).message }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.iam.roles.remove(id),
    onSuccess: () => {
      toast.success('Rol silindi')
      void invalidate()
    },
    onError: () => toast.error('Silme başarısız (sistem rolleri silinemez)'),
  })

  const roles = rolesQuery.data ?? []
  const perms = permsQuery.data ?? []

  const columns: ColumnDef<RoleDto>[] = [
    {
      id: 'name',
      accessorKey: 'name',
      header: 'Ad',
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      id: 'module',
      accessorFn: (r) => moduleLabel(r.module),
      header: 'Modül',
      enableGrouping: true,
      cell: ({ row }) => (
        <Badge variant="secondary">{moduleLabel(row.original.module)}</Badge>
      ),
    },
    {
      id: 'description',
      accessorKey: 'description',
      header: 'Açıklama',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.description || '—'}
        </span>
      ),
    },
    {
      id: 'permissions',
      accessorFn: (r) => r.permissions.length,
      header: 'İzin',
      cell: ({ row }) => (
        <span className="tabular-nums">{row.original.permissions.length}</span>
      ),
    },
    {
      id: 'type',
      accessorFn: (r) => (r.isSystem ? 'Sistem' : 'Özel'),
      header: 'Tür',
      enableGrouping: true,
      cell: ({ row }) =>
        row.original.isSystem ? (
          <Badge variant="outline">Sistem</Badge>
        ) : (
          <Badge variant="info">Özel</Badge>
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
                  disabled={row.original.isSystem}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm(`"${row.original.name}" rolü silinsin mi?`))
                      deleteMutation.mutate(row.original.id)
                  }}
                  aria-label="Sil"
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ),
          } as ColumnDef<RoleDto>,
        ]
      : []),
  ]

  return (
    <PermissionRequired permission={IamPermissions.rolesRead}>
    <PageWrapper>
      <DataGrid
        gridId="iam.roles"
        data={roles}
        columns={columns}
        getRowId={(r) => r.id}
        loading={rolesQuery.isLoading}
        onRowClick={(r) => navigate({ to: '/iam/roles/$id', params: { id: r.id } })}
        emptyText="Rol yok."
        toolbar={
          canWrite ? (
            <Button onClick={openCreate}>
              <Plus />
              Yeni rol
            </Button>
          ) : null
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Rolü düzenle' : 'Yeni rol'}</DialogTitle>
            <DialogDescription>
              Rolün adını, ait olduğu modülü ve izinlerini belirleyin.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="r-name">Ad</Label>
                <Input
                  id="r-name"
                  value={form.name}
                  disabled={!!editing?.isSystem}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Modül</Label>
                <Select
                  value={form.module}
                  onValueChange={(v) => setForm({ ...form, module: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Modül seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {MODULES.map((m) => (
                      <SelectItem key={m.key} value={m.key}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="r-desc">Açıklama</Label>
              <Input
                id="r-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>İzinler</Label>
                <span className="text-xs text-muted-foreground">
                  {form.permissionKeys.length} seçili
                </span>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={permQuery}
                  onChange={(e) => setPermQuery(e.target.value)}
                  placeholder="İzin ara (anahtar veya açıklama)..."
                  className="h-9 pl-8"
                />
              </div>
              <div className="grid max-h-56 grid-cols-1 gap-2 overflow-auto rounded-md border p-3">
                {(() => {
                  const q = permQuery.trim().toLowerCase()
                  const visible = q
                    ? perms.filter(
                        (p) =>
                          p.key.toLowerCase().includes(q) ||
                          p.description.toLowerCase().includes(q),
                      )
                    : perms
                  if (visible.length === 0) {
                    return (
                      <span className="text-sm text-muted-foreground">
                        Eşleşen izin yok.
                      </span>
                    )
                  }
                  return visible.map((p) => {
                    const checked = form.permissionKeys.includes(p.key)
                    return (
                      <label key={p.key} className="flex items-start gap-2 text-sm">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) =>
                            setForm({
                              ...form,
                              permissionKeys: v
                                ? [...form.permissionKeys, p.key]
                                : form.permissionKeys.filter((k) => k !== p.key),
                            })
                          }
                        />
                        <span>
                          <span className="font-mono text-xs">{p.key}</span>
                          <span className="ml-2 text-muted-foreground">
                            {p.description}
                          </span>
                        </span>
                      </label>
                    )
                  })
                })()}
              </div>
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
