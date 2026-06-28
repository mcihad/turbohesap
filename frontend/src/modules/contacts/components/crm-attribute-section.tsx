// CrmAttributeSection — loads a CRM entity's custom field defs and renders them
// as live inputs (reusing the inventory DynamicAttributeFields renderer) bound
// to a record's `attributes` bag. Renders nothing when no fields are defined.

import { useQuery } from '@tanstack/react-query'

import type { CrmFieldEntity, SourcedFieldDef } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { DynamicAttributeFields } from '@/modules/inventory/components/dynamic-attribute-fields'

export function CrmAttributeSection({
  entity,
  enabled = true,
  values,
  onChange,
}: {
  entity: CrmFieldEntity
  enabled?: boolean
  values: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}) {
  const query = useQuery({
    queryKey: ['contacts', 'field-defs', entity],
    queryFn: () => api.contacts.fields.get(entity),
    enabled,
  })

  const fields = query.data?.fields ?? []
  if (fields.length === 0) return null

  const sourced: SourcedFieldDef[] = fields.map((def) => ({
    def,
    sourceCategoryId: 'crm',
    sourceName: 'Özel alanlar',
  }))

  return <DynamicAttributeFields fields={sourced} values={values} onChange={onChange} />
}
