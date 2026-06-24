import * as React from 'react'
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  Bug,
  ChevronDown,
  Copy,
  Globe,
  Server,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  type ErrorLogDto,
  type ErrorLogQuery,
  type ErrorLogStatus,
  IamPermissions,
  toApiError,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { formatDateTime, formatRelative } from '@/lib/datetime'
import { cn } from '@/lib/utils'
import {
  PageFooter,
  PageFooterStat,
  PageHeader,
  PageWrapper,
} from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DateRangePicker,
  type DateRange,
} from '@/components/ui/date-range-picker'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FilterBar, FilterField } from '@/components/ui/filter-bar'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'

const PAGE_SIZE = 20
const ALL = 'all'

const STATUS_META: Record<
  ErrorLogStatus,
  {
    label: string
    variant: 'destructive' | 'warning' | 'success' | 'outline'
    dot: string
  }
> = {
  new: { label: 'Yeni', variant: 'destructive', dot: 'bg-destructive' },
  investigating: { label: 'İnceleniyor', variant: 'warning', dot: 'bg-warning' },
  resolved: { label: 'Çözüldü', variant: 'success', dot: 'bg-success' },
  ignored: { label: 'Yok sayıldı', variant: 'outline', dot: 'bg-muted-foreground/40' },
}

const STATUS_ORDER: ErrorLogStatus[] = [
  'new',
  'investigating',
  'resolved',
  'ignored',
]

interface Filters {
  search: string
  status: ErrorLogStatus | typeof ALL
  origin: 'server' | 'client' | typeof ALL
  module: string
  range: DateRange | undefined
}

const EMPTY: Filters = {
  search: '',
  status: ALL,
  origin: ALL,
  module: '',
  range: undefined,
}

function buildQuery(f: Filters, page: number): ErrorLogQuery {
  return {
    page,
    pageSize: PAGE_SIZE,
    ...(f.search ? { search: f.search } : {}),
    ...(f.status !== ALL ? { status: f.status } : {}),
    ...(f.origin !== ALL ? { origin: f.origin } : {}),
    ...(f.module ? { module: f.module } : {}),
    ...(f.range?.from
      ? { from: `${format(f.range.from, 'yyyy-MM-dd')}T00:00:00` }
      : {}),
    ...(f.range?.to
      ? { to: `${format(f.range.to, 'yyyy-MM-dd')}T23:59:59` }
      : {}),
  }
}

function OriginIcon({ origin }: { origin: 'server' | 'client' }) {
  const Icon = origin === 'server' ? Server : Globe
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Icon className="size-3.5" />
      {origin === 'server' ? 'Sunucu' : 'İstemci'}
    </span>
  )
}

export function ErrorLogsPage() {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(IamPermissions.errorsRead)
  const canWrite = hasPermission(IamPermissions.errorsWrite)
  const canDelete = hasPermission(IamPermissions.errorsDelete)

  const [filters, setFilters] = React.useState<Filters>(EMPTY)
  const [page, setPage] = React.useState(1)
  const [selected, setSelected] = React.useState<ErrorLogDto | null>(null)

  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((f) => ({ ...f, [key]: value }))
    setPage(1)
  }

  const query = buildQuery(filters, page)
  const listQuery = useQuery({
    queryKey: ['iam', 'error-logs', query],
    queryFn: () => api.iam.errorLogs.list(query),
    enabled: canRead,
    placeholderData: keepPreviousData,
  })

  const total = listQuery.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const rows = listQuery.data?.items ?? []
  const activeCount = [
    filters.search,
    filters.status !== ALL,
    filters.origin !== ALL,
    filters.range?.from,
  ].filter(Boolean).length

  const clearFilters = () => {
    setFilters(EMPTY)
    setPage(1)
  }

  return (
    <PermissionRequired permission={IamPermissions.errorsRead}>
      <PageWrapper>
        <PageHeader
          title="Hata Kayıtları"
          description="Sunucu ve istemci hatalarının kaydı (tekrarlar tek satırda toplanır)."
          search={{
            value: filters.search,
            onChange: (v) => setFilter('search', v),
            fields: ['Mesaj', 'Hata türü', 'Yol', 'Kullanıcı'],
          }}
          actions={<ErrorThrowMenu />}
        />

        {/* Filters */}
        <FilterBar activeCount={activeCount} onClear={clearFilters}>
          <FilterField label="Durum">
            <Select
              value={filters.status}
              onValueChange={(v) => setFilter('status', v as Filters['status'])}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tümü</SelectItem>
                {STATUS_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_META[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Kaynak">
            <Select
              value={filters.origin}
              onValueChange={(v) => setFilter('origin', v as Filters['origin'])}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tümü</SelectItem>
                <SelectItem value="server">Sunucu</SelectItem>
                <SelectItem value="client">İstemci</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Tarih aralığı" className="sm:col-span-2">
            <DateRangePicker
              value={filters.range}
              onChange={(r) => setFilter('range', r)}
              max={new Date()}
            />
          </FilterField>
        </FilterBar>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[34%]">Hata</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Kaynak</TableHead>
                <TableHead>Modül</TableHead>
                <TableHead className="text-right">Tekrar</TableHead>
                <TableHead className="text-right">Son görülme</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((e) => {
                const meta = STATUS_META[e.status]
                return (
                  <TableRow
                    key={e.id}
                    className={cn(
                      'group cursor-pointer',
                      selected?.id === e.id && 'bg-muted/50',
                    )}
                    onClick={() => setSelected(e)}
                  >
                    <TableCell className="max-w-0">
                      <div className="flex items-start gap-2.5">
                        <span
                          className={cn(
                            'mt-1.5 size-2 shrink-0 rounded-full',
                            meta.dot,
                          )}
                        />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">
                            {e.message}
                          </div>
                          <div className="truncate font-mono text-xs text-muted-foreground">
                            {e.exceptionType}
                            {e.path ? ` · ${e.path}` : ''}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <OriginIcon origin={e.origin} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {e.module ?? '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="inline-flex min-w-7 justify-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums">
                        {e.occurrenceCount}
                      </span>
                    </TableCell>
                    <TableCell
                      className="text-right text-muted-foreground"
                      title={formatDateTime(e.lastSeenAt)}
                    >
                      {formatRelative(e.lastSeenAt)}
                    </TableCell>
                  </TableRow>
                )
              })}
              {!listQuery.isLoading && rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={6}
                    className="py-12 text-center text-muted-foreground"
                  >
                    Bu filtrelerle hata kaydı yok.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {total > 0 ? (
          <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {total} kayıt · sayfa {page}/{totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Önceki
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Sonraki
              </Button>
            </div>
          </div>
        ) : null}

        <ErrorDetailSheet
          error={selected}
          canWrite={canWrite}
          canDelete={canDelete}
          onClose={() => setSelected(null)}
          onSaved={(updated) => {
            setSelected(updated)
            void qc.invalidateQueries({ queryKey: ['iam', 'error-logs'] })
          }}
          onDeleted={() => {
            setSelected(null)
            void qc.invalidateQueries({ queryKey: ['iam', 'error-logs'] })
          }}
        />

        <PageFooter>
          <PageFooterStat label="Kayıt" value={total.toLocaleString('tr-TR')} />
          <PageFooterStat label="Sayfa" value={`${page}/${totalPages}`} />
          <PageFooterStat label="Filtre" value={activeCount} />
          {listQuery.isFetching ? (
            <PageFooterStat label="Durum" value="yükleniyor…" />
          ) : null}
        </PageFooter>
      </PageWrapper>
    </PermissionRequired>
  )
}

/* -------------------------------------------------------------------------- */
/* Error generator (dev/test) — page dropdown, top-right                        */
/* -------------------------------------------------------------------------- */

// Throws genuine errors (not fabricated) to exercise both capture paths: client
// errors flow through the global window handlers → POST /error-logs/client;
// server errors flow through the exception filter → ErrorLog.
function ErrorThrowMenu() {
  const qc = useQueryClient()
  const refresh = () =>
    setTimeout(
      () => void qc.invalidateQueries({ queryKey: ['iam', 'error-logs'] }),
      1200,
    )

  const clientRuntime = () => {
    toast.info('İstemci hatası fırlatıldı')
    refresh()
    // Real TypeError, thrown async so it reaches window.onerror.
    setTimeout(() => {
      const el = undefined as unknown as { focus(): void }
      el.focus()
    }, 0)
  }

  const clientReject = () => {
    toast.info('İşlenmeyen promise reddi fırlatıldı')
    refresh()
    void Promise.resolve().then(() => {
      const list = null as unknown as number[]
      return list.length
    })
  }

  const serverError = (path: string, label: string) => {
    toast.info(label)
    void api.http.get(path).catch(() => {})
    refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Bug />
          Hata fırlat
          <ChevronDown className="opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>İstemci</DropdownMenuLabel>
        <DropdownMenuItem onClick={clientRuntime}>Tip hatası</DropdownMenuItem>
        <DropdownMenuItem onClick={clientReject}>Promise reddi</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Sunucu</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() =>
            serverError(
              '/debug/error/runtime',
              'Sunucu çalışma-zamanı hatası tetiklendi',
            )
          }
        >
          Çalışma zamanı
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            serverError('/debug/error/db', 'Sunucu veritabanı hatası tetiklendi')
          }
        >
          Veritabanı
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() =>
            serverError('/debug/error/http', 'Sunucu HTTP 500 tetiklendi')
          }
        >
          HTTP 500
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/* -------------------------------------------------------------------------- */
/* Detail sheet                                                                */
/* -------------------------------------------------------------------------- */

function ErrorDetailSheet({
  error,
  canWrite,
  canDelete,
  onClose,
  onSaved,
  onDeleted,
}: {
  error: ErrorLogDto | null
  canWrite: boolean
  canDelete: boolean
  onClose: () => void
  onSaved: (updated: ErrorLogDto) => void
  onDeleted: () => void
}) {
  const [aiOpen, setAiOpen] = React.useState(false)
  const deleteMutation = useMutation({
    mutationFn: () => api.iam.errorLogs.remove(error!.id),
    onSuccess: () => {
      toast.success('Hata kaydı silindi')
      onDeleted()
    },
    onError: (e) =>
      toast.error('Silinemedi', { description: toApiError(e).message }),
  })
  return (
    <Sheet open={Boolean(error)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        {error ? (
          <>
            <SheetHeader className="border-b">
              <div className="flex items-start justify-between gap-3 pr-7">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={STATUS_META[error.status].variant}>
                      {STATUS_META[error.status].label}
                    </Badge>
                    <OriginIcon origin={error.origin} />
                    {error.statusCode ? (
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                        HTTP {error.statusCode}
                      </span>
                    ) : null}
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium tabular-nums">
                      ×{error.occurrenceCount}
                    </span>
                  </div>
                  <SheetTitle className="font-mono text-sm break-words">
                    {error.exceptionType}
                  </SheetTitle>
                  <p className="text-sm break-words text-muted-foreground">
                    {error.message}
                  </p>
                </div>
                {/* AI prompt generator — top-right of the detail. */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAiOpen(true)}
                  className="shrink-0 gap-1.5"
                >
                  <Sparkles className="size-4 text-primary" />
                  <span className="hidden sm:inline">AI istemi</span>
                </Button>
              </div>
            </SheetHeader>

            {/* Body — own scroll container (overflow-x-hidden prevents the
                horizontal drift seen with the default ScrollArea viewport). */}
            <div className="min-h-0 flex-1 space-y-5 overflow-x-hidden overflow-y-auto p-5">
              <TriageForm
                key={error.id}
                error={error}
                canWrite={canWrite}
                onSaved={onSaved}
              />

              <MetaGrid error={error} />

              {error.stackTrace ? (
                <Section title="Yığın izi">
                  <pre className="max-h-72 min-w-0 overflow-auto rounded-lg border bg-muted/40 p-3 font-mono text-xs leading-relaxed whitespace-pre">
                    {error.stackTrace}
                  </pre>
                </Section>
              ) : null}

              {error.headers && Object.keys(error.headers).length > 0 ? (
                <Section title="İstek başlıkları">
                  <dl className="overflow-hidden rounded-lg border text-xs">
                    {Object.entries(error.headers).map(([k, v], i) => (
                      <div
                        key={k}
                        className={cn(
                          'grid grid-cols-[8rem_1fr] gap-3 px-3 py-1.5',
                          i > 0 && 'border-t',
                        )}
                      >
                        <dt className="truncate font-mono text-muted-foreground">
                          {k}
                        </dt>
                        <dd className="min-w-0 break-all">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </Section>
              ) : null}

              {canDelete ? (
                <Section title="Tehlikeli bölge">
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/40 p-3">
                    <p className="text-xs text-muted-foreground">
                      Bu hata kaydını kalıcı olarak sil.
                    </p>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={deleteMutation.isPending}
                      onClick={() => {
                        if (confirm('Bu hata kaydı silinsin mi?'))
                          deleteMutation.mutate()
                      }}
                    >
                      <Trash2 />
                      Sil
                    </Button>
                  </div>
                </Section>
              ) : null}
            </div>

            <AiPromptDialog error={error} open={aiOpen} onOpenChange={setAiOpen} />
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

/* -------------------------------------------------------------------------- */
/* AI prompt generator                                                         */
/* -------------------------------------------------------------------------- */

// Builds a thorough, ready-to-paste Turkish prompt that asks an AI to diagnose
// and fix this error, including all captured context.
function buildErrorPrompt(error: ErrorLogDto): string {
  const lines: string[] = []
  lines.push(
    'Bir TurboHesap (NestJS + TypeORM backend, React + TanStack Router/Query frontend, PostgreSQL) hatasını çözmem gerekiyor.',
    'Aşağıdaki hatayı analiz et: olası kök nedenleri açıkla, adım adım bir çözüm öner ve gerekiyorsa düzeltme için örnek kod ver.',
    '',
    '## Hata',
    `- Tip: ${error.exceptionType}`,
    `- Mesaj: ${error.message}`,
    `- Kaynak: ${error.origin === 'server' ? 'Sunucu (backend)' : 'İstemci (tarayıcı)'}`,
    `- Modül: ${error.module ?? '—'}`,
    `- HTTP durum kodu: ${error.statusCode || '—'}`,
    `- Tekrar sayısı: ${error.occurrenceCount}`,
    `- İlk görülme: ${formatDateTime(error.firstSeenAt)}`,
    `- Son görülme: ${formatDateTime(error.lastSeenAt)}`,
  )
  if (error.httpMethod || error.path) {
    lines.push(
      '',
      '## İstek',
      `- ${error.httpMethod ?? ''} ${error.path ?? ''}${error.queryString ? `?${error.queryString}` : ''}`.trim(),
    )
  }
  if (error.fileName) {
    lines.push(
      `- Konum: ${error.fileName}${error.lineNumber ? `:${error.lineNumber}` : ''}`,
    )
  }
  if (error.developerNotes) {
    lines.push('', '## Geliştirici notları', error.developerNotes)
  }
  if (error.stackTrace) {
    lines.push('', '## Yığın izi', '```', error.stackTrace, '```')
  }
  lines.push(
    '',
    '## İstenenler',
    '1. En olası kök neden(ler).',
    '2. Adım adım çözüm.',
    '3. Hangi dosyalarda ne değişmeli (örnek kodla).',
    '4. Tekrarını önlemek için öneriler.',
  )
  return lines.join('\n')
}

function AiPromptDialog({
  error,
  open,
  onOpenChange,
}: {
  error: ErrorLogDto
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            Yapay zeka istemi
          </DialogTitle>
          <DialogDescription>
            Bu hata için hazırlanan istem. Düzenleyip kopyalayabilir, dilediğin
            yapay zekaya yapıştırabilirsin.
          </DialogDescription>
        </DialogHeader>
        {/* Remounts per error → fresh generated prompt via the state initializer. */}
        {open ? (
          <AiPromptBody
            key={error.id}
            error={error}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function AiPromptBody({
  error,
  onClose,
}: {
  error: ErrorLogDto
  onClose: () => void
}) {
  const [prompt, setPrompt] = React.useState(() => buildErrorPrompt(error))

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt)
      toast.success('İstem panoya kopyalandı')
    } catch {
      toast.error('Kopyalanamadı')
    }
  }

  return (
    <>
      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={16}
        className="max-h-[55vh] font-mono text-xs leading-relaxed"
      />
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Kapat
        </Button>
        <Button onClick={copy}>
          <Copy />
          Kopyala
        </Button>
      </DialogFooter>
    </>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-2xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h3>
      {children}
    </section>
  )
}

function MetaGrid({ error }: { error: ErrorLogDto }) {
  const items: Array<[string, React.ReactNode]> = [
    ['Modül', error.module ?? '—'],
    ['Yöntem', error.httpMethod ?? '—'],
    ['Kullanıcı', error.userName ?? '—'],
    ['IP', error.ipAddress ?? '—'],
    [
      'Dosya',
      error.fileName
        ? `${error.fileName}${error.lineNumber ? `:${error.lineNumber}` : ''}`
        : '—',
    ],
    ['Kaynak', error.source ?? '—'],
    ['İlk görülme', formatDateTime(error.firstSeenAt)],
    ['Son görülme', formatDateTime(error.lastSeenAt)],
  ]
  return (
    <Section title="Ayrıntılar">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border p-3">
        {items.map(([label, value]) => (
          <div key={label} className="min-w-0 space-y-0.5">
            <dt className="text-2xs tracking-wide text-muted-foreground uppercase">
              {label}
            </dt>
            <dd className="truncate text-sm font-medium" title={String(value)}>
              {value}
            </dd>
          </div>
        ))}
        {error.path ? (
          <div className="col-span-2 min-w-0 space-y-0.5">
            <dt className="text-2xs tracking-wide text-muted-foreground uppercase">
              Yol
            </dt>
            <dd className="truncate font-mono text-xs" title={error.path}>
              {error.path}
              {error.queryString ? `?${error.queryString}` : ''}
            </dd>
          </div>
        ) : null}
      </dl>
    </Section>
  )
}

function TriageForm({
  error,
  canWrite,
  onSaved,
}: {
  error: ErrorLogDto
  canWrite: boolean
  onSaved: (updated: ErrorLogDto) => void
}) {
  const [status, setStatus] = React.useState<ErrorLogStatus>(error.status)
  const [notes, setNotes] = React.useState(error.developerNotes ?? '')

  const saveMutation = useMutation({
    mutationFn: () =>
      api.iam.errorLogs.update(error.id, { status, developerNotes: notes }),
    onSuccess: (updated) => {
      toast.success('Hata kaydı güncellendi')
      onSaved(updated)
    },
    onError: (e) =>
      toast.error('Kaydedilemedi', { description: toApiError(e).message }),
  })

  const dirty =
    status !== error.status || notes !== (error.developerNotes ?? '')

  return (
    <section className="space-y-3 rounded-lg border bg-muted/20 p-3">
      <h3 className="text-sm font-semibold">Durum ve notlar</h3>
      <div className="space-y-1.5">
        <Label>Durum</Label>
        <Select
          value={status}
          onValueChange={(v) => setStatus(v as ErrorLogStatus)}
          disabled={!canWrite}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_META[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="e-notes">Geliştirici notları</Label>
        <Textarea
          id="e-notes"
          rows={4}
          placeholder="İnceleme notları, kök neden, çözüm…"
          value={notes}
          disabled={!canWrite}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      {canWrite ? (
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !dirty}
        >
          Kaydet
        </Button>
      ) : null}
    </section>
  )
}
