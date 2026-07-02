// TagInput — a small free-text chip editor for a document's tags. No reusable
// tag-input primitive exists elsewhere in the codebase yet (contacts only
// *displays* tags as badges); this is a local, documents-only component.

import * as React from 'react'
import { X } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export function TagInput({
  value,
  onChange,
  suggestions,
  placeholder = 'Etiket ekleyin, Enter’a basın',
  className,
}: {
  value: string[]
  onChange: (tags: string[]) => void
  /** Existing tag names for autocomplete (native <datalist>). */
  suggestions?: string[]
  placeholder?: string
  className?: string
}) {
  const [draft, setDraft] = React.useState('')
  const listId = React.useId()

  const add = (raw: string) => {
    const t = raw.trim()
    if (!t) return
    if (!value.some((x) => x.toLocaleLowerCase('tr') === t.toLocaleLowerCase('tr'))) {
      onChange([...value, t])
    }
    setDraft('')
  }
  const remove = (t: string) => onChange(value.filter((x) => x !== t))

  return (
    <div
      className={cn(
        'flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-2 py-1.5 shadow-xs transition-[color,box-shadow]',
        'focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50',
        className,
      )}
    >
      {value.map((t) => (
        <Badge key={t} variant="secondary" className="gap-1 pr-1">
          {t}
          <button
            type="button"
            onClick={() => remove(t)}
            aria-label={`${t} etiketini kaldır`}
            className="rounded-full hover:bg-foreground/10"
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            add(draft)
          } else if (e.key === 'Backspace' && !draft && value.length > 0) {
            remove(value[value.length - 1])
          }
        }}
        onBlur={() => { if (draft.trim()) add(draft) }}
        list={suggestions?.length ? listId : undefined}
        placeholder={value.length ? '' : placeholder}
        className="min-w-[140px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
      {suggestions?.length ? (
        <datalist id={listId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      ) : null}
    </div>
  )
}
