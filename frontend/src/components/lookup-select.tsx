// LookupSelect — a reusable, data-aware combobox bound to a named lookup list.
// Give it a `list` (e.g. "birim") and it auto-fetches that list's items, lets the
// user pick one (stores the item's stable `key`), and — when the user has
// `lookups.write` — offers an inline **"+"** to add a new value on the spot.
//
//   <LookupSelect list="birim" value={unit} onChange={setUnit} />
//
// Used across the app's forms wherever a managed key/value choice is needed.

import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { LookupsPermissions, toApiError } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function lookupQueryKey(list: string) {
  return ['lookups', 'items', list] as const
}

export function LookupSelect({
  list,
  value,
  onChange,
  placeholder = 'Seçin',
  allowCreate = true,
  disabled = false,
  className,
}: {
  list: string
  value: string | null | undefined
  onChange: (key: string) => void
  placeholder?: string
  allowCreate?: boolean
  disabled?: boolean
  className?: string
}) {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(LookupsPermissions.read)
  const canWrite = hasPermission(LookupsPermissions.write)
  const [addOpen, setAddOpen] = React.useState(false)

  const itemsQuery = useQuery({
    queryKey: lookupQueryKey(list),
    queryFn: () => api.lookups.list(list),
    enabled: canRead,
  })

  const items = itemsQuery.data ?? []
  const active = items.filter((i) => i.isActive || i.key === value)
  // The selected key might not be in the active set (e.g. deactivated) — keep it
  // visible so the field still shows the current choice.
  const selectedMissing =
    value != null && value !== '' && !active.some((i) => i.key === value)

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Select
        value={value ?? ''}
        onValueChange={onChange}
        disabled={disabled || !canRead}
      >
        <SelectTrigger className="flex-1">
          <SelectValue placeholder={canRead ? placeholder : 'Yetki yok'} />
        </SelectTrigger>
        <SelectContent>
          {active.map((i) => (
            <SelectItem key={i.key} value={i.key}>
              {i.value}
            </SelectItem>
          ))}
          {selectedMissing ? (
            <SelectItem value={value as string}>{value}</SelectItem>
          ) : null}
          {active.length === 0 && !selectedMissing ? (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              {itemsQuery.isLoading ? 'Yükleniyor…' : 'Bu listede öğe yok'}
            </div>
          ) : null}
        </SelectContent>
      </Select>

      {allowCreate && canWrite ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled}
          title="Yeni değer ekle"
          onClick={() => setAddOpen(true)}
        >
          <Plus />
        </Button>
      ) : null}

      <AddLookupDialog
        list={list}
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={(item) => {
          void qc.invalidateQueries({ queryKey: lookupQueryKey(list) })
          onChange(item.key)
        }}
      />
    </div>
  )
}

function AddLookupDialog({
  list,
  open,
  onOpenChange,
  onCreated,
}: {
  list: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (item: { key: string; value: string }) => void
}) {
  const [value, setValue] = React.useState('')

  React.useEffect(() => {
    if (open) setValue('')
  }, [open])

  const mutation = useMutation({
    mutationFn: () => api.lookups.create({ list, value: value.trim() }),
    onSuccess: (item) => {
      toast.success('Değer eklendi')
      onOpenChange(false)
      onCreated(item)
    },
    onError: (e) =>
      toast.error('Eklenemedi', { description: toApiError(e).message }),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Yeni değer</DialogTitle>
          <DialogDescription>
            <span className="font-mono">{list}</span> listesine yeni bir değer
            ekleyin. Anahtar otomatik üretilir.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5 py-1">
          <Label htmlFor="lookup-add-value">Değer</Label>
          <Input
            id="lookup-add-value"
            value={value}
            autoFocus
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && value.trim()) mutation.mutate()
            }}
            placeholder="örn. Kilogram"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!value.trim() || mutation.isPending}
          >
            <Check />
            Ekle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
