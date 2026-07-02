import * as React from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  DocumentsPermissions,
  effectiveDocumentFieldDefsWithSource,
  toApiError,
  type CreateDocumentRequest,
  type DocumentCategoryDto,
  type DocumentDto,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
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
import { Textarea } from '@/components/ui/textarea'
import { CategoryTreeSelect } from './category-tree-select'
import { DynamicAttributeFields, missingRequired } from './dynamic-attribute-fields'
import { OwnerSelect, userLabel } from './owner-select'
import { TagInput } from './tag-input'

interface FormState {
  categoryId: string | null
  title: string
  code: string
  description: string
  attributes: Record<string, unknown>
  tags: string[]
  isTimeBound: boolean
  issueDate: string
  expiryDate: string
  reminderDaysBefore: string
  isPrivate: boolean
  ownerId: string | null
}

const EMPTY: FormState = {
  categoryId: null,
  title: '',
  code: '',
  description: '',
  attributes: {},
  tags: [],
  isTimeBound: false,
  issueDate: '',
  expiryDate: '',
  reminderDaysBefore: '',
  isPrivate: false,
  ownerId: null,
}

function fromDto(d: DocumentDto): FormState {
  return {
    categoryId: d.categoryId,
    title: d.title,
    code: d.code,
    description: d.description,
    attributes: d.attributes ?? {},
    tags: d.tags ?? [],
    isTimeBound: d.isTimeBound,
    issueDate: (d.issueDate ?? '').slice(0, 10),
    expiryDate: (d.expiryDate ?? '').slice(0, 10),
    reminderDaysBefore: d.reminderDaysBefore == null ? '' : String(d.reminderDaysBefore),
    isPrivate: d.isPrivate,
    ownerId: d.ownerId,
  }
}

function toPayload(f: FormState): CreateDocumentRequest {
  return {
    categoryId: f.categoryId,
    title: f.title.trim(),
    code: f.code.trim(),
    description: f.description,
    attributes: f.attributes,
    tags: f.tags,
    isTimeBound: f.isTimeBound,
    issueDate: f.isTimeBound && f.issueDate ? f.issueDate : null,
    expiryDate: f.isTimeBound && f.expiryDate ? f.expiryDate : null,
    reminderDaysBefore:
      f.isTimeBound && f.reminderDaysBefore.trim() !== '' ? Number(f.reminderDaysBefore) : null,
    isPrivate: f.isPrivate,
  }
}

// Create/edit dialog for an evrak (document) — mirrors
// `inventory/components/product-form-dialog.tsx`'s dynamic-attribute pattern.
export function DocumentFormDialog({
  open,
  onOpenChange,
  editing,
  categories,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: DocumentDto | null
  categories: DocumentCategoryDto[]
  onSaved: () => void
}) {
  const { hasPermission, user } = useAuth()
  const canManagePrivacy = hasPermission(DocumentsPermissions.privateManage)

  const [form, setForm] = React.useState<FormState>(EMPTY)
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((s) => ({ ...s, [k]: v }))

  React.useEffect(() => {
    if (open) setForm(editing ? fromDto(editing) : EMPTY)
  }, [open, editing])

  const tagsQuery = useQuery({
    queryKey: ['documents', 'tags'],
    queryFn: () => api.documents.tags.list(),
    enabled: open,
  })

  // On CREATE, picking a category defaults isPrivate from that category's own
  // gizlilik flag (a create-time default only — see document-category.dto.ts).
  const onCategoryChange = (id: string | null) => {
    set('categoryId', id)
    if (!editing) {
      const cat = categories.find((c) => c.id === id)
      set('isPrivate', cat?.isPrivate ?? false)
    }
  }

  const isOwn = !editing || editing.ownerId == null || editing.ownerId === user?.id
  const privacyEditable = canManagePrivacy || isOwn

  const dynamicFields = React.useMemo(
    () => effectiveDocumentFieldDefsWithSource(form.categoryId, categories),
    [form.categoryId, categories],
  )

  const save = useMutation({
    mutationFn: async () => {
      const flat = dynamicFields.map((s) => s.def)
      const missing = missingRequired(flat, form.attributes)
      if (missing.length > 0) {
        const labels = flat.filter((f) => missing.includes(f.key)).map((f) => f.label)
        throw new Error(`Zorunlu alanları doldurun: ${labels.join(', ')}`)
      }
      const payload = { ...toPayload(form), ...(canManagePrivacy ? { ownerId: form.ownerId } : {}) }
      return editing
        ? api.documents.documents.update(editing.id, payload)
        : api.documents.documents.create(payload)
    },
    onSuccess: () => {
      toast.success(editing ? 'Evrak güncellendi' : 'Evrak oluşturuldu')
      onOpenChange(false)
      onSaved()
    },
    onError: (e) => toast.error('İşlem başarısız', { description: toApiError(e).message }),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? 'Evrakı düzenle' : 'Yeni evrak'}</DialogTitle>
          <DialogDescription>
            Evrak bilgilerini girin. Kategoriye özel alanlar kategori seçildikten sonra görünür.
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[65vh] gap-4 overflow-y-auto px-1 py-2">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Başlık"><Input value={form.title} onChange={(e) => set('title', e.target.value)} autoFocus /></Field>
            <Field label="Kod (opsiyonel)"><Input value={form.code} onChange={(e) => set('code', e.target.value)} className="font-mono" /></Field>
          </div>

          <Field label="Kategori">
            <CategoryTreeSelect value={form.categoryId} onChange={onCategoryChange} />
          </Field>

          <Field label="Açıklama">
            <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} />
          </Field>

          <Field label="Etiketler">
            <TagInput value={form.tags} onChange={(t) => set('tags', t)} suggestions={tagsQuery.data ?? []} />
          </Field>

          <DynamicAttributeFields
            fields={dynamicFields}
            values={form.attributes}
            onChange={(k, v) => setForm((s) => ({ ...s, attributes: { ...s.attributes, [k]: v } }))}
          />

          <div className="space-y-2 rounded-lg border p-3">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.isTimeBound} onCheckedChange={(v) => set('isTimeBound', v)} />
              Süreli evrak (son geçerlilik tarihi takip edilsin)
            </label>
            {form.isTimeBound ? (
              <div className="grid grid-cols-3 gap-3 pt-1">
                <Field label="Düzenlenme tarihi">
                  <Input type="date" value={form.issueDate} onChange={(e) => set('issueDate', e.target.value)} />
                </Field>
                <Field label="Son geçerlilik tarihi">
                  <Input type="date" value={form.expiryDate} onChange={(e) => set('expiryDate', e.target.value)} />
                </Field>
                <Field label="Hatırlatma (gün önce)">
                  <Input type="number" min={0} value={form.reminderDaysBefore} onChange={(e) => set('reminderDaysBefore', e.target.value)} placeholder="30" />
                </Field>
              </div>
            ) : null}
          </div>

          <div className="space-y-2 rounded-lg border p-3">
            <Label>Gizlilik</Label>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={form.isPrivate}
                disabled={!privacyEditable}
                onCheckedChange={(v) => set('isPrivate', v)}
              />
              Kişiye özel — sadece sahibi ve gizlilik yetkisi olanlar görebilir
            </label>
            {form.isPrivate ? (
              canManagePrivacy ? (
                <div className="space-y-1.5">
                  <Label className="text-xs">Sahip</Label>
                  <OwnerSelect value={form.ownerId} onChange={(v) => set('ownerId', v)} />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Sahip: {editing?.ownerId && editing.ownerId !== user?.id ? (editing.ownerName ?? '—') : userLabel(user ?? { firstName: '', lastName: '', username: 'Siz' })}
                </p>
              )
            ) : null}
            {!privacyEditable ? (
              <p className="text-xs text-muted-foreground">
                Bu evrak başka birine ait — gizlilik ayarlarını değiştirmek için “gizlilik yönetimi” yetkisi gerekir.
              </p>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !form.title.trim()}>
            {editing ? 'Kaydet' : 'Oluştur'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
