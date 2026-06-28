// BulkActionsBar — sticky bar shown when DataGrid rows are selected. Owns the
// bulk mutation, success toast and cache invalidation; tells the parent to clear
// the selection via `onCleared`. Supports the contacts grid (assign owner, add
// tag, set active) and the opportunities grid (assign owner, move stage).

import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { toast } from 'sonner'

import {
  toApiError,
  type BulkContactRequest,
  type BulkOpportunityRequest,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { OwnerSelect } from './owner-select'

function Shell({
  count,
  onClear,
  children,
}: {
  count: number
  onClear: () => void
  children: React.ReactNode
}) {
  return (
    <div className="sticky bottom-3 z-20 flex flex-wrap items-center gap-3 rounded-lg border bg-card/95 p-2.5 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <span className="px-1 text-sm font-medium">{count} seçili</span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      <Button variant="ghost" size="sm" className="ml-auto" onClick={onClear}>
        <X className="size-4" />
        Seçimi temizle
      </Button>
    </div>
  )
}

export function ContactsBulkBar({
  ids,
  onCleared,
}: {
  ids: string[]
  onCleared: () => void
}) {
  const qc = useQueryClient()
  const [tag, setTag] = React.useState('')

  const mutation = useMutation({
    mutationFn: (input: Omit<BulkContactRequest, 'ids'>) =>
      api.contacts.contacts.bulk({ ids, ...input }),
    onSuccess: (res) => {
      toast.success(`${res.updated} cari güncellendi`)
      setTag('')
      void qc.invalidateQueries({ queryKey: ['contacts', 'contacts'] })
      onCleared()
    },
    onError: (e) => toast.error('İşlem başarısız', { description: toApiError(e).message }),
  })

  const pending = mutation.isPending

  return (
    <Shell count={ids.length} onClear={onCleared}>
      <div className="w-48">
        <OwnerSelect
          value={null}
          placeholder="Sorumlu ata"
          allowUnassigned={false}
          onChange={(v) => mutation.mutate({ op: 'assignOwner', value: v })}
        />
      </div>

      <form
        className="flex items-center gap-1"
        onSubmit={(e) => {
          e.preventDefault()
          if (tag.trim()) mutation.mutate({ op: 'addTag', value: tag.trim() })
        }}
      >
        <Input
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          placeholder="Etiket ekle…"
          className="h-9 w-40"
        />
        <Button type="submit" variant="outline" size="sm" disabled={!tag.trim() || pending}>
          Ekle
        </Button>
      </form>

      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => mutation.mutate({ op: 'setActive', value: 'true' })}
      >
        Aktif yap
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => mutation.mutate({ op: 'setActive', value: 'false' })}
      >
        Pasif yap
      </Button>
    </Shell>
  )
}

export function OpportunitiesBulkBar({
  ids,
  onCleared,
}: {
  ids: string[]
  onCleared: () => void
}) {
  const qc = useQueryClient()

  const pipelinesQuery = useQuery({
    queryKey: ['contacts', 'pipelines'],
    queryFn: () => api.contacts.pipelines.list(),
  })
  const pipelines = pipelinesQuery.data ?? []
  const defaultPipeline = pipelines.find((p) => p.isDefault) ?? pipelines[0] ?? null
  const stages = defaultPipeline
    ? [...defaultPipeline.stages].sort((a, b) => a.sortOrder - b.sortOrder)
    : []

  const mutation = useMutation({
    mutationFn: (input: Omit<BulkOpportunityRequest, 'ids'>) =>
      api.contacts.opportunities.bulk({ ids, ...input }),
    onSuccess: (res) => {
      toast.success(`${res.updated} fırsat güncellendi`)
      void qc.invalidateQueries({ queryKey: ['contacts', 'opportunities'] })
      onCleared()
    },
    onError: (e) => toast.error('İşlem başarısız', { description: toApiError(e).message }),
  })

  return (
    <Shell count={ids.length} onClear={onCleared}>
      <div className="w-48">
        <OwnerSelect
          value={null}
          placeholder="Sorumlu ata"
          allowUnassigned={false}
          onChange={(v) => mutation.mutate({ op: 'assignOwner', value: v })}
        />
      </div>

      <Select
        value=""
        onValueChange={(v) => mutation.mutate({ op: 'move', value: v })}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Aşama taşı" />
        </SelectTrigger>
        <SelectContent>
          {stages.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Shell>
  )
}
