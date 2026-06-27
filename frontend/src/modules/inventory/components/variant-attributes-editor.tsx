import * as React from 'react'
import { Plus, X } from 'lucide-react'

import type { VariantAttribute } from '@turbohesap/shared'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

// Edits a product template's variant axes, e.g.
// [{ name: "Renk", values: ["Kırmızı","Mavi"] }, { name: "Beden", values: ["S","M"] }].
// Values are entered as tags (type + Enter/comma). The cartesian product of all
// axes becomes the generatable variant set.
export function VariantAttributesEditor({
  value,
  onChange,
}: {
  value: VariantAttribute[]
  onChange: (next: VariantAttribute[]) => void
}) {
  const update = (i: number, patch: Partial<VariantAttribute>) =>
    onChange(value.map((a, idx) => (idx === i ? { ...a, ...patch } : a)))
  const addAxis = () => onChange([...value, { name: '', values: [] }])
  const removeAxis = (i: number) => onChange(value.filter((_, idx) => idx !== i))

  // Cartesian size — product of all axis value-counts; 0 unless every axis has
  // at least one value.
  const comboCount =
    value.length > 0 && value.every((a) => a.values.length > 0)
      ? value.reduce((acc, a) => acc * a.values.length, 1)
      : 0

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Varyant özellikleri</p>
        {comboCount > 0 ? (
          <span className="text-xs text-muted-foreground">
            {comboCount} kombinasyon
          </span>
        ) : null}
      </div>

      {value.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Henüz eksen yok. Örn. “Renk” ve “Beden” ekleyip değerlerini girin.
        </p>
      ) : (
        <div className="space-y-3">
          {value.map((axis, i) => (
            <div key={i} className="space-y-2 rounded-md border bg-background p-2.5">
              <div className="flex items-center gap-2">
                <Input
                  value={axis.name}
                  onChange={(e) => update(i, { name: e.target.value })}
                  placeholder="Eksen adı (Renk, Beden…)"
                  className="h-8"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeAxis(i)}
                  aria-label="Ekseni kaldır"
                >
                  <X className="size-4 text-destructive" />
                </Button>
              </div>
              <TagInput
                values={axis.values}
                onChange={(vals) => update(i, { values: vals })}
              />
            </div>
          ))}
        </div>
      )}

      <Button type="button" variant="outline" size="sm" onClick={addAxis}>
        <Plus className="size-4" />
        Eksen ekle
      </Button>
    </div>
  )
}

function TagInput({
  values,
  onChange,
}: {
  values: string[]
  onChange: (next: string[]) => void
}) {
  const [draft, setDraft] = React.useState('')

  const commit = (raw: string) => {
    const parts = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (parts.length === 0) return
    const next = [...values]
    for (const p of parts) if (!next.includes(p)) next.push(p)
    onChange(next)
    setDraft('')
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {values.map((v) => (
        <Badge key={v} variant="secondary" className="gap-1 pr-1">
          {v}
          <button
            type="button"
            onClick={() => onChange(values.filter((x) => x !== v))}
            className="rounded-sm hover:bg-muted-foreground/20"
            aria-label={`${v} kaldır`}
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            commit(draft)
          } else if (e.key === 'Backspace' && draft === '' && values.length) {
            onChange(values.slice(0, -1))
          }
        }}
        onBlur={() => commit(draft)}
        placeholder="Değer ekle…"
        className="h-7 w-28 flex-1 border-dashed text-xs"
      />
    </div>
  )
}
