// Kartlı geçiş (PDKS) — sekmeli ayar sayfası: Kart Kaynakları, Personel Kartları,
// İçe Aktar (JSON/CSV → import) ve Veri Standardı (vendor-bağımsız döküman).
import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CreditCard, FileUp, IdCard, Pencil, Plus, Save, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'

import {
  HrPermissions,
  toApiError,
  type AccessEvent,
  type AttendanceImportResultDto,
  type CardSourceDto,
  type EmployeeCardDto,
  type EmployeeDto,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { PageWrapper } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { DataGrid, type ColumnDef } from '@/components/data-grid'

export function CardAccessPage() {
  const { hasPermission } = useAuth()
  const canRead = hasPermission(HrPermissions.cardsRead)

  return (
    <PermissionRequired permission={HrPermissions.cardsRead}>
      <PageWrapper>
        {canRead ? (
          <Tabs defaultValue="sources">
            <TabsList>
              <TabsTrigger value="sources">
                <CreditCard className="size-4" />
                Kart Kaynakları
              </TabsTrigger>
              <TabsTrigger value="cards">
                <IdCard className="size-4" />
                Personel Kartları
              </TabsTrigger>
              <TabsTrigger value="import">
                <FileUp className="size-4" />
                İçe Aktar
              </TabsTrigger>
              <TabsTrigger value="standard">
                <Upload className="size-4" />
                Veri Standardı
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sources">
              <CardSourcesTab />
            </TabsContent>
            <TabsContent value="cards">
              <EmployeeCardsTab />
            </TabsContent>
            <TabsContent value="import">
              <ImportTab />
            </TabsContent>
            <TabsContent value="standard">
              <StandardTab />
            </TabsContent>
          </Tabs>
        ) : null}
      </PageWrapper>
    </PermissionRequired>
  )
}

// ── Tab: Kart Kaynakları ──────────────────────────────────────────────────────

function CardSourcesTab() {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canWrite = hasPermission(HrPermissions.cardsWrite)

  const sourcesQuery = useQuery({
    queryKey: ['hr', 'card-sources'],
    queryFn: () => api.hr.cardSources.list(),
  })

  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<CardSourceDto | null>(null)

  const invalidate = () => qc.invalidateQueries({ queryKey: ['hr', 'card-sources'] })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.hr.cardSources.remove(id),
    onSuccess: () => {
      toast.success('Kaynak silindi')
      void invalidate()
    },
    onError: (e) => toast.error('Silme başarısız', { description: toApiError(e).message }),
  })

  const sources = sourcesQuery.data ?? []

  const columns: ColumnDef<CardSourceDto>[] = [
    {
      id: 'name',
      accessorKey: 'name',
      header: 'Ad',
      size: 200,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      id: 'code',
      accessorKey: 'code',
      header: 'Kod',
      size: 130,
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.code}</span>,
    },
    {
      id: 'kind',
      accessorKey: 'kind',
      header: 'Tür',
      size: 140,
      cell: ({ row }) => <Badge variant="secondary">{row.original.kind}</Badge>,
    },
    {
      id: 'timezone',
      accessorKey: 'timezone',
      header: 'Saat dilimi',
      size: 150,
      cell: ({ row }) => <span className="text-muted-foreground">{row.original.timezone}</span>,
    },
    {
      id: 'hasApiKey',
      header: 'API',
      size: 100,
      cell: ({ row }) =>
        row.original.hasApiKey ? <Badge variant="info">Anahtar var</Badge> : <span className="text-muted-foreground">—</span>,
    },
    {
      id: 'isActive',
      accessorKey: 'isActive',
      header: 'Durum',
      size: 100,
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? 'success' : 'outline'}>
          {row.original.isActive ? 'Aktif' : 'Pasif'}
        </Badge>
      ),
    },
    ...(canWrite
      ? [
          {
            id: 'actions',
            header: '',
            size: 90,
            enableSorting: false,
            enableHiding: false,
            enableColumnFilter: false,
            enableGrouping: false,
            cell: ({ row }) => (
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditing(row.original)
                    setOpen(true)
                  }}
                  aria-label="Düzenle"
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm(`"${row.original.name}" kaynağı silinsin mi?`))
                      deleteMutation.mutate(row.original.id)
                  }}
                  aria-label="Sil"
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ),
          } as ColumnDef<CardSourceDto>,
        ]
      : []),
  ]

  return (
    <>
      <DataGrid
        gridId="hr.card-sources"
        data={sources}
        columns={columns}
        getRowId={(s) => s.id}
        loading={sourcesQuery.isLoading}
        onRowClick={
          canWrite
            ? (s) => {
                setEditing(s)
                setOpen(true)
              }
            : undefined
        }
        emptyText="Kart kaynağı yok."
        toolbar={
          canWrite ? (
            <Button
              onClick={() => {
                setEditing(null)
                setOpen(true)
              }}
            >
              <Plus />
              Yeni Kaynak
            </Button>
          ) : null
        }
      />
      <CardSourceDialog open={open} onOpenChange={setOpen} editing={editing} onSaved={invalidate} />
    </>
  )
}

function CardSourceDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: CardSourceDto | null
  onSaved: () => void
}) {
  const [name, setName] = React.useState('')
  const [code, setCode] = React.useState('')
  const [kind, setKind] = React.useState('generic')
  const [timezone, setTimezone] = React.useState('Europe/Istanbul')
  const [description, setDescription] = React.useState('')
  const [directionMapping, setDirectionMapping] = React.useState('{}')
  const [apiKey, setApiKey] = React.useState('')
  const [isActive, setIsActive] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    setName(editing?.name ?? '')
    setCode(editing?.code ?? '')
    setKind(editing?.kind ?? 'generic')
    setTimezone(editing?.timezone ?? 'Europe/Istanbul')
    setDescription(editing?.description ?? '')
    setDirectionMapping(JSON.stringify(editing?.directionMapping ?? {}, null, 2))
    setApiKey('')
    setIsActive(editing?.isActive ?? true)
    setError(null)
  }, [open, editing])

  const save = useMutation({
    mutationFn: () => {
      let mapping: Record<string, 'in' | 'out' | 'unknown'> = {}
      const raw = directionMapping.trim()
      if (raw) {
        try {
          mapping = JSON.parse(raw)
        } catch {
          throw new Error('Yön eşlemesi geçerli JSON değil.')
        }
      }
      const payload = {
        name: name.trim(),
        code: code.trim() || undefined,
        kind: kind.trim() || 'generic',
        timezone: timezone.trim() || 'Europe/Istanbul',
        description: description.trim() ? description.trim() : null,
        directionMapping: mapping,
        isActive,
        ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
      }
      return editing
        ? api.hr.cardSources.update(editing.id, payload)
        : api.hr.cardSources.create(payload)
    },
    onSuccess: () => {
      toast.success(editing ? 'Kaynak güncellendi' : 'Kaynak oluşturuldu')
      onOpenChange(false)
      onSaved()
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : toApiError(e).message
      setError(msg)
      toast.error('İşlem başarısız', { description: msg })
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Kart kaynağını düzenle' : 'Yeni kart kaynağı'}</DialogTitle>
          <DialogDescription>Terminal/sistem ayarları ve API anahtarı.</DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[60vh] gap-4 overflow-y-auto px-1 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Ad</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>Kod</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label>Tür (kind)</Label>
              <Input
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                placeholder="generic / zkteco_adms"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Saat dilimi</Label>
              <Input value={timezone} onChange={(e) => setTimezone(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Açıklama</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>

          <div className="space-y-1.5">
            <Label>Yön eşlemesi (JSON)</Label>
            <Textarea
              value={directionMapping}
              onChange={(e) => setDirectionMapping(e.target.value)}
              rows={3}
              className="font-mono text-xs"
              placeholder={'{ "0": "in", "1": "out" }'}
            />
          </div>

          <div className="space-y-1.5">
            <Label>API Anahtarı</Label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={editing?.hasApiKey ? '•••• (kayıtlı)' : undefined}
              autoComplete="new-password"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            Aktif
          </label>

          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !name.trim()}>
            {editing ? 'Kaydet' : 'Oluştur'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Tab: Personel Kartları ────────────────────────────────────────────────────

function EmployeeCardsTab() {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canWrite = hasPermission(HrPermissions.cardsWrite)

  const cardsQuery = useQuery({
    queryKey: ['hr', 'employee-cards'],
    queryFn: () => api.hr.cardSources.listCards(),
  })
  const employeesQuery = useQuery({
    queryKey: ['hr', 'employees'],
    queryFn: () => api.hr.employees.list(),
  })

  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<EmployeeCardDto | null>(null)

  const invalidate = () => qc.invalidateQueries({ queryKey: ['hr', 'employee-cards'] })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.hr.cardSources.removeCard(id),
    onSuccess: () => {
      toast.success('Kart silindi')
      void invalidate()
    },
    onError: (e) => toast.error('Silme başarısız', { description: toApiError(e).message }),
  })

  const cards = cardsQuery.data ?? []

  const columns: ColumnDef<EmployeeCardDto>[] = [
    {
      id: 'employeeName',
      accessorKey: 'employeeName',
      header: 'Personel',
      size: 200,
      cell: ({ row }) => <span className="font-medium">{row.original.employeeName}</span>,
    },
    {
      id: 'cardNo',
      accessorKey: 'cardNo',
      header: 'Kart No',
      size: 150,
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.cardNo}</span>,
    },
    {
      id: 'externalPersonnelId',
      accessorKey: 'externalPersonnelId',
      header: 'Personel ID',
      size: 140,
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.externalPersonnelId ?? '—'}
        </span>
      ),
    },
    {
      id: 'validity',
      header: 'Geçerlilik',
      size: 200,
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original.validFrom?.slice(0, 10) ?? '…'} → {row.original.validTo?.slice(0, 10) ?? '…'}
        </span>
      ),
    },
    {
      id: 'isActive',
      accessorKey: 'isActive',
      header: 'Durum',
      size: 100,
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? 'success' : 'outline'}>
          {row.original.isActive ? 'Aktif' : 'Pasif'}
        </Badge>
      ),
    },
    ...(canWrite
      ? [
          {
            id: 'actions',
            header: '',
            size: 90,
            enableSorting: false,
            enableHiding: false,
            enableColumnFilter: false,
            enableGrouping: false,
            cell: ({ row }) => (
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditing(row.original)
                    setOpen(true)
                  }}
                  aria-label="Düzenle"
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm('Kart silinsin mi?')) deleteMutation.mutate(row.original.id)
                  }}
                  aria-label="Sil"
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            ),
          } as ColumnDef<EmployeeCardDto>,
        ]
      : []),
  ]

  return (
    <>
      <DataGrid
        gridId="hr.employee-cards"
        data={cards}
        columns={columns}
        getRowId={(c) => c.id}
        loading={cardsQuery.isLoading}
        onRowClick={
          canWrite
            ? (c) => {
                setEditing(c)
                setOpen(true)
              }
            : undefined
        }
        emptyText="Personel kartı yok."
        toolbar={
          canWrite ? (
            <Button
              onClick={() => {
                setEditing(null)
                setOpen(true)
              }}
            >
              <Plus />
              Yeni Kart
            </Button>
          ) : null
        }
      />
      <EmployeeCardDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        employees={employeesQuery.data ?? []}
        onSaved={invalidate}
      />
    </>
  )
}

function EmployeeCardDialog({
  open,
  onOpenChange,
  editing,
  employees,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: EmployeeCardDto | null
  employees: EmployeeDto[]
  onSaved: () => void
}) {
  const [employeeId, setEmployeeId] = React.useState('')
  const [cardNo, setCardNo] = React.useState('')
  const [externalPersonnelId, setExternalPersonnelId] = React.useState('')
  const [validFrom, setValidFrom] = React.useState('')
  const [validTo, setValidTo] = React.useState('')
  const [isActive, setIsActive] = React.useState(true)

  React.useEffect(() => {
    if (!open) return
    setEmployeeId(editing?.employeeId ?? '')
    setCardNo(editing?.cardNo ?? '')
    setExternalPersonnelId(editing?.externalPersonnelId ?? '')
    setValidFrom(editing?.validFrom?.slice(0, 10) ?? '')
    setValidTo(editing?.validTo?.slice(0, 10) ?? '')
    setIsActive(editing?.isActive ?? true)
  }, [open, editing])

  const save = useMutation({
    mutationFn: () => {
      const base = {
        cardNo: cardNo.trim(),
        externalPersonnelId: externalPersonnelId.trim() ? externalPersonnelId.trim() : null,
        validFrom: validFrom.trim() ? validFrom : null,
        validTo: validTo.trim() ? validTo : null,
        isActive,
      }
      return editing
        ? api.hr.cardSources.updateCard(editing.id, base)
        : api.hr.cardSources.createCard({ employeeId, ...base })
    },
    onSuccess: () => {
      toast.success(editing ? 'Kart güncellendi' : 'Kart oluşturuldu')
      onOpenChange(false)
      onSaved()
    },
    onError: (e) => toast.error('İşlem başarısız', { description: toApiError(e).message }),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'Kartı düzenle' : 'Yeni personel kartı'}</DialogTitle>
          <DialogDescription>Bir kart numarasını personele eşleyin.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label>Personel</Label>
            <Select value={employeeId} onValueChange={setEmployeeId} disabled={!!editing}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Personel seçin" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Kart No</Label>
              <Input value={cardNo} onChange={(e) => setCardNo(e.target.value)} className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label>Personel ID</Label>
              <Input
                value={externalPersonnelId}
                onChange={(e) => setExternalPersonnelId(e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Geçerli (baş.)</Label>
              <Input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Geçerli (bitiş)</Label>
              <Input type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            Aktif
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending || !cardNo.trim() || (!editing && !employeeId)}
          >
            {editing ? 'Kaydet' : 'Oluştur'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Tab: İçe Aktar ────────────────────────────────────────────────────────────

function parseCsv(text: string): AccessEvent[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length === 0) return []
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase())
  const idx = (name: string) => header.indexOf(name)
  const out: AccessEvent[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',').map((c) => c.trim())
    const at = (name: string) => {
      const k = idx(name)
      return k >= 0 ? cells[k] : ''
    }
    const deviceId = at('device_id')
    const eventTime = at('event_time')
    if (!deviceId || !eventTime) continue
    const dir = at('direction')
    const type = at('event_type')
    const ev: AccessEvent = { deviceId, eventTime }
    if (at('external_id')) ev.externalId = at('external_id')
    if (at('card_no')) ev.cardNo = at('card_no')
    if (at('personnel_id')) ev.personnelId = at('personnel_id')
    if (at('gate_id')) ev.gateId = at('gate_id')
    if (dir === 'in' || dir === 'out' || dir === 'unknown') ev.direction = dir
    if (type === 'attendance' || type === 'access_granted' || type === 'access_denied' || type === 'door')
      ev.eventType = type
    if (at('verify_mode')) ev.verifyMode = at('verify_mode')
    out.push(ev)
  }
  return out
}

function ImportTab() {
  const { hasPermission } = useAuth()
  const canImport = hasPermission(HrPermissions.cardsImport)

  const sourcesQuery = useQuery({
    queryKey: ['hr', 'card-sources'],
    queryFn: () => api.hr.cardSources.list(),
  })

  const [source, setSource] = React.useState('')
  const [jsonText, setJsonText] = React.useState('')
  const [result, setResult] = React.useState<AttendanceImportResultDto | null>(null)

  const sources = sourcesQuery.data ?? []

  const importMutation = useMutation({
    mutationFn: (events: AccessEvent[]) => api.hr.attendance.import({ source, events }),
    onSuccess: (res) => {
      setResult(res)
      toast.success('İçe aktarma tamamlandı', {
        description: `${res.inserted} eklendi · ${res.duplicates} tekrar · ${res.unmatched} eşleşmeyen`,
      })
    },
    onError: (e) => toast.error('İçe aktarma başarısız', { description: toApiError(e).message }),
  })

  const runJson = () => {
    let events: AccessEvent[]
    try {
      const parsed = JSON.parse(jsonText)
      events = Array.isArray(parsed) ? parsed : parsed.events
      if (!Array.isArray(events)) throw new Error('events dizisi bulunamadı')
    } catch (e) {
      toast.error('JSON ayrıştırılamadı', {
        description: e instanceof Error ? e.message : String(e),
      })
      return
    }
    importMutation.mutate(events)
  }

  const onFile = async (file: File) => {
    const text = await file.text()
    let events: AccessEvent[] = []
    if (file.name.toLowerCase().endsWith('.json')) {
      try {
        const parsed = JSON.parse(text)
        events = Array.isArray(parsed) ? parsed : parsed.events
      } catch {
        toast.error('JSON dosyası ayrıştırılamadı')
        return
      }
    } else {
      events = parseCsv(text)
    }
    if (!Array.isArray(events) || events.length === 0) {
      toast.error('Dosyada geçerli olay bulunamadı')
      return
    }
    importMutation.mutate(events)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Toplu içe aktarma</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5 sm:max-w-xs">
          <Label>Kaynak</Label>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Kart kaynağı seçin" />
            </SelectTrigger>
            <SelectContent>
              {sources.map((s) => (
                <SelectItem key={s.id} value={s.code}>
                  {s.name} ({s.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>JSON (AccessEvent[] veya {'{ events: [...] }'})</Label>
          <Textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            rows={8}
            className="font-mono text-xs"
            placeholder={'{ "events": [ { "deviceId": "T1", "cardNo": "0012345", "direction": "in", "eventTime": "2026-06-30T08:03:12+03:00" } ] }'}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={runJson} disabled={!canImport || !source || !jsonText.trim() || importMutation.isPending}>
            <Save />
            JSON içe aktar
          </Button>
          <label className="inline-flex">
            <input
              type="file"
              accept=".csv,.json"
              className="hidden"
              disabled={!canImport || !source}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void onFile(f)
                e.target.value = ''
              }}
            />
            <span
              className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input px-4 text-sm font-medium ${
                !canImport || !source ? 'pointer-events-none opacity-50' : 'hover:bg-accent'
              }`}
            >
              <FileUp className="size-4" />
              CSV/JSON yükle
            </span>
          </label>
        </div>

        {!canImport ? (
          <p className="text-xs text-muted-foreground">İçe aktarma için yetkiniz yok.</p>
        ) : null}

        {result ? (
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3 sm:grid-cols-5">
            <Stat label="Alınan" value={result.received} />
            <Stat label="Eklenen" value={result.inserted} />
            <Stat label="Tekrar" value={result.duplicates} />
            <Stat label="Eşleşmeyen" value={result.unmatched} />
            <Stat label="Reddedilen" value={result.rejected} />
            {result.errors.length > 0 ? (
              <div className="col-span-full space-y-1 pt-2 text-xs text-destructive">
                {result.errors.slice(0, 10).map((er, i) => (
                  <div key={i}>
                    #{er.index} {er.externalId ? `(${er.externalId})` : ''}: {er.reason}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-0.5">
      <div className="text-2xs uppercase text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  )
}

// ── Tab: Veri Standardı ───────────────────────────────────────────────────────

function StandardTab() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Kartlı Geçiş Veri Standardı</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border bg-muted/40 p-4 text-xs text-muted-foreground">
          <p className="mb-2">
            Kartlı Geçiş Veri Standardı (vendor-bağımsız). Toplu içe aktarma gövdesi:
          </p>
          <pre className="mb-3 overflow-x-auto rounded bg-background p-3 font-mono">
{`{ "source":"<kaynak kodu>", "deviceId":"<terminal>", "events":[ AccessEvent... ] }`}
          </pre>
          <p className="mb-2">
            <strong>AccessEvent alanları:</strong> externalId? (idempotency anahtarı; yoksa
            deviceId|cardNo|eventTime|direction'dan türetilir), cardNo? (kart no, string — baştaki
            sıfırlar korunur), personnelId?, employeeRef? {'{byCardNo|byExternalPersonnelId|byTcKimlik}'},
            deviceId (zorunlu), terminalId?, gateId?, readerId?, direction (in|out|unknown), eventTime
            (ISO 8601, offsetli: 2026-06-30T08:03:12+03:00, zorunlu), eventType
            (attendance|access_granted|access_denied|door), verifyMode?, raw?.
          </p>
          <p className="mb-2">
            <strong>Eşleme sırası:</strong> employeeRef → employee.cardNo → personel kartı (cardNo) →
            externalPersonnelId. Eşleşmeyen kayıtlar "flagged" olarak girer.
          </p>
          <p className="mb-2">
            <strong>CSV başlığı:</strong>
          </p>
          <pre className="mb-3 overflow-x-auto rounded bg-background p-3 font-mono">
{`external_id,card_no,personnel_id,device_id,gate_id,direction,event_time,event_type,verify_mode`}
          </pre>
          <p>İleride: bu standarda uygun HTTP ingest sunucusu eklenebilir.</p>
        </div>
      </CardContent>
    </Card>
  )
}
