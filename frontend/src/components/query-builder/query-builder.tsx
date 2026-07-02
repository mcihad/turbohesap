import { Plus, Trash2, FolderPlus } from 'lucide-react'

import {
  OPERATORS_BY_TYPE,
  isFilterGroup,
  type FilterGroup,
  type FilterOperator,
  type FilterRule,
} from '@turbohesap/shared'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FilterValueEditor, toValueType, type FilterFieldType } from './filter-value-editor'
import { OP_LABELS } from '@/components/data-grid/column-filter'

/** A field the QueryBuilder can build rules for. */
export interface QueryBuilderField {
  key: string
  label: string
  type: FilterFieldType
  lookupList?: string
  options?: { value: string; label: string }[]
  operators?: FilterOperator[]
}

export interface QueryBuilderProps {
  fields: QueryBuilderField[]
  value: FilterGroup
  onChange: (group: FilterGroup) => void
  className?: string
}

function operatorsFor(field: QueryBuilderField | undefined): FilterOperator[] {
  if (!field) return []
  return field.operators?.length ? field.operators : OPERATORS_BY_TYPE[toValueType(field.type)]
}

/**
 * A reusable nested AND/OR filter builder. Emits a `FilterGroup` tree of
 * `field · operator · value` rules; groups nest arbitrarily. Value editors are
 * type-aware (text/number/date/daterange/boolean/select/lookup) and shared with
 * the DataGrid column filters. Independent of the DataGrid — usable anywhere.
 */
export function QueryBuilder({ fields, value, onChange, className }: QueryBuilderProps) {
  return (
    <div data-slot="query-builder" className={cn('text-sm', className)}>
      <GroupEditor fields={fields} group={value} onChange={onChange} depth={0} />
    </div>
  )
}

function GroupEditor({
  fields,
  group,
  onChange,
  depth,
  onRemove,
}: {
  fields: QueryBuilderField[]
  group: FilterGroup
  onChange: (g: FilterGroup) => void
  depth: number
  onRemove?: () => void
}) {
  const setCombinator = (combinator: 'and' | 'or') => onChange({ ...group, combinator })
  const updateChild = (i: number, next: FilterRule | FilterGroup) =>
    onChange({ ...group, rules: group.rules.map((r, idx) => (idx === i ? next : r)) })
  const removeChild = (i: number) => onChange({ ...group, rules: group.rules.filter((_, idx) => idx !== i) })
  const addRule = () => {
    const f = fields[0]
    const rule: FilterRule = { field: f?.key ?? '', op: operatorsFor(f)[0] ?? 'eq' }
    onChange({ ...group, rules: [...group.rules, rule] })
  }
  const addGroup = () =>
    onChange({ ...group, rules: [...group.rules, { combinator: 'and', rules: [] }] })

  return (
    <div
      data-slot="query-builder-group"
      className={cn('space-y-2 rounded-lg border p-2', depth > 0 && 'bg-muted/30')}
    >
      <div className="flex items-center gap-2">
        <Select value={group.combinator} onValueChange={(v) => setCombinator(v as 'and' | 'or')}>
          <SelectTrigger className="h-8 w-24 text-xs font-medium">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="and">VE (tümü)</SelectItem>
            <SelectItem value="or">VEYA (herhangi)</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-2xs text-muted-foreground">kuralları eşleşmeli</span>
        <div className="ml-auto flex items-center gap-1">
          <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={addRule}>
            <Plus className="size-3.5" /> Kural
          </Button>
          {depth < 3 ? (
            <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={addGroup}>
              <FolderPlus className="size-3.5" /> Grup
            </Button>
          ) : null}
          {onRemove ? (
            <Button type="button" variant="ghost" size="icon-sm" className="size-7" onClick={onRemove} aria-label="Grubu sil">
              <Trash2 className="size-3.5 text-destructive" />
            </Button>
          ) : null}
        </div>
      </div>

      {group.rules.length === 0 ? (
        <p className="px-1 py-2 text-2xs text-muted-foreground">Kural yok — "Kural" ile ekleyin.</p>
      ) : (
        <div className="space-y-2 pl-2">
          {group.rules.map((child, i) =>
            isFilterGroup(child) ? (
              <GroupEditor
                key={i}
                fields={fields}
                group={child}
                onChange={(g) => updateChild(i, g)}
                depth={depth + 1}
                onRemove={() => removeChild(i)}
              />
            ) : (
              <RuleEditor
                key={i}
                fields={fields}
                rule={child}
                onChange={(r) => updateChild(i, r)}
                onRemove={() => removeChild(i)}
              />
            ),
          )}
        </div>
      )}
    </div>
  )
}

function RuleEditor({
  fields,
  rule,
  onChange,
  onRemove,
}: {
  fields: QueryBuilderField[]
  rule: FilterRule
  onChange: (r: FilterRule) => void
  onRemove: () => void
}) {
  const field = fields.find((f) => f.key === rule.field)
  const ops = operatorsFor(field)

  const setField = (key: string) => {
    const f = fields.find((x) => x.key === key)
    const nextOps = operatorsFor(f)
    onChange({ field: key, op: nextOps.includes(rule.op) ? rule.op : nextOps[0] ?? 'eq', value: undefined })
  }

  return (
    <div data-slot="query-builder-rule" className="flex flex-wrap items-center gap-2">
      <Select value={rule.field} onValueChange={setField}>
        <SelectTrigger className="h-8 w-40 text-xs">
          <SelectValue placeholder="Alan" />
        </SelectTrigger>
        <SelectContent>
          {fields.map((f) => (
            <SelectItem key={f.key} value={f.key}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={rule.op} onValueChange={(v) => onChange({ ...rule, op: v as FilterOperator })}>
        <SelectTrigger className="h-8 w-28 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ops.map((o) => (
            <SelectItem key={o} value={o}>
              {OP_LABELS[o]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {field ? (
        <FilterValueEditor
          type={field.type}
          op={rule.op}
          value={rule.value}
          onChange={(value) => onChange({ ...rule, value })}
          lookupList={field.lookupList}
          options={field.options}
        />
      ) : null}
      <Button type="button" variant="ghost" size="icon-sm" className="size-7" onClick={onRemove} aria-label="Kuralı sil">
        <Trash2 className="size-3.5 text-destructive" />
      </Button>
    </div>
  )
}
