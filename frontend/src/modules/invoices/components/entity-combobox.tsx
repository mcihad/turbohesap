import * as React from 'react'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

// A searchable picker with an inline "+ create" action — the heart of the
// invoice entry page's "create anything on the spot" UX (cari & ürün).
export function EntityCombobox<T>({
  items,
  value,
  onChange,
  getId,
  getLabel,
  getSub,
  placeholder = 'Seçin',
  searchPlaceholder = 'Ara…',
  emptyText = 'Sonuç yok',
  onCreate,
  createLabel = 'Yeni ekle',
  disabled,
  className,
}: {
  items: T[]
  value: string | null
  onChange: (id: string | null, item: T | null) => void
  getId: (t: T) => string
  getLabel: (t: T) => string
  getSub?: (t: T) => string | undefined
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  onCreate?: (query: string) => void
  createLabel?: string
  disabled?: boolean
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const selected = items.find((i) => getId(i) === value) ?? null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('w-full justify-between font-normal', !selected && 'text-muted-foreground', className)}
        >
          <span className="truncate">{selected ? getLabel(selected) : placeholder}</span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>
              <div className="flex flex-col items-center gap-2 py-3 text-sm">
                <span className="text-muted-foreground">{emptyText}</span>
                {onCreate ? (
                  <Button size="sm" onClick={() => { setOpen(false); onCreate(query) }}>
                    <Plus className="size-4" />
                    {createLabel}
                  </Button>
                ) : null}
              </div>
            </CommandEmpty>
            <CommandGroup>
              {items.map((item) => {
                const id = getId(item)
                const sub = getSub?.(item)
                return (
                  <CommandItem
                    key={id}
                    value={`${getLabel(item)} ${sub ?? ''}`}
                    onSelect={() => { onChange(id, item); setOpen(false) }}
                  >
                    <Check className={cn('mr-2 size-4', value === id ? 'opacity-100' : 'opacity-0')} />
                    <span className="flex-1 truncate">{getLabel(item)}</span>
                    {sub ? <span className="ml-2 text-xs text-muted-foreground">{sub}</span> : null}
                  </CommandItem>
                )
              })}
            </CommandGroup>
            {onCreate && items.length > 0 ? (
              <div className="border-t p-1">
                <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => { setOpen(false); onCreate(query) }}>
                  <Plus className="size-4" />
                  {createLabel}
                </Button>
              </div>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
