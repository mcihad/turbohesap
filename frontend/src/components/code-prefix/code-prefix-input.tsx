import * as React from 'react'
import { Check, ChevronDown } from 'lucide-react'

import type { CodePrefixDto } from '@turbohesap/shared'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useCodePrefix } from './use-code-prefix'

export interface CodePrefixInputHandle {
  /**
   * Call right before the parent form submits. Consumes (atomically
   * reserves) the code now if the selected prefix defers that to save time;
   * otherwise just returns the value already shown. Returns the
   * authoritative final code string to send in the parent's payload.
   */
  finalize: () => Promise<string>
}

export interface CodePrefixInputProps {
  /** Usage context, e.g. "inventory.products" — selects which prefixes are offered. */
  context: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  /**
   * Auto-restore the last-used prefix and immediately peek/consume a fresh
   * code on mount. Defaults to `!disabled` (locked fields never auto-assign).
   * Set explicitly to `false` for a field that is still EDITABLE but already
   * holds a real value (e.g. editing an existing cari whose code may be
   * changed by hand) — the prefix still gets detected from that existing
   * value for display-splitting, but nothing is auto-consumed just from
   * opening the form; a new code is only generated if the user explicitly
   * reopens the prefix picker and picks one.
   */
  autoAssign?: boolean
  className?: string
  ref?: React.Ref<CodePrefixInputHandle>
}

/**
 * A code field with a clickable prefix segment on the left (opens a list of
 * configured prefixes for `context`) and an editable NUMBER-ONLY segment on
 * the right — the prefix text itself is never duplicated into the text box.
 * Each prefix owns its own auto-incrementing counter — see `useCodePrefix`
 * for the increment-timing contract. Hand-typing into the number segment
 * always overrides auto-numbering for that record; the composed
 * `prefix + number` string is what's reported via `onChange`/`finalize()`.
 */
function CodePrefixInput({ context, value, onChange, disabled, autoAssign, className, ref }: CodePrefixInputProps) {
  const cp = useCodePrefix({ context, enabled: autoAssign ?? !disabled })
  const onChangeRef = React.useRef(onChange)
  onChangeRef.current = onChange

  React.useImperativeHandle(ref, () => ({ finalize: cp.finalize }), [cp.finalize])

  // Reflect the hook's value (from prefix pick / peek / consume) into the
  // parent's controlled state — but only once a selection actually exists.
  // Before that, `displayValue` is just '' and must not blow away the
  // parent's real value (e.g. an existing record's current code).
  React.useEffect(() => {
    if (!cp.selectedId) return
    if (cp.displayValue !== value) onChangeRef.current(cp.displayValue)
  }, [cp.displayValue, cp.selectedId, value])

  // No active selection yet (locked field, or an editable field that hasn't
  // had its prefix explicitly (re)picked) — figure out which configured
  // prefix (if any) the current value already starts with, purely to split
  // it for display. Prefer the LONGEST matching prefix: contexts can have
  // overlapping prefixes (e.g. "ST-" and "ST-POS-"), and picking the first
  // match instead of the most specific one would misparse "ST-POS-0001" as
  // prefix "ST-" + number "POS-0001".
  const matchedFromValue = cp.prefixes.reduce<CodePrefixDto | null>(
    (best, p) =>
      value.startsWith(p.prefix) && (!best || p.prefix.length > best.prefix.length) ? p : best,
    null,
  )
  const activePrefix = cp.selected ?? matchedFromValue
  const numberValue = activePrefix ? value.slice(activePrefix.prefix.length) : value

  function handleNumberChange(text: string) {
    const full = (activePrefix?.prefix ?? '') + text
    cp.onManualChange(full)
    onChange(full)
  }

  return (
    <div data-slot="code-prefix-input" className={cn('flex', className)}>
      <Popover>
        <PopoverTrigger asChild disabled={disabled || cp.prefixes.length === 0}>
          <Button
            type="button"
            variant="outline"
            disabled={disabled || cp.prefixes.length === 0}
            className="shrink-0 rounded-r-none border-r-0 font-mono focus-visible:z-10"
          >
            {activePrefix?.prefix ?? '—'}
            <ChevronDown className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56 p-1">
          {cp.prefixes.length === 0 ? (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">Bu bağlam için önek tanımlı değil.</p>
          ) : (
            cp.prefixes.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => cp.selectPrefix(p.id)}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent"
              >
                <span className="font-mono">{p.prefix}</span>
                {p.id === cp.selectedId ? <Check className="size-4" /> : null}
              </button>
            ))
          )}
        </PopoverContent>
      </Popover>
      <Input
        value={numberValue}
        disabled={disabled}
        onChange={(e) => handleNumberChange(e.target.value)}
        placeholder={cp.isBusy ? 'Üretiliyor…' : undefined}
        className="rounded-l-none font-mono"
      />
    </div>
  )
}

export { CodePrefixInput }
