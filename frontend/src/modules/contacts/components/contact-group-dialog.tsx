import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { toApiError, type ContactGroupDto } from '@turbohesap/shared'

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

const NO_PARENT = '__root__'

interface FormState {
  name: string
  code: string
  parentId: string
  isActive: boolean
}

/**
 * Create/edit dialog for a contact group (Cari Grubu). Saves only on "Kaydet".
 * Deletion lives on the tree page; this dialog stays focused on core fields.
 */
export function ContactGroupDialog({
  open,
  onOpenChange,
  editing,
  defaultParentId = null,
  groups,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The group being edited, or null to create. */
  editing: ContactGroupDto | null
  /** Preset parent for "add child" (ignored when editing). */
  defaultParentId?: string | null
  groups: ContactGroupDto[]
  onSaved: (saved: ContactGroupDto) => void
}) {
  const empty = (): FormState => ({
    name: '',
    code: '',
    parentId: defaultParentId ?? NO_PARENT,
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
            parentId: editing.parentId ?? NO_PARENT,
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
        parentId: form.parentId === NO_PARENT ? null : form.parentId,
        isActive: form.isActive,
      }
      return editing
        ? api.contacts.groups.update(editing.id, payload)
        : api.contacts.groups.create(payload)
    },
    onSuccess: (saved) => {
      toast.success(editing ? 'Grup güncellendi' : 'Grup oluşturuldu')
      onOpenChange(false)
      onSaved(saved)
    },
    onError: (e) => toast.error('İşlem başarısız', { description: toApiError(e).message }),
  })

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  // Parent options exclude the group itself (cycle prevention is also enforced
  // server-side); sorted by name for a readable picker.
  const parentOptions = React.useMemo(
    () =>
      groups
        .filter((g) => g.id !== editing?.id)
        .sort((a, b) => a.name.localeCompare(b.name, 'tr')),
    [groups, editing?.id],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Grubu düzenle' : 'Yeni grup'}</DialogTitle>
          <DialogDescription>
            {editing
              ? 'Grubun temel bilgilerini güncelleyin.'
              : 'Yeni bir cari grubu oluşturun.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="grp-name">Ad</Label>
              <Input id="grp-name" value={form.name} onChange={(e) => set('name', e.target.value)} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="grp-code">Kod</Label>
              <Input id="grp-code" value={form.code} onChange={(e) => set('code', e.target.value)} className="font-mono" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Üst grup</Label>
            <Select value={form.parentId} onValueChange={(v) => set('parentId', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Üst grup seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PARENT}>Kök grup (üst yok)</SelectItem>
                {parentOptions.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Switch checked={form.isActive} onCheckedChange={(v) => set('isActive', v)} />
            Aktif
          </label>
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
