import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { MODULES, type RoleDto } from '@turbohesap/shared'

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

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
  const canRead = hasPermission('iam.roles.read')
  const canWrite = hasPermission('iam.roles.write')

  const rolesQuery = useQuery({
    queryKey: ['iam', 'roles'],
    queryFn: () => api.roles.list(),
    enabled: canRead,
  })
  const permsQuery = useQuery({
    queryKey: ['iam', 'permissions'],
    queryFn: () => api.permissions.list(),
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
        await api.roles.update(editing.id, {
          name: form.name,
          module: form.module,
          description: form.description,
          permissionKeys: form.permissionKeys,
        })
      } else {
        await api.roles.create({
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
    onError: () => toast.error('İşlem başarısız'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.roles.remove(id),
    onSuccess: () => {
      toast.success('Rol silindi')
      void invalidate()
    },
    onError: () => toast.error('Silme başarısız (sistem rolleri silinemez)'),
  })

  const roles = rolesQuery.data ?? []
  const perms = permsQuery.data ?? []

  return (
    <PermissionRequired permission="iam.roles.read">
    <PageWrapper>
      <PageHeader
        title="Roller"
        description="Rolleri ve izinlerini yönetin. Her rol bir modüle aittir."
        actions={
          canWrite ? (
            <Button onClick={openCreate}>
              <Plus />
              Yeni rol
            </Button>
          ) : null
        }
      />

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ad</TableHead>
              <TableHead>Modül</TableHead>
              <TableHead>Açıklama</TableHead>
              <TableHead>İzin</TableHead>
              <TableHead>Tür</TableHead>
              {canWrite ? <TableHead className="w-24 text-right">İşlem</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{moduleLabel(r.module)}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {r.description || '—'}
                </TableCell>
                <TableCell>{r.permissions.length}</TableCell>
                <TableCell>
                  {r.isSystem ? (
                    <Badge variant="outline">Sistem</Badge>
                  ) : (
                    <Badge variant="info">Özel</Badge>
                  )}
                </TableCell>
                {canWrite ? (
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon-sm" onClick={() => openEdit(r)} aria-label="Düzenle">
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      disabled={r.isSystem}
                      onClick={() => {
                        if (confirm(`"${r.name}" rolü silinsin mi?`))
                          deleteMutation.mutate(r.id)
                      }}
                      aria-label="Sil"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
            {!rolesQuery.isLoading && roles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Rol yok.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

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
