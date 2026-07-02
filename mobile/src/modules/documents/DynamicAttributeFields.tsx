// DynamicAttributeFields (documents) — renders a category's custom field
// definitions as live inputs bound to a document's `attributes` bag. The evrak
// twin of inventory's DynamicAttributeFields, operating over DocumentFieldDef.

import * as React from 'react'
import { View } from 'react-native'

import type { DocumentFieldDef, SourcedDocumentFieldDef } from '@turbohesap/shared'

import {
  Badge,
  Checklist,
  FormSelect,
  FormSwitchRow,
  FormTextArea,
  Input,
  LookupSelect,
  Section,
  Text,
} from '../../components'
import { useTheme } from '../../theme/theme-context'

type Values = Record<string, unknown>

export function DynamicAttributeFields({
  fields,
  values,
  onChange,
}: {
  /** Effective fields with their source category. */
  fields: SourcedDocumentFieldDef[]
  values: Values
  onChange: (key: string, value: unknown) => void
}) {
  const t = useTheme()
  if (fields.length === 0) return null

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
    <Section title="Kategoriye özel alanlar">
      {groups.map((g) => (
        <View key={g.id} style={{ gap: t.spacing[2.5] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[2] }}>
            <View style={{ flex: 1, height: 1, backgroundColor: t.colors.border }} />
            <Badge label={g.name || 'Kategori'} tone="primary" />
            <View style={{ flex: 1, height: 1, backgroundColor: t.colors.border }} />
          </View>
          {g.fields.map((f) => (
            <FieldInput key={f.key} field={f} value={values[f.key]} onChange={(v) => onChange(f.key, v)} />
          ))}
        </View>
      ))}
    </Section>
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
  const t = useTheme()
  const label = `${f.label}${f.required ? ' *' : ''}${f.unit ? ` (${f.unit})` : ''}`
  const str = (value ?? '') as string
  const help = f.helpText ? (
    <Text variant="caption" tone="muted">
      {f.helpText}
    </Text>
  ) : null

  let control: React.ReactNode
  switch (f.type) {
    case 'textarea':
      control = <FormTextArea label={label} value={str} onChangeText={onChange} />
      break
    case 'number':
    case 'money':
      control = (
        <Input
          label={`${label}${f.type === 'money' ? ` ${f.currency || 'TRY'}` : ''}`}
          value={str}
          keyboardType="decimal-pad"
          onChangeText={(v) => onChange(v === '' ? null : Number(v))}
        />
      )
      break
    case 'boolean':
      control = <FormSwitchRow label={label} value={Boolean(value)} onValueChange={onChange} />
      break
    case 'select':
      control = (
        <FormSelect
          label={label}
          value={str}
          onChange={onChange}
          options={[{ value: '', label: 'Seçin' }, ...(f.options ?? []).map((o) => ({ value: o, label: o }))]}
        />
      )
      break
    case 'multiselect': {
      const arr = Array.isArray(value) ? (value as string[]) : []
      control = (
        <Checklist
          label={label}
          items={(f.options ?? []).map((o) => ({ id: o, title: o }))}
          selected={arr}
          onToggle={(id, on) => onChange(on ? [...arr, id] : arr.filter((x) => x !== id))}
        />
      )
      break
    }
    case 'date':
      control = <Input label={`${label} (YYYY-AA-GG)`} value={(str || '').slice(0, 10)} autoCapitalize="none" onChangeText={(v) => onChange(v || null)} />
      break
    case 'daterange': {
      const r = (value && typeof value === 'object' ? value : {}) as { from?: string; to?: string }
      control = (
        <View style={{ gap: t.spacing[2] }}>
          <Input label={`${label} — başlangıç`} value={(r.from ?? '').slice(0, 10)} autoCapitalize="none" placeholder="YYYY-AA-GG" onChangeText={(v) => onChange({ ...r, from: v })} />
          <Input label="Bitiş" value={(r.to ?? '').slice(0, 10)} autoCapitalize="none" placeholder="YYYY-AA-GG" onChangeText={(v) => onChange({ ...r, to: v })} />
        </View>
      )
      break
    }
    case 'lookup':
      control = <LookupSelect list={f.lookupList ?? ''} label={label} value={str || null} onChange={onChange} />
      break
    default:
      control = <Input label={label} value={str} onChangeText={onChange} placeholder={f.placeholder} />
  }

  return (
    <View style={{ gap: 4 }}>
      {control}
      {help}
    </View>
  )
}
