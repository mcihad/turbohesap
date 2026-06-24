import * as React from 'react'
import { CalendarDays, X } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import {
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from 'date-fns'
import { tr } from 'date-fns/locale'

import { cn } from '@/lib/utils'
import { Button } from './button'
import { Calendar } from './calendar'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

export type { DateRange }

export interface DateRangePreset {
  label: string
  getRange: () => DateRange
}

// Built-in presets (Turkish, week starts Monday). Pass a subset to restrict the
// list, or `[]` to hide presets entirely.
export function defaultDateRangePresets(): DateRangePreset[] {
  const today = new Date()
  const opts = { locale: tr, weekStartsOn: 1 as const }
  return [
    { label: 'Bugün', getRange: () => ({ from: today, to: today }) },
    { label: 'Son 3 gün', getRange: () => ({ from: subDays(today, 2), to: today }) },
    { label: 'Son 7 gün', getRange: () => ({ from: subDays(today, 6), to: today }) },
    { label: 'Bu hafta', getRange: () => ({ from: startOfWeek(today, opts), to: endOfWeek(today, opts) }) },
    { label: 'Son 30 gün', getRange: () => ({ from: subDays(today, 29), to: today }) },
    { label: 'Bu ay', getRange: () => ({ from: startOfMonth(today), to: endOfMonth(today) }) },
    {
      label: 'Geçen ay',
      getRange: () => {
        const prev = subMonths(today, 1)
        return { from: startOfMonth(prev), to: endOfMonth(prev) }
      },
    },
  ]
}

// Tracks a min-width media query (SSR-safe lazy init; updates on change).
function useMinWidth(query: string): boolean {
  const [matches, setMatches] = React.useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  )
  React.useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = () => setMatches(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])
  return matches
}

function sameRange(a: DateRange | undefined, b: DateRange): boolean {
  return Boolean(
    a?.from && a.to && b.from && b.to && isSameDay(a.from, b.from) && isSameDay(a.to, b.to),
  )
}

function formatLabel(value: DateRange | undefined, placeholder: string): string {
  if (!value?.from) return placeholder
  const f = (d: Date) => format(d, 'd LLL yyyy', { locale: tr })
  if (!value.to || isSameDay(value.from, value.to)) return f(value.from)
  return `${f(value.from)} – ${f(value.to)}`
}

export interface DateRangePickerProps {
  value?: DateRange
  onChange: (range: DateRange | undefined) => void
  /** Quick-select presets shown on the left. Default: {@link defaultDateRangePresets}. */
  presets?: DateRangePreset[]
  /** Restrict selectable dates. */
  min?: Date
  max?: Date
  numberOfMonths?: number
  placeholder?: string
  align?: 'start' | 'center' | 'end'
  className?: string
}

export function DateRangePicker({
  value,
  onChange,
  presets,
  min,
  max,
  numberOfMonths = 2,
  placeholder = 'Tarih aralığı',
  align = 'start',
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)
  const isDesktop = useMinWidth('(min-width: 640px)')
  const months = isDesktop ? numberOfMonths : 1
  const presetList = presets ?? defaultDateRangePresets()

  const disabled = React.useMemo(
    () =>
      [min ? { before: min } : null, max ? { after: max } : null].filter(
        (m): m is { before: Date } | { after: Date } => m !== null,
      ),
    [min, max],
  )

  const hasValue = Boolean(value?.from)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          data-slot="date-range-picker-trigger"
          className={cn(
            'h-9 w-full justify-start gap-2 px-3 font-normal',
            !hasValue && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{formatLabel(value, placeholder)}</span>
          {hasValue ? (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Temizle"
              className="ml-auto rounded-sm p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation()
                onChange(undefined)
              }}
            >
              <X className="size-3.5" />
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className="flex max-h-[85vh] w-auto max-w-[calc(100vw-2rem)] flex-col overflow-y-auto p-0 sm:flex-row"
      >
        {presetList.length > 0 ? (
          <div className="flex shrink-0 gap-1 overflow-x-auto border-b p-2 sm:max-w-40 sm:flex-col sm:overflow-visible sm:border-r sm:border-b-0">
            {presetList.map((p) => {
              const range = p.getRange()
              const active = sameRange(value, range)
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    onChange(range)
                    setOpen(false)
                  }}
                  className={cn(
                    'shrink-0 rounded-md px-2.5 py-1.5 text-left text-sm whitespace-nowrap transition-colors hover:bg-accent hover:text-accent-foreground sm:w-full',
                    active && 'bg-accent font-medium text-accent-foreground',
                  )}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
        ) : null}

        <div className="flex flex-col">
          <Calendar
            mode="range"
            selected={value}
            onSelect={onChange}
            numberOfMonths={months}
            defaultMonth={value?.from}
            disabled={disabled.length ? disabled : undefined}
            autoFocus
          />
          <div className="flex items-center justify-between gap-2 border-t p-2">
            <span className="px-1 text-xs text-muted-foreground">
              {formatLabel(value, 'Aralık seçin')}
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={!hasValue}
                onClick={() => onChange(undefined)}
              >
                Temizle
              </Button>
              <Button size="sm" onClick={() => setOpen(false)}>
                Uygula
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
