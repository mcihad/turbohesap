// DocumentFieldDefBuilder — manage a category's custom document-attribute schema
// (DocumentFieldDef[]). A deliberate duplicate of
// `inventory/components/field-def-builder.tsx` operating over `DocumentFieldDef`
// (see AGENTS.md §4 — each module owns its own contract + UI copy). Fields are
// shown as a compact list; add/edit happens in a modal. The `lookup` type picks
// its source list from a combobox of existing lookup lists.

import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from 'lucide-react'

import {
  DOCUMENT_FIELD_TYPES,
  type DocumentFieldDef,
  type DocumentFieldType,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
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
import { Textarea } from '@/components/ui/textarea'

export const FIELD_TYPE_LABELS: Record<DocumentFieldType, string> = {
  text: 'Metin',
  textarea: 'Uzun metin',
  number: 'Sayı',
  money: 'Para',
  boolean: 'Onay kutusu',
  select: 'Liste (sabit)',
  multiselect: 'Çoklu liste',
  date: 'Tarih',
  daterange: 'Tarih aralığı',
  lookup: 'Liste (tanım listesinden)',
}

function slugKey(label: string): string {
  const map: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', İ: 'i' }
  return label.toLowerCase().split('').map((c) => map[c] ?? c).join('').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 48)
}

const BLANK: DocumentFieldDef = { key: '', label: '', type: 'text', required: false }

export function FieldDefBuilder({
  value,
  onChange,
}: {
  value: DocumentFieldDef[]
  onChange: (defs: DocumentFieldDef[]) => void
}) {
  // editing: index of the field being edited, -1 for a new field, null = closed.
  const [editing, setEditing] = React.useState<number | null>(null)

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= value.length) return
    const next = value.slice()
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next.map((d, idx) => ({ ...d, sortOrder: idx })))
  }
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i))

  const upsert = (def: DocumentFieldDef) => {
    if (editing === -1) onChange([...value, { ...def, sortOrder: value.length }])
    else if (editing != null) onChange(value.map((d, i) => (i === editing ? def : d)))
    setEditing(null)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Evrak alanları (bu kategorideki evraklara özel)</Label>
        <Button type="button" variant="outline" size="sm" onClick={() => setEditing(-1)}>
          <Plus />
          Alan ekle
        </Button>
      </div>

      {value.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          Henüz özel alan yok. Bu kategorideki evraklara girilecek ek alanları
          (sözleşme no, taraf, tutar…) “Alan ekle” ile tanımlayın.
        </p>
      ) : (
        <div className="divide-y overflow-hidden rounded-lg border">
          {value.map((def, i) => (
            <div key={i} className="flex items-center gap-2 p-2.5">
              <div className="flex flex-col text-muted-foreground">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="disabled:opacity-30" aria-label="Yukarı">
                  <ChevronUp className="size-3.5" />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === value.length - 1} className="disabled:opacity-30" aria-label="Aşağı">
                  <ChevronDown className="size-3.5" />
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate font-medium">{def.label || '(adsız)'}</span>
                  {def.required ? <Badge variant="warning">Zorunlu</Badge> : null}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {FIELD_TYPE_LABELS[def.type]} · <span className="font-mono">{def.key}</span>
                  {def.type === 'lookup' && def.lookupList ? ` → ${def.lookupList}` : ''}
                </p>
              </div>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => setEditing(i)} aria-label="Düzenle">
                <Pencil className="size-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(i)} aria-label="Kaldır">
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <FieldDefDialog
        open={editing !== null}
        initial={editing != null && editing >= 0 ? value[editing] : BLANK}
        isNew={editing === -1}
        onClose={() => setEditing(null)}
        onSave={upsert}
      />
    </div>
  )
}

function FieldDefDialog({
  open,
  initial,
  isNew,
  onClose,
  onSave,
}: {
  open: boolean
  initial: DocumentFieldDef
  isNew: boolean
  onClose: () => void
  onSave: (def: DocumentFieldDef) => void
}) {
  const [def, setDef] = React.useState<DocumentFieldDef>(initial)
  const [keyEdited, setKeyEdited] = React.useState(false)
  React.useEffect(() => {
    if (open) {
      setDef(initial)
      setKeyEdited(!isNew)
    }
  }, [open, initial, isNew])

  const listsQuery = useQuery({
    queryKey: ['lookups', 'lists'],
    queryFn: () => api.lookups.lists(),
    enabled: open && def.type === 'lookup',
  })
  const set = (patch: Partial<DocumentFieldDef>) => setDef((d) => ({ ...d, ...patch }))

  const numeric = def.type === 'number' || def.type === 'money'
  const dateLike = def.type === 'date' || def.type === 'daterange'
  const optionLike = def.type === 'select' || def.type === 'multiselect'

  const lists = listsQuery.data ?? []
  // Keep a previously-saved list name selectable even if it has no items yet.
  const listNames = [...new Set([...(def.lookupList ? [def.lookupList] : []), ...lists.map((l) => l.list)])]

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Yeni alan' : 'Alanı düzenle'}</DialogTitle>
          <DialogDescription>
            Bu kategorideki evraklara girilecek özel bir alan tanımlayın.
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[60vh] gap-4 overflow-y-auto px-1 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Alan adı</Label>
              <Input
                value={def.label}
                onChange={(e) => {
                  const label = e.target.value
                  set({ label, ...(keyEdited ? {} : { key: slugKey(label) }) })
                }}
                placeholder="örn. Sözleşme No"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Anahtar</Label>
              <Input
                value={def.key}
                disabled={!isNew}
                onChange={(e) => { setKeyEdited(true); set({ key: e.target.value }) }}
                className="font-mono text-xs"
                placeholder="otomatik"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tür</Label>
              <Select value={def.type} onValueChange={(v) => set({ type: v as DocumentFieldType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOCUMENT_FIELD_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{FIELD_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch checked={def.required} onCheckedChange={(v) => set({ required: v })} />
              <Label>Zorunlu</Label>
            </div>
          </div>

          {optionLike ? (
            <div className="space-y-1.5">
              <Label>Seçenekler (her satır bir değer)</Label>
              <Textarea
                value={(def.options ?? []).join('\n')}
                onChange={(e) => set({ options: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })}
                rows={3}
                placeholder={'Orijinal\nSuret\nOnaylı Suret'}
              />
            </div>
          ) : null}

          {def.type === 'lookup' ? (
            <div className="space-y-1.5">
              <Label>Tanım listesi</Label>
              <Select value={def.lookupList ?? ''} onValueChange={(v) => set({ lookupList: v })}>
                <SelectTrigger>
                  <SelectValue placeholder={listsQuery.isLoading ? 'Yükleniyor…' : 'Liste seçin'} />
                </SelectTrigger>
                <SelectContent>
                  {listNames.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                  {listNames.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      Önce “Tanımlar” modülünden bir liste oluşturun.
                    </div>
                  ) : null}
                </SelectContent>
              </Select>
              <p className="text-2xs text-muted-foreground">
                Evrak formunda bu listeden seçtirilir (LookupSelect).
              </p>
            </div>
          ) : null}

          {numeric ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <NumField label="Min" value={def.min} onChange={(v) => set({ min: v })} />
              <NumField label="Max" value={def.max} onChange={(v) => set({ max: v })} />
              <NumField label="Adım" value={def.step} onChange={(v) => set({ step: v })} />
              <div className="space-y-1.5">
                <Label className="text-xs">{def.type === 'money' ? 'Para birimi' : 'Birim'}</Label>
                <Input
                  value={(def.type === 'money' ? def.currency : def.unit) ?? ''}
                  onChange={(e) => set(def.type === 'money' ? { currency: e.target.value } : { unit: e.target.value })}
                  placeholder={def.type === 'money' ? 'TRY' : 'adet'}
                />
              </div>
            </div>
          ) : null}

          {dateLike ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">En erken tarih</Label>
                <Input type="date" value={(def.minDate ?? '').slice(0, 10)} onChange={(e) => set({ minDate: e.target.value || undefined })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">En geç tarih</Label>
                <Input type="date" value={(def.maxDate ?? '').slice(0, 10)} onChange={(e) => set({ maxDate: e.target.value || undefined })} />
              </div>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label className="text-xs">Yardım metni (opsiyonel)</Label>
            <Input value={def.helpText ?? ''} onChange={(e) => set({ helpText: e.target.value || undefined })} placeholder="Kullanıcıya ipucu" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>İptal</Button>
          <Button
            onClick={() => {
              const key = (def.key.trim() || slugKey(def.label)).trim()
              onSave({ ...def, key, label: def.label.trim() })
            }}
            disabled={def.label.trim() === ''}
          >
            {isNew ? 'Ekle' : 'Kaydet'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number | undefined
  onChange: (v: number | undefined) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input type="number" value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))} />
    </div>
  )
}
