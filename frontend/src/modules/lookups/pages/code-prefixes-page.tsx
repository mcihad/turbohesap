import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  CODE_PREFIX_CONTEXT_LABELS,
  LookupsPermissions,
  codePrefixContextLabel,
  toApiError,
  type CodePrefixDto,
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

interface FormState {
  context: string
  prefix: string
  padding: string
  nextNumber: string
  incrementOnSave: boolean
  isActive: boolean
}

const CONTEXT_OPTIONS = Object.entries(CODE_PREFIX_CONTEXT_LABELS) as [string, string][]

const EMPTY: FormState = {
  context: CONTEXT_OPTIONS[0]?.[0] ?? '',
  prefix: '',
  padding: '4',
  nextNumber: '1',
  incrementOnSave: false,
  isActive: true,
}

function fromDto(p: CodePrefixDto): FormState {
  return {
    context: p.context,
    prefix: p.prefix,
    padding: String(p.padding),
    nextNumber: String(p.nextNumber),
    incrementOnSave: p.incrementOnSave,
    isActive: p.isActive,
  }
}

function toPayload(form: FormState) {
  return {
    context: form.context.trim(),
    prefix: form.prefix.trim(),
    padding: Number(form.padding) || 4,
    nextNumber: Number(form.nextNumber) || 1,
    incrementOnSave: form.incrementOnSave,
    isActive: form.isActive,
  }
}

export function CodePrefixesPage() {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(LookupsPermissions.codePrefixesRead)
  const canWrite = hasPermission(LookupsPermissions.codePrefixesWrite)

  const query = useQuery({
    queryKey: ['lookups', 'code-prefixes'],
    queryFn: () => api.codePrefixes.list(),
    enabled: canRead,
  })

  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<CodePrefixDto | null>(null)
  const [form, setForm] = React.useState<FormState>(EMPTY)
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  function openCreate() {
    setEditing(null)
    setForm(EMPTY)
    setOpen(true)
  }
  function openEdit(p: CodePrefixDto) {
    setEditing(p)
    setForm(fromDto(p))
    setOpen(true)
  }

  const invalidate = () => qc.invalidateQueries({ queryKey: ['lookups', 'code-prefixes'] })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = toPayload(form)
      if (editing) await api.codePrefixes.update(editing.id, payload)
      else await api.codePrefixes.create(payload)
    },
    onSuccess: () => {
      toast.success(editing ? 'Önek güncellendi' : 'Önek oluşturuldu')
      setOpen(false)
      void invalidate()
    },
    onError: (e) => toast.error('İşlem başarısız', { description: toApiError(e).message }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.codePrefixes.remove(id),
    onSuccess: () => {
      toast.success('Önek silindi')
      void invalidate()
    },
    onError: (e) => toast.error('Silme başarısız', { description: toApiError(e).message }),
  })

  const rows = query.data ?? []

  const columns: ColumnDef<CodePrefixDto>[] = [
    {
      id: 'context',
      accessorKey: 'context',
      header: 'Bağlam',
      size: 220,
      enableGrouping: true,
      cell: ({ row }) => (
        <div className="leading-tight">
          <p>{codePrefixContextLabel(row.original.context)}</p>
          <p className="font-mono text-2xs text-muted-foreground">{row.original.context}</p>
        </div>
      ),
    },
    { id: 'prefix', accessorKey: 'prefix', header: 'Önek', size: 100, cell: ({ row }) => <span className="font-mono font-medium">{row.original.prefix}</span> },
    { id: 'padding', accessorKey: 'padding', header: 'Dolgu', size: 80 },
    { id: 'previewCode', accessorKey: 'previewCode', header: 'Sıradaki kod', size: 140, cell: ({ row }) => <span className="font-mono text-muted-foreground">{row.original.previewCode}</span> },
    {
      id: 'incrementOnSave',
      accessorKey: 'incrementOnSave',
      header: 'Artış zamanı',
      size: 170,
      enableGrouping: true,
      cell: ({ row }) => (
        <Badge variant="secondary">
          {row.original.incrementOnSave ? 'Kaydettikten sonra' : 'Kaydetmeden'}
        </Badge>
      ),
    },
    { id: 'isActive', accessorKey: 'isActive', header: 'Durum', size: 100, enableGrouping: true, cell: ({ row }) => <Badge variant={row.original.isActive ? 'success' : 'outline'}>{row.original.isActive ? 'Aktif' : 'Pasif'}</Badge> },
    ...(canWrite
      ? [{
          id: 'actions', header: '', size: 60, enableSorting: false, enableHiding: false, enableColumnFilter: false, enableGrouping: false,
          cell: ({ row }) => (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm(`"${row.original.prefix}" öneki silinsin mi?`)) deleteMutation.mutate(row.original.id)
                }}
                aria-label="Sil"
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ),
        } as ColumnDef<CodePrefixDto>]
      : []),
  ]

  return (
    <PermissionRequired permission={LookupsPermissions.codePrefixesRead}>
      <PageWrapper>
        <DataGrid
          gridId="lookups.codePrefixes"
          data={rows}
          columns={columns}
          getRowId={(p) => p.id}
          loading={query.isLoading}
          onRowClick={canWrite ? openEdit : undefined}
          emptyText="Kod öneki tanımlı değil."
          toolbar={canWrite ? <Button onClick={openCreate}><Plus />Yeni önek</Button> : null}
        />

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Öneki düzenle' : 'Yeni kod öneki'}</DialogTitle>
              <DialogDescription>
                Bir bağlam için önek (örn. "ST-") ve sayaç ayarlarını tanımlayın.
                Bağlam, bu öneğin hangi formda (örn. ürün ekleme) sunulacağını belirler.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 py-2">
              <Field label="Bağlam">
                <Select value={form.context} onValueChange={(v) => set('context', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Bağlam seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTEXT_OPTIONS.map(([context, label]) => (
                      <SelectItem key={context} value={context}>
                        {label}
                        <span className="ml-1.5 font-mono text-2xs text-muted-foreground">{context}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-2xs text-muted-foreground">
                  Yeni bir bağlam, ilgili forma &lt;CodePrefixInput&gt; eklenip
                  <code className="mx-1 font-mono">CodePrefixContexts</code> kaydına
                  girilince burada seçilebilir hale gelir.
                </p>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Önek">
                  <Input
                    value={form.prefix}
                    onChange={(e) => set('prefix', e.target.value)}
                    placeholder="ST-"
                    className="font-mono"
                  />
                </Field>
                <Field label="Dolgu (basamak)">
                  <Input
                    type="number"
                    min={1}
                    value={form.padding}
                    onChange={(e) => set('padding', e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Sıradaki sayı">
                <Input
                  type="number"
                  min={1}
                  value={form.nextNumber}
                  onChange={(e) => set('nextNumber', e.target.value)}
                />
                <p className="text-2xs text-muted-foreground">
                  Elle değiştirmek boşluk veya çakışma yaratabilir — dikkatli kullanın.
                </p>
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.incrementOnSave}
                  onCheckedChange={(v) => set('incrementOnSave', v)}
                />
                Kaydettikten sonra artır
                <span className="text-2xs text-muted-foreground">
                  (kapalıysa: seçilir seçilmez artırılır)
                </span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.isActive} onCheckedChange={(v) => set('isActive', v)} />
                Aktif
              </label>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                İptal
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !form.context.trim() || !form.prefix.trim()}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}
