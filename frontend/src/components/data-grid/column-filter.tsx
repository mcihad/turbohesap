import * as React from 'react'
import type { Column, FilterFn } from '@tanstack/react-table'
import { Filter } from 'lucide-react'

import {
  NULLARY_OPERATORS,
  OPERATORS_BY_TYPE,
  type FilterOperator,
} from '@turbohesap/shared'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FilterValueEditor,
  toValueType,
  type FilterFieldType,
} from '@/components/query-builder/filter-value-editor'

/** Column filter value persisted in TanStack `columnFilters` state. */
export interface ColumnFilterValue {
  op: FilterOperator
  value?: unknown
}

export interface ColumnFilterMeta {
  type: FilterFieldType
  /** DB field key for server mode (defaults to the column id). */
  field?: string
  lookupList?: string
  options?: { value: string; label: string }[]
  operators?: FilterOperator[]
}

export const OP_LABELS: Record<FilterOperator, string> = {
  eq: '=',
  ne: '≠',
  gt: '>',
  gte: '≥',
  lt: '<',
  lte: '≤',
  contains: 'içerir',
  startsWith: 'ile başlar',
  endsWith: 'ile biter',
  in: 'şunlardan',
  notIn: 'hariç',
  between: 'aralık',
  isNull: 'boş',
  isNotNull: 'dolu',
  isTrue: 'evet',
  isFalse: 'hayır',
}

function operatorsFor(meta: ColumnFilterMeta): FilterOperator[] {
  if (meta.operators?.length) return meta.operators
  return OPERATORS_BY_TYPE[toValueType(meta.type)]
}

/**
 * A styled per-column filter popover: an operator picker + a type-aware value
 * editor. Writes a `{op, value}` into the column's filter state. Replaces the
 * old plain-text header input.
 */
export function ColumnFilterPopover<T>({ column }: { column: Column<T, unknown> }) {
  const meta = column.columnDef.meta?.filter as ColumnFilterMeta | undefined
  const current = column.getFilterValue() as ColumnFilterValue | undefined
  const ops = React.useMemo(() => (meta ? operatorsFor(meta) : []), [meta])

  // Fallback: no meta → keep a simple contains text filter (back-compat).
  const effMeta: ColumnFilterMeta = meta ?? { type: 'text' }
  const effOps = ops.length ? ops : OPERATORS_BY_TYPE.text

  const op = current?.op ?? effOps[0]
  const active = current != null && (current.value != null || NULLARY_OPERATORS.includes(current.op))

  const setOp = (nextOp: FilterOperator) => {
    if (NULLARY_OPERATORS.includes(nextOp)) column.setFilterValue({ op: nextOp })
    else column.setFilterValue({ op: nextOp, value: current?.value })
  }
  const setValue = (value: unknown) => {
    if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) {
      if (!NULLARY_OPERATORS.includes(op)) return column.setFilterValue(undefined)
    }
    column.setFilterValue({ op, value })
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className={cn('mt-1 size-6', active && 'bg-primary/12 text-primary')}
          onClick={(e) => e.stopPropagation()}
          aria-label="Sütun filtresi"
        >
          <Filter className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto min-w-56 space-y-2 p-2"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <Select value={op} onValueChange={(v) => setOp(v as FilterOperator)}>
            <SelectTrigger className="h-8 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {effOps.map((o) => (
                <SelectItem key={o} value={o}>
                  {OP_LABELS[o]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FilterValueEditor
            type={effMeta.type}
            op={op}
            value={current?.value}
            onChange={setValue}
            lookupList={effMeta.lookupList}
            options={effMeta.options}
            autoFocus
          />
        </div>
        {active ? (
          <Button variant="ghost" size="sm" className="h-7 w-full text-xs" onClick={() => column.setFilterValue(undefined)}>
            Temizle
          </Button>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}

/** Evaluate a single `{op,value}` filter against a cell value (client mode). */
export function matchColumnFilter(cell: unknown, f: ColumnFilterValue): boolean {
  const { op, value } = f
  const s = (v: unknown) => String(v ?? '').toLowerCase()
  switch (op) {
    case 'eq':
      return s(cell) === s(value)
    case 'ne':
      return s(cell) !== s(value)
    case 'gt':
      return Number(cell) > Number(value)
    case 'gte':
      return Number(cell) >= Number(value)
    case 'lt':
      return Number(cell) < Number(value)
    case 'lte':
      return Number(cell) <= Number(value)
    case 'contains':
      return s(cell).includes(s(value))
    case 'startsWith':
      return s(cell).startsWith(s(value))
    case 'endsWith':
      return s(cell).endsWith(s(value))
    case 'in':
      return (Array.isArray(value) ? value : [value]).map(s).includes(s(cell))
    case 'notIn':
      return !(Array.isArray(value) ? value : [value]).map(s).includes(s(cell))
    case 'between': {
      const [a, b] = Array.isArray(value) ? value : [undefined, undefined]
      return Number(cell) >= Number(a) && Number(cell) <= Number(b)
    }
    case 'isNull':
      return cell == null || cell === ''
    case 'isNotNull':
      return cell != null && cell !== ''
    case 'isTrue':
      return cell === true
    case 'isFalse':
      return cell === false
    default:
      return true
  }
}

/** TanStack filterFn honoring the `{op,value}` shape (client-mode grids). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const columnFilterFn: FilterFn<any> = (row, columnId, filterValue) => {
  if (filterValue == null) return true
  // Back-compat: a plain string filter (old grids) → contains.
  if (typeof filterValue === 'string') {
    return String(row.getValue(columnId) ?? '').toLowerCase().includes(filterValue.toLowerCase())
  }
  return matchColumnFilter(row.getValue(columnId), filterValue as ColumnFilterValue)
}
