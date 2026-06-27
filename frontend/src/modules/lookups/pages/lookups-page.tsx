import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ListChecks, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  LookupsPermissions,
  toApiError,
  type LookupItemDto,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { PageWrapper } from '@/components/layout/page'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
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
import { Switch } from '@/components/ui/switch'
import { DataGrid, type ColumnDef } from '@/components/data-grid'

interface ItemForm {
  list: string
  key: string
  value: string
  sortOrder: string
  isActive: boolean
}

export function LookupsPage() {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canWrite = hasPermission(LookupsPermissions.write)

  const itemsQuery = useQuery({
    queryKey: ['lookups', 'items', '__all__'],
    queryFn: () => api.lookups.list(),
    enabled: hasPermission(LookupsPermissions.read),
  })

  const [dialog, setDialog] = React.useState<
    | { mode: 'create'; list: string }
    | { mode: 'edit'; item: LookupItemDto }
    | { mode: 'new-list' }
    | null
  >(null)

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ['lookups'] })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.lookups.remove(id),
    onSuccess: () => {
      toast.success('Öğe silindi')
      void invalidate()
    },
    onError: (e) => toast.error('Silinemedi', { description: toApiError(e).message }),
  })

  const items = itemsQuery.data ?? []
  const groups = React.useMemo(() => {
    const map = new Map<string, LookupItemDto[]>()
    for (const i of items) {
      const arr = map.get(i.list) ?? []
      arr.push(i)
      map.set(i.list, arr)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [items])

  const columns = React.useMemo<ColumnDef<LookupItemDto, unknown>[]>(
    () => [
      {
        id: 'value',
        accessorKey: 'value',
        header: 'Değer',
        cell: ({ row }) => <span className="font-medium">{row.original.value}</span>,
      },
      {
        id: 'key',
        accessorKey: 'key',
        header: 'Anahtar',
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">{row.original.key}</span>
        ),
      },
      {
        id: 'sortOrder',
        accessorKey: 'sortOrder',
        header: 'Sıra',
        size: 80,
        cell: ({ row }) => (
          <span className="block text-right tabular-nums">{row.original.sortOrder}</span>
        ),
      },
      {
        id: 'isActive',
        accessorKey: 'isActive',
        header: 'Durum',
        size: 100,
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
                      setDialog({ mode: 'edit', item: row.original })
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
                      if (confirm(`"${row.original.value}" silinsin mi?`))
                        deleteMutation.mutate(row.original.id)
                    }}
                    aria-label="Sil"
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              ),
            } as ColumnDef<LookupItemDto, unknown>,
          ]
        : []),
    ],
    [canWrite, deleteMutation],
  )

  return (
    <PermissionRequired permission={LookupsPermissions.read}>
      <PageWrapper>
        <div className="mb-3 flex items-center justify-end gap-2">
          {canWrite ? (
            <Button onClick={() => setDialog({ mode: 'new-list' })}>
              <Plus />
              Yeni liste
            </Button>
          ) : null}
        </div>

        {groups.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground">
            <ListChecks className="size-10" />
            <p className="text-sm">
              Henüz liste yok.{' '}
              {canWrite ? '“Yeni liste” ile ilk listenizi oluşturun.' : ''}
            </p>
          </div>
        ) : (
          <Accordion type="multiple" defaultValue={[]}>
            {groups.map(([list, listItems]) => (
              <AccordionItem key={list} value={list}>
                <AccordionTrigger>
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-sm">{list}</span>
                    <Badge variant="secondary">{listItems.length}</Badge>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <DataGrid
                    gridId={`lookups.items.${list}`}
                    data={listItems
                      .slice()
                      .sort(
                        (a, b) =>
                          a.sortOrder - b.sortOrder || a.value.localeCompare(b.value),
                      )}
                    columns={columns}
                    getRowId={(row) => row.id}
                    loading={itemsQuery.isLoading}
                    emptyText="Öğe yok."
                    toolbar={
                      canWrite ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDialog({ mode: 'create', list })}
                        >
                          <Plus />
                          Yeni öğe
                        </Button>
                      ) : null
                    }
                  />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}

        <ItemDialog
          state={dialog}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null)
            void invalidate()
          }}
        />
      </PageWrapper>
    </PermissionRequired>
  )
}

function ItemDialog({
  state,
  onClose,
  onSaved,
}: {
  state:
    | { mode: 'create'; list: string }
    | { mode: 'edit'; item: LookupItemDto }
    | { mode: 'new-list' }
    | null
  onClose: () => void
  onSaved: () => void
}) {
  const open = state !== null
  const mode = state?.mode

  const [form, setForm] = React.useState<ItemForm>({
    list: '',
    key: '',
    value: '',
    sortOrder: '0',
    isActive: true,
  })

  React.useEffect(() => {
    if (!state) return
    if (state.mode === 'edit') {
      setForm({
        list: state.item.list,
        key: state.item.key,
        value: state.item.value,
        sortOrder: String(state.item.sortOrder),
        isActive: state.item.isActive,
      })
    } else if (state.mode === 'create') {
      setForm({ list: state.list, key: '', value: '', sortOrder: '0', isActive: true })
    } else {
      setForm({ list: '', key: '', value: '', sortOrder: '0', isActive: true })
    }
  }, [state])

  const mutation = useMutation({
    mutationFn: async () => {
      if (state?.mode === 'edit') {
        await api.lookups.update(state.item.id, {
          key: form.key.trim() || undefined,
          value: form.value.trim(),
          sortOrder: Number(form.sortOrder) || 0,
          isActive: form.isActive,
        })
      } else {
        await api.lookups.create({
          list: form.list.trim(),
          value: form.value.trim(),
          key: form.key.trim() || undefined,
          sortOrder: Number(form.sortOrder) || 0,
          isActive: form.isActive,
        })
      }
    },
    onSuccess: () => {
      toast.success(mode === 'edit' ? 'Öğe güncellendi' : 'Öğe eklendi')
      onSaved()
    },
    onError: (e) => toast.error('Kaydedilemedi', { description: toApiError(e).message }),
  })

  const title =
    mode === 'edit' ? 'Öğeyi düzenle' : mode === 'new-list' ? 'Yeni liste' : 'Yeni öğe'
  const canSave =
    form.value.trim() !== '' &&
    (mode === 'edit' || form.list.trim() !== '')

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {mode === 'new-list'
              ? 'Bir liste adı ve ilk değeri girin. Anahtar boş bırakılırsa otomatik üretilir.'
              : 'Değer zorunludur; anahtar boş bırakılırsa otomatik üretilir.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {mode !== 'edit' ? (
            <div className="space-y-1.5">
              <Label htmlFor="lk-list">Liste adı</Label>
              <Input
                id="lk-list"
                value={form.list}
                disabled={mode === 'create'}
                onChange={(e) => setForm({ ...form, list: e.target.value })}
                placeholder="örn. birim"
                className="font-mono"
              />
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lk-value">Değer</Label>
              <Input
                id="lk-value"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                placeholder="örn. Kilogram"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lk-key">Anahtar (ops.)</Label>
              <Input
                id="lk-key"
                value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value })}
                placeholder="otomatik"
                className="font-mono"
              />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="space-y-1.5">
              <Label htmlFor="lk-order">Sıra</Label>
              <Input
                id="lk-order"
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                className="w-24"
              />
            </div>
            <label className="flex items-center gap-2 pt-5 text-sm">
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
              Aktif
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            İptal
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!canSave || mutation.isPending}>
            {mode === 'edit' ? 'Kaydet' : 'Ekle'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
