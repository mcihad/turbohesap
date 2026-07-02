import {
  NULLARY_OPERATORS,
  type FilterOperator,
  type FilterValueType,
} from '@turbohesap/shared'

import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LookupSelect } from '@/components/lookup-select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { DateRangePicker } from '@/components/ui/date-range-picker'

/** UI value-type for a filter editor (mirrors the column filter `type`). */
export type FilterFieldType = 'text' | 'number' | 'date' | 'daterange' | 'boolean' | 'select' | 'lookup'

/** Map the editor's UI type to the shared value-type used for operator lists. */
export function toValueType(t: FilterFieldType): FilterValueType {
  switch (t) {
    case 'select':
      return 'enum'
    case 'lookup':
      return 'enum'
    case 'daterange':
      return 'daterange'
    default:
      return t
  }
}

function toISO(d: Date | undefined): string | undefined {
  if (!d) return undefined
  const tz = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - tz).toISOString().slice(0, 10)
}
function fromISO(s: unknown): Date | undefined {
  if (typeof s !== 'string' || !s) return undefined
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? undefined : d
}

export interface FilterValueEditorProps {
  type: FilterFieldType
  op: FilterOperator
  value: unknown
  onChange: (value: unknown) => void
  lookupList?: string
  options?: { value: string; label: string }[]
  className?: string
  autoFocus?: boolean
}

/**
 * The value portion of a filter rule — renders the right editor for a
 * (type, operator) pair. Nullary operators (isNull/isTrue/…) render nothing.
 * Shared by the DataGrid column-filter popover and the QueryBuilder.
 */
export function FilterValueEditor({
  type,
  op,
  value,
  onChange,
  lookupList,
  options,
  className,
  autoFocus,
}: FilterValueEditorProps) {
  if (NULLARY_OPERATORS.includes(op)) return null

  // Number between → two inputs.
  if (type === 'number' && op === 'between') {
    const arr = Array.isArray(value) ? value : ['', '']
    return (
      <div data-slot="filter-value-editor" className={cn('flex items-center gap-1', className)}>
        <Input
          type="number"
          value={arr[0] ?? ''}
          onChange={(e) => onChange([e.target.value === '' ? null : Number(e.target.value), arr[1] ?? null])}
          placeholder="min"
          className="h-8 w-20 text-xs"
        />
        <span className="text-2xs text-muted-foreground">–</span>
        <Input
          type="number"
          value={arr[1] ?? ''}
          onChange={(e) => onChange([arr[0] ?? null, e.target.value === '' ? null : Number(e.target.value)])}
          placeholder="max"
          className="h-8 w-20 text-xs"
        />
      </div>
    )
  }

  if (type === 'number') {
    return (
      <Input
        type="number"
        value={(value as number | string) ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        className={cn('h-8 w-28 text-xs', className)}
        autoFocus={autoFocus}
        data-slot="filter-value-editor"
      />
    )
  }

  if (type === 'select') {
    return (
      <Select value={(value as string) ?? ''} onValueChange={onChange}>
        <SelectTrigger className={cn('h-8 min-w-32 text-xs', className)} data-slot="filter-value-editor">
          <SelectValue placeholder="Seçin" />
        </SelectTrigger>
        <SelectContent>
          {(options ?? []).map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  if (type === 'lookup') {
    return (
      <LookupSelect
        list={lookupList ?? ''}
        value={(value as string) ?? ''}
        onChange={onChange}
        allowCreate={false}
        className={cn('h-8 min-w-32 text-xs', className)}
      />
    )
  }

  if (type === 'daterange' || (type === 'date' && op === 'between')) {
    const arr = Array.isArray(value) ? value : []
    return (
      <DateRangePicker
        value={{ from: fromISO(arr[0]), to: fromISO(arr[1]) }}
        onChange={(r) => onChange([toISO(r?.from) ?? null, toISO(r?.to) ?? null])}
        className={cn('h-8 text-xs', className)}
      />
    )
  }

  if (type === 'date') {
    const d = fromISO(value)
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={cn('h-8 justify-start text-xs font-normal', className)} data-slot="filter-value-editor">
            {d ? toISO(d) : 'Tarih seçin'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={d} onSelect={(next) => onChange(toISO(next) ?? null)} />
        </PopoverContent>
      </Popover>
    )
  }

  // text (default) — `in` accepts a comma-separated list.
  if (op === 'in' || op === 'notIn') {
    const text = Array.isArray(value) ? value.join(', ') : (value as string) ?? ''
    return (
      <Input
        value={text}
        onChange={(e) => onChange(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
        placeholder="a, b, c"
        className={cn('h-8 w-40 text-xs', className)}
        autoFocus={autoFocus}
        data-slot="filter-value-editor"
      />
    )
  }
  return (
    <Input
      value={(value as string) ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className={cn('h-8 w-40 text-xs', className)}
      autoFocus={autoFocus}
      data-slot="filter-value-editor"
    />
  )
}
