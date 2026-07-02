// DynamicAttributeFields — renders a category's custom document-field
// definitions as live inputs, bound to a document's `attributes` bag. A
// deliberate duplicate of `inventory/components/dynamic-attribute-fields.tsx`
// over the `documents` contracts (see AGENTS.md §4). The input per type:
//   text/textarea/number/money/boolean/select/multiselect/date/daterange/lookup.

import * as React from 'react'

import {
  type DocumentFieldDef,
  type SourcedDocumentFieldDef,
  missingRequiredDocumentAttributes,
} from '@turbohesap/shared'

import { Badge } from '@/components/ui/badge'
import { LookupSelect } from '@/components/lookup-select'
import { Checkbox } from '@/components/ui/checkbox'
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

type Values = Record<string, unknown>

// Re-export the shared validator under the name the document form imports.
export const missingRequired = missingRequiredDocumentAttributes

export function DynamicAttributeFields({
  fields,
  values,
  onChange,
}: {
  /** Effective fields with their source category (effectiveDocumentFieldDefsWithSource). */
  fields: SourcedDocumentFieldDef[]
  values: Values
  onChange: (key: string, value: unknown) => void
}) {
  if (fields.length === 0) return null

  // Group by source category (preserving order), so inherited fields are visibly
  // grouped under the category they come from.
  const groups: { id: string; name: string; fields: DocumentFieldDef[] }[] = []
  for (const sf of fields) {
    let g = groups.find((x) => x.id === sf.sourceCategoryId)
    if (!g) {
      g = { id: sf.sourceCategoryId, name: sf.sourceName, fields: [] }
      groups.push(g)
    }
    g.fields.push(sf.def)
  }

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
      <p className="text-2xs font-semibold uppercase tracking-wide text-muted-foreground">
        Kategoriye özel alanlar
      </p>
      {groups.map((g) => (
        <div key={g.id} className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="h-px flex-1 bg-border" />
            <Badge variant="secondary" className="shrink-0">
              {g.name || 'Kategori'}
            </Badge>
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {g.fields.map((f) => (
              <div key={f.key} className={f.type === 'textarea' || f.type === 'daterange' ? 'sm:col-span-2' : ''}>
                <FieldInput field={f} value={values[f.key]} onChange={(v) => onChange(f.key, v)} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function FieldInput({
  field: f,
  value,
  onChange,
}: {
  field: DocumentFieldDef
  value: unknown
  onChange: (v: unknown) => void
}) {
  const label = (
    <Label className="flex items-center gap-1">
      {f.label}
      {f.required ? <span className="text-destructive">*</span> : null}
      {f.unit ? <span className="text-xs font-normal text-muted-foreground">({f.unit})</span> : null}
    </Label>
  )
  const help = f.helpText ? <p className="text-2xs text-muted-foreground">{f.helpText}</p> : null
  const str = (value ?? '') as string

  let control: React.ReactNode
  switch (f.type) {
    case 'textarea':
      control = <Textarea value={str} onChange={(e) => onChange(e.target.value)} rows={2} />
      break
    case 'number':
      control = <Input type="number" value={str} min={f.min} max={f.max} step={f.step} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} />
      break
    case 'money':
      control = (
        <div className="flex items-center gap-2">
          <Input type="number" value={str} min={f.min} max={f.max} step={f.step ?? 0.01} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} />
          <span className="text-sm text-muted-foreground">{f.currency || 'TRY'}</span>
        </div>
      )
      break
    case 'boolean':
      control = (
        <div className="flex h-9 items-center">
          <Switch checked={Boolean(value)} onCheckedChange={(v) => onChange(v)} />
        </div>
      )
      break
    case 'select':
      control = (
        <Select value={str} onValueChange={(v) => onChange(v)}>
          <SelectTrigger><SelectValue placeholder="Seçin" /></SelectTrigger>
          <SelectContent>
            {(f.options ?? []).map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      )
      break
    case 'multiselect': {
      const arr = Array.isArray(value) ? (value as string[]) : []
      control = (
        <div className="grid grid-cols-2 gap-2 rounded-md border p-2">
          {(f.options ?? []).map((o) => (
            <label key={o} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={arr.includes(o)}
                onCheckedChange={(c) => onChange(c ? [...arr, o] : arr.filter((x) => x !== o))}
              />
              {o}
            </label>
          ))}
          {(f.options ?? []).length === 0 ? <span className="text-xs text-muted-foreground">Seçenek yok</span> : null}
        </div>
      )
      break
    }
    case 'date':
      control = <Input type="date" value={(str || '').slice(0, 10)} min={f.minDate?.slice(0, 10)} max={f.maxDate?.slice(0, 10)} onChange={(e) => onChange(e.target.value || null)} />
      break
    case 'daterange': {
      const r = (value && typeof value === 'object' ? value : {}) as { from?: string; to?: string }
      control = (
        <div className="grid grid-cols-2 gap-2">
          <Input type="date" value={(r.from ?? '').slice(0, 10)} min={f.minDate?.slice(0, 10)} max={f.maxDate?.slice(0, 10)} onChange={(e) => onChange({ ...r, from: e.target.value })} />
          <Input type="date" value={(r.to ?? '').slice(0, 10)} min={f.minDate?.slice(0, 10)} max={f.maxDate?.slice(0, 10)} onChange={(e) => onChange({ ...r, to: e.target.value })} />
        </div>
      )
      break
    }
    case 'lookup':
      control = <LookupSelect list={f.lookupList ?? ''} value={str || null} onChange={(k) => onChange(k)} />
      break
    default:
      control = <Input value={str} onChange={(e) => onChange(e.target.value)} placeholder={f.placeholder} />
  }

  return (
    <div className="space-y-1.5">
      {label}
      {control}
      {help}
    </div>
  )
}
