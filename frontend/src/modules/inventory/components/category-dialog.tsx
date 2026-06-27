import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { toApiError, type CategoryDto } from '@turbohesap/shared'

import { api } from '@/lib/api'
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
import { Textarea } from '@/components/ui/textarea'

const NO_PARENT = '__root__'

interface FormState {
  name: string
  code: string
  description: string
  parentId: string
  sortOrder: string
  isActive: boolean
}

/**
 * Create/edit dialog for a category's CORE fields. Saves only on "Kaydet".
 * Custom field definitions, images, deletion and audit live on the category
 * **detail page** — this dialog stays focused, like the product/user dialogs.
 */
export function CategoryDialog({
  open,
  onOpenChange,
  editing,
  defaultParentId = null,
  categories,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The category being edited, or null to create. */
  editing: CategoryDto | null
  /** Preset parent for "add child" (ignored when editing). */
  defaultParentId?: string | null
  categories: CategoryDto[]
  onSaved: () => void
}) {
  const empty = (): FormState => ({
    name: '',
    code: '',
    description: '',
    parentId: defaultParentId ?? NO_PARENT,
    sortOrder: '0',
    isActive: true,
  })

  const [form, setForm] = React.useState<FormState>(empty)

  // Reset the form whenever the dialog opens (or the target changes).
  React.useEffect(() => {
    if (!open) return
    setForm(
      editing
        ? {
            name: editing.name,
            code: editing.code,
            description: editing.description,
            parentId: editing.parentId ?? NO_PARENT,
            sortOrder: String(editing.sortOrder),
            isActive: editing.isActive,
          }
        : empty(),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing, defaultParentId])

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim(),
        description: form.description,
        parentId: form.parentId === NO_PARENT ? null : form.parentId,
        sortOrder: Number(form.sortOrder) || 0,
        isActive: form.isActive,
      }
      return editing
        ? api.inventory.categories.update(editing.id, payload)
        : api.inventory.categories.create(payload)
    },
    onSuccess: () => {
      toast.success(editing ? 'Kategori güncellendi' : 'Kategori oluşturuldu')
      onOpenChange(false)
      onSaved()
    },
    onError: (e) => toast.error('İşlem başarısız', { description: toApiError(e).message }),
  })

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  // Parent options exclude the category itself (cycle prevention is also enforced
  // server-side); sorted by name for a readable picker.
  const parentOptions = React.useMemo(
    () =>
      categories
        .filter((c) => c.id !== editing?.id)
        .sort((a, b) => a.name.localeCompare(b.name, 'tr')),
    [categories, editing?.id],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Kategoriyi düzenle' : 'Yeni kategori'}</DialogTitle>
          <DialogDescription>
            {editing
              ? 'Kategorinin temel bilgilerini güncelleyin.'
              : 'Yeni bir ürün kategorisi oluşturun. Özel alanlar ve görseller detay sayfasından eklenir.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">Ad</Label>
              <Input id="cat-name" value={form.name} onChange={(e) => set('name', e.target.value)} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-code">Kod</Label>
              <Input id="cat-code" value={form.code} onChange={(e) => set('code', e.target.value)} className="font-mono" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Üst kategori</Label>
            <Select value={form.parentId} onValueChange={(v) => set('parentId', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Üst kategori seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PARENT}>Kök kategori (üst yok)</SelectItem>
                {parentOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cat-desc">Açıklama</Label>
            <Textarea id="cat-desc" value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} />
          </div>

          <div className="flex items-end gap-6">
            <div className="space-y-1.5">
              <Label htmlFor="cat-order">Sıra</Label>
              <Input id="cat-order" type="number" value={form.sortOrder} onChange={(e) => set('sortOrder', e.target.value)} className="w-24" />
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <Switch checked={form.isActive} onCheckedChange={(v) => set('isActive', v)} />
              Aktif
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !form.name.trim()}>
            {editing ? 'Kaydet' : 'Oluştur'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
