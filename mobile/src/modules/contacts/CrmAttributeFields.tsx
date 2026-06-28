// CrmAttributeFields (mobile) — renders a CRM entity's custom field definitions
// (CrmFieldDef === inventory CategoryFieldDef) as live inputs bound to a record's
// `attributes` bag. Flat list (no category grouping); the parent wraps it in an
// "Ek Alanlar" Section. Used by the contact & opportunity forms.

import * as React from 'react'
import { View } from 'react-native'

import type { CrmFieldDef } from '@turbohesap/shared'

import { Checklist, FormDatePicker, FormSelect, FormSwitchRow, FormTextArea, Input, Text } from '../../components'

type Values = Record<string, unknown>

export function CrmAttributeFields({
  fields,
  values,
  onChange,
}: {
  fields: CrmFieldDef[]
  values: Values
  onChange: (key: string, value: unknown) => void
}) {
  if (fields.length === 0) return null
  const ordered = [...fields].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  return (
    <>
      {ordered.map((f) => (
        <FieldInput key={f.key} field={f} value={values[f.key]} onChange={(v) => onChange(f.key, v)} />
      ))}
    </>
  )
}

function FieldInput({
  field: f,
  value,
  onChange,
}: {
  field: CrmFieldDef
  value: unknown
  onChange: (v: unknown) => void
}) {
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
      control = <FormDatePicker label={label} value={str} onChange={(v) => onChange(v || null)} mode="date" />
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
