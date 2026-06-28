import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ListChecks, Pencil, Plus, SlidersHorizontal, Star, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

import {
  InventoryPermissions,
  toApiError,
  type ModifierSelectionType,
  type ProductModifierGroupDto,
} from '@turbohesap/shared'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { PageHeader, PageWrapper } from '@/components/layout/page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { money } from '../labels'

export function ModifiersPage() {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canWrite = hasPermission(InventoryPermissions.modifiersWrite)

  const groupsQuery = useQuery({ queryKey: ['inventory', 'modifier-groups'], queryFn: () => api.inventory.modifiers.listGroups() })
  const [editing, setEditing] = React.useState<ProductModifierGroupDto | null>(null)
  const [createOpen, setCreateOpen] = React.useState(false)

  const remove = useMutation({
    mutationFn: (id: string) => api.inventory.modifiers.removeGroup(id),
    onSuccess: () => {
      toast.success('Grup silindi')
      qc.invalidateQueries({ queryKey: ['inventory', 'modifier-groups'] })
    },
    onError: (e) => toast.error('Silinemedi', { description: toApiError(e).message }),
  })

  const groups = groupsQuery.data ?? []

  return (
    <PermissionRequired permission={InventoryPermissions.modifiersRead}>
      <PageWrapper className="space-y-6">
        <PageHeader
          title="Ürün seçenekleri"
          description="Yeniden kullanılabilir modifiye grupları oluşturun — ürünlere POS sekmesinden bağlayın."
          actions={
            canWrite ? (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" /> Yeni grup
              </Button>
            ) : null
          }
        />

        <div className="rounded-2xl border bg-card">
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
            <div className="min-w-0">
              <p className="text-2xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Modifiye grupları
              </p>
              <p className="mt-0.5 text-2xs text-muted-foreground tabular-nums">
                {groupsQuery.isLoading ? 'Yükleniyor…' : `${groups.length} grup`}
              </p>
            </div>
            {canWrite && groups.length > 0 ? (
              <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" /> Grup ekle
              </Button>
            ) : null}
          </div>

          <div className="p-4">
            {groupsQuery.isLoading ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(19rem,1fr))] gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-44 animate-pulse rounded-2xl border bg-muted/40" />
                ))}
              </div>
            ) : groups.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-14 text-center">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <SlidersHorizontal className="size-6" />
                </span>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Henüz modifiye grubu yok</p>
                  <p className="text-2xs text-muted-foreground">
                    “Ekstra soslar”, “Pişirme derecesi” gibi seçenek grupları oluşturun, ürünlere tekrar tekrar bağlayın.
                  </p>
                </div>
                {canWrite ? (
                  <Button size="sm" onClick={() => setCreateOpen(true)}>
                    <Plus className="size-4" /> İlk grubu oluştur
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(19rem,1fr))] gap-3">
                {groups.map((g) => (
                  <div
                    key={g.id}
                    className="group/card relative flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <SlidersHorizontal className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold leading-tight">{g.name}</p>
                        <p className="mt-0.5 text-2xs text-muted-foreground tabular-nums">
                          {g.options.length} seçenek · {g.productCount} ürün
                        </p>
                      </div>
                      {canWrite ? (
                        <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover/card:opacity-100 focus-within:opacity-100">
                          <button
                            type="button"
                            onClick={() => setEditing(g)}
                            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`"${g.name}" silinsin mi?`)) remove.mutate(g.id)
                            }}
                            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-2xs font-medium text-muted-foreground">
                        {g.selectionType === 'single' ? 'Tek seçim' : 'Çok seçim'}
                      </span>
                      {g.required ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-2xs font-medium text-primary">
                          Zorunlu
                        </span>
                      ) : null}
                      {g.selectionType === 'multi' && (g.minSelect > 0 || g.maxSelect != null) ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-2xs font-medium text-muted-foreground tabular-nums">
                          {g.minSelect}–{g.maxSelect ?? '∞'} seçim
                        </span>
                      ) : null}
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-2xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Seçenekler
                      </p>
                      {g.options.length === 0 ? (
                        <p className="text-2xs text-muted-foreground">Bu grupta seçenek tanımlı değil.</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {g.options.map((o) => (
                            <span
                              key={o.id}
                              className="inline-flex items-center gap-1.5 rounded-lg border bg-muted/40 px-2 py-1 text-2xs"
                            >
                              {o.isDefault ? <Star className="size-3 fill-primary text-primary" /> : null}
                              <span className="font-medium">{o.name}</span>
                              {o.priceDelta !== 0 ? (
                                <span className="tabular-nums text-muted-foreground">
                                  {o.priceDelta > 0 ? '+' : '−'}
                                  {money(Math.abs(o.priceDelta))}
                                </span>
                              ) : null}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {(createOpen || editing) && (
          <GroupDialog
            group={editing}
            onClose={() => {
              setCreateOpen(false)
              setEditing(null)
            }}
            onSaved={() => {
              setCreateOpen(false)
              setEditing(null)
              qc.invalidateQueries({ queryKey: ['inventory', 'modifier-groups'] })
            }}
          />
        )}
      </PageWrapper>
    </PermissionRequired>
  )
}

interface DraftOption {
  id?: string
  name: string
  priceDelta: number
  isDefault: boolean
}

function GroupDialog({
  group,
  onClose,
  onSaved,
}: {
  group: ProductModifierGroupDto | null
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = React.useState(group?.name ?? '')
  const [selectionType, setSelectionType] = React.useState<ModifierSelectionType>(group?.selectionType ?? 'single')
  const [required, setRequired] = React.useState(group?.required ?? false)
  const [minSelect, setMinSelect] = React.useState(group?.minSelect ?? 0)
  const [maxSelect, setMaxSelect] = React.useState<number | null>(group?.maxSelect ?? null)
  const [options, setOptions] = React.useState<DraftOption[]>(
    group?.options.map((o) => ({ id: o.id, name: o.name, priceDelta: o.priceDelta, isDefault: o.isDefault })) ?? [],
  )

  const save = useMutation({
    mutationFn: async () => {
      const base = {
        name: name.trim(),
        selectionType,
        required,
        minSelect,
        maxSelect: selectionType === 'multi' ? maxSelect : null,
      }
      if (!group) {
        // create group with its initial options in one call
        await api.inventory.modifiers.createGroup({
          ...base,
          options: options.map((o) => ({ name: o.name.trim(), priceDelta: o.priceDelta, isDefault: o.isDefault })),
        })
        return
      }
      await api.inventory.modifiers.updateGroup(group.id, base)
      // reconcile options: add new, update existing, delete removed
      const existing = group.options
      const keptIds = new Set(options.filter((o) => o.id).map((o) => o.id))
      for (const ex of existing) {
        if (!keptIds.has(ex.id)) await api.inventory.modifiers.removeOption(group.id, ex.id)
      }
      for (const o of options) {
        if (o.id) {
          await api.inventory.modifiers.updateOption(group.id, o.id, {
            name: o.name.trim(),
            priceDelta: o.priceDelta,
            isDefault: o.isDefault,
          })
        } else {
          await api.inventory.modifiers.addOption(group.id, {
            name: o.name.trim(),
            priceDelta: o.priceDelta,
            isDefault: o.isDefault,
          })
        }
      }
    },
    onSuccess: () => {
      toast.success(group ? 'Grup güncellendi' : 'Grup oluşturuldu')
      onSaved()
    },
    onError: (e) => toast.error('Kaydedilemedi', { description: toApiError(e).message }),
  })

  const addOption = () => setOptions((cur) => [...cur, { name: '', priceDelta: 0, isDefault: false }])
  const updateOption = (i: number, patch: Partial<DraftOption>) =>
    setOptions((cur) => cur.map((o, idx) => (idx === i ? { ...o, ...patch } : o)))
  const removeOption = (i: number) => setOptions((cur) => cur.filter((_, idx) => idx !== i))

  const valid = name.trim() && options.every((o) => o.name.trim())

  return (
    <Dialog open onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{group ? 'Grubu düzenle' : 'Yeni grup'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-2xs text-muted-foreground">Grup adı</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Ekstra Soslar" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-2xs text-muted-foreground">Seçim tipi</Label>
              <Select value={selectionType} onValueChange={(v) => setSelectionType(v as ModifierSelectionType)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Tek seçim</SelectItem>
                  <SelectItem value="multi">Çok seçim</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end justify-between rounded-md border px-3 py-2">
              <Label className="text-sm">Zorunlu</Label>
              <Switch checked={required} onCheckedChange={setRequired} />
            </div>
            {selectionType === 'multi' ? (
              <>
                <div className="space-y-1.5">
                  <Label className="text-2xs text-muted-foreground">En az</Label>
                  <Input
                    type="number"
                    min={0}
                    value={minSelect}
                    onChange={(e) => setMinSelect(Math.max(0, Number(e.target.value) || 0))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-2xs text-muted-foreground">En çok (boş = sınırsız)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={maxSelect ?? ''}
                    onChange={(e) => setMaxSelect(e.target.value === '' ? null : Math.max(0, Number(e.target.value)))}
                  />
                </div>
              </>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                <ListChecks className="size-3.5" /> Seçenekler
              </Label>
              <Button type="button" variant="outline" size="sm" onClick={addOption}>
                <Plus className="size-3.5" /> Ekle
              </Button>
            </div>
            <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border bg-muted/30 p-2">
              {options.map((o, i) => (
                <div key={o.id ?? i} className="flex items-center gap-2 rounded-lg bg-card p-1.5 shadow-xs">
                  <Input
                    value={o.name}
                    onChange={(e) => updateOption(i, { name: e.target.value })}
                    placeholder="Seçenek adı"
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    value={o.priceDelta}
                    onChange={(e) => updateOption(i, { priceDelta: Number(e.target.value) || 0 })}
                    className="w-24 tabular-nums"
                    title="Fiyat farkı (±)"
                  />
                  <label
                    className="flex items-center gap-1.5 px-1 text-2xs text-muted-foreground"
                    title="Varsayılan olarak seçili gelsin"
                  >
                    <Star className="size-3.5" />
                    <Switch checked={o.isDefault} onCheckedChange={(v) => updateOption(i, { isDefault: v })} />
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0"
                    onClick={() => removeOption(i)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
              {options.length === 0 ? (
                <p className="px-1 py-3 text-center text-2xs text-muted-foreground">
                  Henüz seçenek eklenmedi. “Ekle” ile başlayın.
                </p>
              ) : null}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Vazgeç
          </Button>
          <Button disabled={!valid || save.isPending} onClick={() => save.mutate()}>
            Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
