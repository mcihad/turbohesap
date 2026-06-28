import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  InventoryPermissions,
  toApiError,
  type MovementDirection,
  type StockMovementTypeDto,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { PageWrapper } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { Switch } from '@/components/ui/switch'
import { DataGrid, type ColumnDef } from '@/components/data-grid'

const directionLabel = (d: MovementDirection) => (d === 'in' ? 'Giriş' : 'Çıkış')

export function MovementTypesPage() {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canWrite = hasPermission(InventoryPermissions.productsWrite)

  const [dialog, setDialog] = React.useState<{ editing: StockMovementTypeDto | null } | null>(null)

  const typesQuery = useQuery({
    queryKey: ['inventory', 'movementTypes'],
    queryFn: () => api.inventory.movementTypes.list(),
    enabled: hasPermission(InventoryPermissions.productsRead),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['inventory', 'movementTypes'] })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.inventory.movementTypes.remove(id),
    onSuccess: () => { toast.success('Hareket tipi silindi'); void invalidate() },
    onError: (e) => toast.error('Silinemedi', { description: toApiError(e).message }),
  })

  const types = typesQuery.data ?? []

  const columns: ColumnDef<StockMovementTypeDto>[] = [
    { id: 'name', accessorKey: 'name', header: 'Ad', size: 240, cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    {
      id: 'direction',
      accessorKey: 'direction',
      header: 'Yön',
      size: 120,
      enableGrouping: true,
      accessorFn: (t) => directionLabel(t.direction),
      cell: ({ row }) => (
        <Badge variant={row.original.direction === 'in' ? 'success' : 'destructive'}>
          {directionLabel(row.original.direction)}
        </Badge>
      ),
    },
    {
      id: 'isActive',
      accessorKey: 'isActive',
      header: 'Durum',
      size: 110,
      enableGrouping: true,
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? 'success' : 'outline'}>
          {row.original.isActive ? 'Aktif' : 'Pasif'}
        </Badge>
      ),
    },
    {
      id: 'isSystem',
      accessorKey: 'isSystem',
      header: 'Tür',
      size: 110,
      enableGrouping: true,
      cell: ({ row }) =>
        row.original.isSystem ? <Badge variant="secondary">Sistem</Badge> : <span className="text-muted-foreground">—</span>,
    },
    ...(canWrite
      ? [{
          id: 'actions', header: '', size: 100, enableSorting: false, enableHiding: false, enableColumnFilter: false, enableGrouping: false,
          cell: ({ row }) => (
            <div className="flex justify-end gap-1">
              <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); setDialog({ editing: row.original }) }} title="Düzenle"><Pencil className="size-4" /></Button>
              {row.original.isSystem ? null : (
                <Button variant="ghost" size="icon-sm" onClick={(e) => {
                  e.stopPropagation()
                  if (confirm(`"${row.original.name}" silinsin mi?`)) deleteMutation.mutate(row.original.id)
                }} title="Sil"><Trash2 className="size-4 text-destructive" /></Button>
              )}
            </div>
          ),
        } as ColumnDef<StockMovementTypeDto>]
      : []),
  ]

  return (
    <PermissionRequired permission={InventoryPermissions.productsRead}>
      <PageWrapper>
        <DataGrid
          gridId="inventory.movementTypes"
          data={types}
          columns={columns}
          getRowId={(t) => t.id}
          loading={typesQuery.isLoading}
          emptyText="Henüz hareket tipi yok."
          toolbar={canWrite ? <Button onClick={() => setDialog({ editing: null })}><Plus />Yeni hareket tipi</Button> : null}
        />

        <MovementTypeDialog
          open={dialog !== null}
          onOpenChange={(o) => { if (!o) setDialog(null) }}
          editing={dialog?.editing ?? null}
          onSaved={() => void invalidate()}
        />
      </PageWrapper>
    </PermissionRequired>
  )
}

function MovementTypeDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: StockMovementTypeDto | null
  onSaved: () => void
}) {
  const [name, setName] = React.useState('')
  const [direction, setDirection] = React.useState<MovementDirection>('in')
  const [isActive, setIsActive] = React.useState(true)

  React.useEffect(() => {
    if (!open) return
    setName(editing?.name ?? '')
    setDirection(editing?.direction ?? 'in')
    setIsActive(editing?.isActive ?? true)
  }, [open, editing])

  const save = useMutation({
    mutationFn: () => {
      const payload = { name: name.trim(), direction, isActive }
      return editing
        ? api.inventory.movementTypes.update(editing.id, payload)
        : api.inventory.movementTypes.create(payload)
    },
    onSuccess: () => {
      toast.success(editing ? 'Hareket tipi güncellendi' : 'Hareket tipi oluşturuldu')
      onOpenChange(false)
      onSaved()
    },
    onError: (e) => toast.error('İşlem başarısız', { description: toApiError(e).message }),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'Hareket tipini düzenle' : 'Yeni hareket tipi'}</DialogTitle>
          <DialogDescription>
            Stok hareketlerinde kullanılacak bir giriş/çıkış tipi tanımlayın.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="mt-name">Ad</Label>
            <Input id="mt-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>

          <div className="space-y-1.5">
            <Label>Yön</Label>
            <Select value={direction} onValueChange={(v) => setDirection(v as MovementDirection)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in">Giriş</SelectItem>
                <SelectItem value="out">Çıkış</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            Aktif
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !name.trim()}>
            {editing ? 'Kaydet' : 'Oluştur'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
