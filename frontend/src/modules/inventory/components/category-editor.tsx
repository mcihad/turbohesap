import * as React from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { FolderPlus, ImageIcon, Save, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'

import {
  type CategoryDto,
  type CategoryFieldDef,
  toApiError,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { EntityAuditButton } from '@/modules/iam/components/entity-audit-button'
import { FieldDefBuilder } from './field-def-builder'

interface Form {
  name: string
  code: string
  imageUrl: string
  description: string
  isActive: boolean
  sortOrder: string
  fieldDefs: CategoryFieldDef[]
}

function toForm(c: CategoryDto): Form {
  return {
    name: c.name,
    code: c.code,
    imageUrl: c.imageUrl,
    description: c.description,
    isActive: c.isActive,
    sortOrder: String(c.sortOrder),
    fieldDefs: c.fieldDefs,
  }
}

export function CategoryEditor({
  categoryId,
  canWrite,
  onChanged,
  onAddChild,
  onDeleted,
}: {
  categoryId: string
  canWrite: boolean
  onChanged: () => void
  onAddChild: (parentId: string) => void
  onDeleted: () => void
}) {
  const query = useQuery({
    queryKey: ['inventory', 'categories', categoryId],
    queryFn: () => api.inventory.categories.get(categoryId),
  })

  const [form, setForm] = React.useState<Form | null>(null)
  React.useEffect(() => {
    if (query.data) setForm(toForm(query.data))
  }, [query.data])

  const saveMutation = useMutation({
    mutationFn: () =>
      api.inventory.categories.update(categoryId, {
        name: form!.name.trim(),
        code: form!.code,
        imageUrl: form!.imageUrl,
        description: form!.description,
        isActive: form!.isActive,
        sortOrder: Number(form!.sortOrder) || 0,
        fieldDefs: form!.fieldDefs,
      }),
    onSuccess: () => {
      toast.success('Kategori kaydedildi')
      onChanged()
    },
    onError: (e) => toast.error('Kaydedilemedi', { description: toApiError(e).message }),
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.inventory.categories.remove(categoryId),
    onSuccess: () => {
      toast.success('Kategori silindi')
      onDeleted()
    },
    onError: (e) => toast.error('Silinemedi', { description: toApiError(e).message }),
  })

  // Field definitions auto-save on every add/edit/remove — no Save button needed.
  const fieldsSave = useMutation({
    mutationFn: (defs: CategoryFieldDef[]) =>
      api.inventory.categories.update(categoryId, { fieldDefs: defs }),
    onSuccess: () => {
      toast.success('Alanlar kaydedildi')
      onChanged()
    },
    onError: (e) => toast.error('Alanlar kaydedilemedi', { description: toApiError(e).message }),
  })

  if (query.isLoading || !form) {
    return (
      <Card>
        <CardContent className="space-y-4 pt-6">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-28 w-full" />
        </CardContent>
      </Card>
    )
  }

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm({ ...form, [k]: v })

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">{form.name || 'Kategori'}</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <EntityAuditButton entityType="Category" entityId={categoryId} title="Kategori denetim kaydı" />
          {canWrite ? (
            <>
              <Button variant="outline" size="sm" onClick={() => onAddChild(categoryId)}>
                <FolderPlus />
                Alt kategori
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm(`"${form.name}" silinsin mi?`)) deleteMutation.mutate()
                }}
              >
                <Trash2 className="text-destructive" />
                Sil
              </Button>
              <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.name.trim()}>
                <Save />
                Kaydet
              </Button>
            </>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <fieldset disabled={!canWrite} className="space-y-5 disabled:opacity-80">
          {/* Genel */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Ad</Label>
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Kod</Label>
              <Input value={form.code} onChange={(e) => set('code', e.target.value)} className="font-mono" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Açıklama</Label>
              <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} />
            </div>
          </div>

          {/* Görsel (URL + ileride dosya seçici) */}
          <div className="space-y-1.5">
            <Label>Kategori görseli</Label>
            <div className="flex items-center gap-3">
              <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
                {form.imageUrl ? (
                  // eslint-disable-next-line jsx-a11y/img-redundant-alt
                  <img src={form.imageUrl} alt="Kategori görseli" className="size-full object-cover" />
                ) : (
                  <ImageIcon className="size-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <Input
                  value={form.imageUrl}
                  onChange={(e) => set('imageUrl', e.target.value)}
                  placeholder="https://… (görsel adresi)"
                />
                <Button type="button" variant="outline" size="sm" disabled title="Dosya seçimi yakında eklenecek">
                  <Upload />
                  Dosya seç (yakında)
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="space-y-1.5">
              <Label>Sıra</Label>
              <Input type="number" value={form.sortOrder} onChange={(e) => set('sortOrder', e.target.value)} className="w-24" />
            </div>
            <label className="flex items-center gap-2 pt-5 text-sm">
              <Switch checked={form.isActive} onCheckedChange={(v) => set('isActive', v)} />
              Aktif
            </label>
          </div>

          {/* Field-def builder — auto-saves on every change (no Save button). */}
          <div className="border-t pt-5">
            <FieldDefBuilder
              value={form.fieldDefs}
              onChange={(defs) => {
                setForm({ ...form, fieldDefs: defs })
                if (canWrite) fieldsSave.mutate(defs)
              }}
            />
            <p className="mt-2 text-2xs text-muted-foreground">
              Alanlar otomatik kaydedilir — “Kaydet” butonuna gerek yok.
            </p>
          </div>
        </fieldset>
      </CardContent>
    </Card>
  )
}
