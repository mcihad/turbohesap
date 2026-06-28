import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Armchair, Layers, Pencil, Plus, Table2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  PosPermissions,
  toApiError,
  type PosFloorDto,
  type PosTableDto,
} from '@turbohesap/shared'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { PageHeader, PageWrapper } from '@/components/layout/page'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

export function FloorsPage() {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canManage = hasPermission(PosPermissions.tablesManage)

  const floorsQuery = useQuery({ queryKey: ['pos', 'floors'], queryFn: () => api.pos.tables.listFloors() })
  const floors = floorsQuery.data ?? []
  const [activeFloor, setActiveFloor] = React.useState<string | null>(null)
  const floorId = activeFloor ?? floors[0]?.id ?? null

  const tablesQuery = useQuery({
    queryKey: ['pos', 'tables', floorId],
    queryFn: () => api.pos.tables.listTables({ floorId: floorId as string }),
    enabled: !!floorId,
  })

  const [floorDialog, setFloorDialog] = React.useState<PosFloorDto | 'new' | null>(null)
  const [tableDialog, setTableDialog] = React.useState<PosTableDto | 'new' | null>(null)

  const removeFloor = useMutation({
    mutationFn: (id: string) => api.pos.tables.removeFloor(id),
    onSuccess: () => {
      toast.success('Kat silindi')
      qc.invalidateQueries({ queryKey: ['pos', 'floors'] })
      qc.invalidateQueries({ queryKey: ['pos', 'tables'] })
    },
    onError: (e) => toast.error('Silinemedi', { description: toApiError(e).message }),
  })
  const removeTable = useMutation({
    mutationFn: (id: string) => api.pos.tables.removeTable(id),
    onSuccess: () => {
      toast.success('Masa silindi')
      qc.invalidateQueries({ queryKey: ['pos', 'tables'] })
    },
    onError: (e) => toast.error('Silinemedi', { description: toApiError(e).message }),
  })

  const tables = tablesQuery.data ?? []
  const activeFloorName = floors.find((f) => f.id === floorId)?.name ?? 'Masalar'
  const totalSeats = tables.reduce((s, t) => s + (t.seats || 0), 0)

  return (
    <PermissionRequired permission={PosPermissions.tablesManage}>
      <PageWrapper className="space-y-6">
        <PageHeader
          title="Katlar & Masalar"
          description="Salon düzenini planlayın — kat ekleyin, her kata masa yerleştirin."
          actions={
            canManage ? (
              <Button onClick={() => setFloorDialog('new')}>
                <Plus className="size-4" /> Yeni Kat
              </Button>
            ) : null
          }
        />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[17rem_1fr]">
          {/* Floors rail */}
          <div className="space-y-3">
            <p className="px-1 text-2xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Katlar</p>
            <div className="space-y-1.5">
              {floorsQuery.isLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-[3.25rem] animate-pulse rounded-xl border bg-card" />
                  ))
                : floors.map((f) => {
                    const active = f.id === floorId
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setActiveFloor(f.id)}
                        className={cn(
                          'group relative flex w-full items-center gap-3 overflow-hidden rounded-xl border px-3.5 py-2.5 text-left transition-colors',
                          active ? 'border-primary/40 bg-primary/10' : 'bg-card hover:bg-accent',
                        )}
                      >
                        {active ? <span className="absolute inset-y-0 left-0 w-1 rounded-r bg-primary" /> : null}
                        <span
                          className={cn(
                            'flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors',
                            active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                          )}
                        >
                          <Layers className="size-4" />
                        </span>
                        <span
                          className={cn(
                            'min-w-0 flex-1 truncate text-sm font-semibold',
                            active ? 'text-primary' : 'text-foreground',
                          )}
                        >
                          {f.name}
                        </span>
                        {canManage ? (
                          <span className="flex shrink-0 gap-0.5">
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation()
                                setFloorDialog(f)
                              }}
                              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                            >
                              <Pencil className="size-3.5" />
                            </span>
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation()
                                if (confirm(`"${f.name}" katı ve masaları silinsin mi?`)) removeFloor.mutate(f.id)
                              }}
                              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-destructive"
                            >
                              <Trash2 className="size-3.5" />
                            </span>
                          </span>
                        ) : null}
                      </button>
                    )
                  })}
              {floors.length === 0 && !floorsQuery.isLoading ? (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-8 text-center">
                  <Layers className="size-7 text-muted-foreground/40" />
                  <p className="text-sm font-medium">Henüz kat yok</p>
                  {canManage ? (
                    <Button size="sm" variant="outline" onClick={() => setFloorDialog('new')}>
                      <Plus className="size-4" /> İlk katı ekle
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          {/* Tables of the active floor */}
          <div className="rounded-2xl border bg-card">
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold tracking-tight">{activeFloorName}</h3>
                {floorId ? (
                  <p className="text-2xs text-muted-foreground tabular-nums">
                    {tables.length} masa · {totalSeats} koltuk
                  </p>
                ) : null}
              </div>
              {canManage && floorId ? (
                <Button variant="outline" size="sm" onClick={() => setTableDialog('new')}>
                  <Plus className="size-4" /> Masa Ekle
                </Button>
              ) : null}
            </div>

            <div className="p-4">
              {tablesQuery.isLoading ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="aspect-square animate-pulse rounded-2xl border bg-muted/40" />
                  ))}
                </div>
              ) : tables.length === 0 && floorId ? (
                <div className="flex flex-col items-center gap-3 py-14 text-center">
                  <Table2 className="size-9 text-muted-foreground/40" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Bu katta masa yok</p>
                    <p className="text-2xs text-muted-foreground">Masaları ekleyin, salonda görünür olsunlar.</p>
                  </div>
                  {canManage ? (
                    <Button size="sm" onClick={() => setTableDialog('new')}>
                      <Plus className="size-4" /> Masa Ekle
                    </Button>
                  ) : null}
                </div>
              ) : !floorId ? (
                <div className="flex flex-col items-center gap-2 py-14 text-center text-muted-foreground">
                  <Layers className="size-9 opacity-40" />
                  <p className="text-sm">Masaları görmek için bir kat seçin.</p>
                </div>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-3">
                  {tables.map((tb) => (
                    <div
                      key={tb.id}
                      className="group relative flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border bg-gradient-to-b from-card to-muted/40 p-3 shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                    >
                      <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Table2 className="size-5" />
                      </span>
                      <span className="max-w-full truncate text-base font-semibold">{tb.name}</span>
                      {tb.seats > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-2xs font-medium text-muted-foreground tabular-nums">
                          <Armchair className="size-3" /> {tb.seats}
                        </span>
                      ) : (
                        <span className="text-2xs text-muted-foreground/70">koltuk yok</span>
                      )}
                      {canManage ? (
                        <div className="absolute right-1.5 top-1.5 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                          <button
                            type="button"
                            onClick={() => setTableDialog(tb)}
                            className="rounded-md bg-background/90 p-1.5 text-muted-foreground shadow-xs hover:bg-accent hover:text-foreground"
                          >
                            <Pencil className="size-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`"${tb.name}" masası silinsin mi?`)) removeTable.mutate(tb.id)
                            }}
                            className="rounded-md bg-background/90 p-1.5 text-muted-foreground shadow-xs hover:bg-accent hover:text-destructive"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {floorDialog ? (
          <FloorDialog
            floor={floorDialog === 'new' ? null : floorDialog}
            onClose={() => setFloorDialog(null)}
            onSaved={() => {
              setFloorDialog(null)
              qc.invalidateQueries({ queryKey: ['pos', 'floors'] })
            }}
          />
        ) : null}
        {tableDialog && floorId ? (
          <TableDialog
            table={tableDialog === 'new' ? null : tableDialog}
            floorId={floorId}
            onClose={() => setTableDialog(null)}
            onSaved={() => {
              setTableDialog(null)
              qc.invalidateQueries({ queryKey: ['pos', 'tables'] })
            }}
          />
        ) : null}
      </PageWrapper>
    </PermissionRequired>
  )
}

function FloorDialog({
  floor,
  onClose,
  onSaved,
}: {
  floor: PosFloorDto | null
  onClose: () => void
  onSaved: () => void
}) {
  const branchesQuery = useQuery({ queryKey: ['org', 'branches'], queryFn: () => api.org.branches.list() })
  const [name, setName] = React.useState(floor?.name ?? '')
  const [branchId, setBranchId] = React.useState(floor?.branchId ?? (null as string | null))

  // default to the first branch on create
  React.useEffect(() => {
    if (!floor && branchId == null && branchesQuery.data?.length) setBranchId(branchesQuery.data[0].id)
  }, [floor, branchId, branchesQuery.data])

  const save = useMutation({
    mutationFn: () => {
      const payload = { name: name.trim(), branchId }
      return floor ? api.pos.tables.updateFloor(floor.id, payload) : api.pos.tables.createFloor(payload)
    },
    onSuccess: () => {
      toast.success(floor ? 'Kat güncellendi' : 'Kat eklendi')
      onSaved()
    },
    onError: (e) => toast.error('Kaydedilemedi', { description: toApiError(e).message }),
  })

  return (
    <Dialog open onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{floor ? 'Kat Düzenle' : 'Yeni Kat'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-2xs text-muted-foreground">Kat adı</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Zemin Kat / Bahçe" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Vazgeç
          </Button>
          <Button disabled={!name.trim() || save.isPending} onClick={() => save.mutate()}>
            Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TableDialog({
  table,
  floorId,
  onClose,
  onSaved,
}: {
  table: PosTableDto | null
  floorId: string
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = React.useState(table?.name ?? '')
  const [seats, setSeats] = React.useState(table?.seats ?? 0)

  const save = useMutation({
    mutationFn: () => {
      const payload = { floorId, name: name.trim(), seats }
      return table ? api.pos.tables.updateTable(table.id, payload) : api.pos.tables.createTable(payload)
    },
    onSuccess: () => {
      toast.success(table ? 'Masa güncellendi' : 'Masa eklendi')
      onSaved()
    },
    onError: (e) => toast.error('Kaydedilemedi', { description: toApiError(e).message }),
  })

  return (
    <Dialog open onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{table ? 'Masa Düzenle' : 'Yeni Masa'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-2xs text-muted-foreground">Masa adı</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="M1" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-2xs text-muted-foreground">Koltuk</Label>
            <Input
              type="number"
              min={0}
              value={seats}
              onChange={(e) => setSeats(Math.max(0, Number(e.target.value) || 0))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Vazgeç
          </Button>
          <Button disabled={!name.trim() || save.isPending} onClick={() => save.mutate()}>
            Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
