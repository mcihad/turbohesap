import { useQuery } from '@tanstack/react-query'
import { Table2, Users } from 'lucide-react'

import type { PosTableWithStatus } from '@turbohesap/shared'
import { api } from '@/lib/api'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { money } from '../labels'

// Floor map for dine-in seating. Free tables start a new tab; occupied tables
// (with an open order) reopen the running tab.
export function TablePicker({
  open,
  branchId,
  onClose,
  onPick,
}: {
  open: boolean
  branchId: string | null
  onClose: () => void
  onPick: (table: PosTableWithStatus) => void
}) {
  const layoutQuery = useQuery({
    queryKey: ['pos', 'floors', 'layout', branchId],
    queryFn: () => api.pos.tables.layout(branchId ?? undefined),
    enabled: open,
  })
  const floors = layoutQuery.data ?? []

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent className="max-h-[88vh] gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle>Masa Seç</DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] space-y-5 overflow-y-auto p-5">
          {layoutQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Yükleniyor…</p>
          ) : floors.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Tanımlı masa yok. POS &gt; Katlar &amp; Masalar bölümünden ekleyin.
            </p>
          ) : (
            floors.map((f) => (
              <div key={f.id} className="space-y-2">
                <h4 className="text-sm font-semibold text-muted-foreground">{f.name}</h4>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-2">
                  {f.tables.map((tb) => {
                    const busy = !!tb.openOrderId
                    return (
                      <button
                        key={tb.id}
                        type="button"
                        onClick={() => onPick(tb)}
                        className={cn(
                          'flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border p-2 transition-all hover:shadow-md active:scale-95',
                          busy
                            ? 'border-amber-500/40 bg-amber-500/10'
                            : 'border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500',
                        )}
                      >
                        <Table2 className={cn('size-5', busy ? 'text-amber-600' : 'text-emerald-600')} />
                        <span className="text-sm font-semibold">{tb.name}</span>
                        {busy ? (
                          <span className="text-2xs font-medium text-amber-600">{money(tb.openTotal)}</span>
                        ) : tb.seats > 0 ? (
                          <span className="flex items-center gap-0.5 text-2xs text-muted-foreground">
                            <Users className="size-3" />
                            {tb.seats}
                          </span>
                        ) : (
                          <span className="text-2xs text-emerald-600">Boş</span>
                        )}
                      </button>
                    )
                  })}
                  {f.tables.length === 0 ? (
                    <span className="text-2xs text-muted-foreground">Masa yok</span>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
