import * as React from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  ClipboardList,
  Play,
  Printer,
  RotateCcw,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  COUNT_REASON_LABELS,
  COUNT_REASONS,
  STOCK_COUNT_KIND_LABELS,
  STOCK_COUNT_STATUS_LABELS,
  StocktakePermissions,
  toApiError,
  type CountReason,
  type SetCountLineRequest,
  type StockCountLineDto,
  type StockCountStatus,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { useRegisterBreadcrumbLabel } from '@/lib/layout/breadcrumb-store'
import { PageHeader, PageWrapper } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatQty, formatSignedQty } from '../format'

const ROUTE = '/_authed/stocktake/$id'

const STATUS_TONE: Record<
  StockCountStatus,
  'outline' | 'success' | 'info' | 'warning' | 'destructive'
> = {
  draft: 'outline',
  counting: 'info',
  review: 'warning',
  approved: 'success',
  cancelled: 'destructive',
}

export function StocktakeDetailPage() {
  const { id } = useParams({ from: ROUTE })
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(StocktakePermissions.read)
  const canCount = hasPermission(StocktakePermissions.count)
  const canCreate = hasPermission(StocktakePermissions.create)
  const canReview = hasPermission(StocktakePermissions.review)
  const canApprove = hasPermission(StocktakePermissions.approve)
  const canCancel = hasPermission(StocktakePermissions.cancel)

  const [search, setSearch] = React.useState('')

  const query = useQuery({
    queryKey: ['stocktake', id],
    queryFn: () => api.stocktake.get(id),
    enabled: canRead && !!id,
  })
  const linesQuery = useQuery({
    queryKey: ['stocktake', id, 'lines'],
    queryFn: () => api.stocktake.lines(id),
    enabled: canRead && !!id,
  })

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['stocktake'] })
  }

  const setLineMutation = useMutation({
    mutationFn: (vars: { lineId: string; input: SetCountLineRequest }) =>
      api.stocktake.setLine(id, vars.lineId, vars.input),
    onSuccess: () => invalidate(),
    onError: (e) => toast.error('Satır güncellenemedi', { description: toApiError(e).message }),
  })

  const startMutation = useMutation({
    mutationFn: () => api.stocktake.start(id),
    onSuccess: () => {
      toast.success('Sayım başlatıldı')
      invalidate()
    },
    onError: (e) => toast.error('Başlatılamadı', { description: toApiError(e).message }),
  })

  const reviewMutation = useMutation({
    mutationFn: () => api.stocktake.review(id),
    onSuccess: () => {
      toast.success('İncelemeye alındı')
      invalidate()
    },
    onError: (e) => toast.error('İşlem başarısız', { description: toApiError(e).message }),
  })

  const recountMutation = useMutation({
    mutationFn: (lineId: string) => api.stocktake.requestRecount(id, lineId),
    onSuccess: () => {
      toast.success('Satır tekrar sayıma gönderildi')
      invalidate()
    },
    onError: (e) => toast.error('İşlem başarısız', { description: toApiError(e).message }),
  })

  const approveMutation = useMutation({
    mutationFn: () => api.stocktake.approve(id),
    onSuccess: () => {
      toast.success('Sayım onaylandı ve işlendi')
      invalidate()
    },
    onError: (e) =>
      toast.error('Onaylanamadı', { description: toApiError(e).message }),
  })

  const cancelMutation = useMutation({
    mutationFn: () => api.stocktake.cancel(id),
    onSuccess: () => {
      toast.success('Sayım iptal edildi')
      invalidate()
    },
    onError: (e) => toast.error('İptal başarısız', { description: toApiError(e).message }),
  })

  const count = query.data
  const lines = linesQuery.data ?? []

  // Blind: expected/variance columns are hidden while counting (draft/counting).
  const hideExpected = !!count && count.blind && (count.status === 'draft' || count.status === 'counting')
  const isCounting = count?.status === 'counting'
  const isReviewOrDone = count?.status === 'review' || count?.status === 'approved'

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return lines
    return lines.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q) ||
        l.barcode.toLowerCase().includes(q),
    )
  }, [lines, search])

  const varianceLines = React.useMemo(() => lines.filter((l) => l.difference !== 0), [lines])

  return (
    <PermissionRequired permission={StocktakePermissions.read}>
      <PageWrapper>
        {query.isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : !count ? (
          <NotFound />
        ) : (
          <>
            <Breadcrumb id={count.id} label={count.name || 'Sayım'} />
            <PageHeader
              title={count.name || 'Adsız Sayım'}
              description={[
                STOCK_COUNT_KIND_LABELS[count.kind],
                count.branchName,
                count.blind ? 'Kör sayım' : null,
              ]
                .filter(Boolean)
                .join(' · ')}
              actions={
                <div className="flex flex-wrap gap-2">
                  {canCreate && count.status === 'draft' ? (
                    <Button
                      size="sm"
                      disabled={startMutation.isPending}
                      onClick={() => startMutation.mutate()}
                    >
                      <Play />
                      Sayımı Başlat
                    </Button>
                  ) : null}

                  {canReview && count.status === 'counting' ? (
                    <Button
                      size="sm"
                      disabled={reviewMutation.isPending}
                      onClick={() => {
                        if (confirm('Sayım incelemeye alınsın mı? Farklar hesaplanacak.'))
                          reviewMutation.mutate()
                      }}
                    >
                      <ClipboardList />
                      İncelemeye Al
                    </Button>
                  ) : null}

                  {canApprove && count.status === 'review' ? (
                    <Button
                      size="sm"
                      disabled={approveMutation.isPending}
                      onClick={() => {
                        if (
                          confirm(
                            'Sayım onaylanıp işlensin mi? Stok hareketleri (Sayım Fazlası/Eksiği) oluşturulacak.',
                          )
                        )
                          approveMutation.mutate()
                      }}
                    >
                      <CheckCircle2 />
                      Onayla ve İşle
                    </Button>
                  ) : null}

                  {canCancel && count.status !== 'cancelled' && count.status !== 'draft' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={cancelMutation.isPending}
                      onClick={() => {
                        if (confirm('Sayım iptal edilsin mi? İşlenmiş hareketler geri alınır.'))
                          cancelMutation.mutate()
                      }}
                    >
                      <Ban className="text-destructive" />
                      İptal
                    </Button>
                  ) : null}

                  <Button variant="outline" size="sm" onClick={() => window.print()}>
                    <Printer />
                    Yazdır
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate({ to: '/stocktake/counts' })}
                  >
                    <ArrowLeft />
                    Liste
                  </Button>
                </div>
              }
            />

            <div className="space-y-4">
            {count.status === 'review' && canApprove ? (
              <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-muted-foreground">
                Not: Onaylayan kişi, sayımı oluşturan kişiden farklı olmalıdır (görevler
                ayrılığı). Aksi halde işlem reddedilir.
              </p>
            ) : null}

            {/* Header info + progress */}
            <Card>
              <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
                <CardTitle className="text-sm">Sayım bilgileri</CardTitle>
                <Badge variant={STATUS_TONE[count.status]}>
                  {STOCK_COUNT_STATUS_LABELS[count.status]}
                </Badge>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
                <Field label="Tür" value={STOCK_COUNT_KIND_LABELS[count.kind]} />
                <Field label="Şube" value={count.branchName || '—'} />
                <Field label="Oluşturan" value={count.createdByName || '—'} />
                <Field label="Onaylayan" value={count.approvedByName || '—'} />
                <Field label="Kör sayım" value={count.blind ? 'Evet' : 'Hayır'} />
                <Field label="Fark eşiği" value={`%${count.recountThresholdPct}`} />
                <Field
                  label="İlerleme"
                  value={`${formatQty(count.countedCount)} / ${formatQty(count.lineCount)} sayıldı`}
                />
                <Field
                  label="Fark sayısı"
                  value={
                    count.varianceCount > 0 ? (
                      <Badge variant="warning">{count.varianceCount}</Badge>
                    ) : (
                      '0'
                    )
                  }
                />
              </CardContent>
            </Card>

            {/* Variance report (review/approved) */}
            {isReviewOrDone ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Fark Raporu</CardTitle>
                </CardHeader>
                <CardContent className="px-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ürün</TableHead>
                        <TableHead>Birim</TableHead>
                        <TableHead className="text-right">Beklenen</TableHead>
                        <TableHead className="text-right">Sayılan</TableHead>
                        <TableHead className="text-right">Fark</TableHead>
                        <TableHead>Sebep</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {varianceLines.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                            Fark bulunan satır yok.
                          </TableCell>
                        </TableRow>
                      ) : (
                        varianceLines.map((l) => (
                          <TableRow key={l.id}>
                            <TableCell>
                              <div className="font-medium">{l.name}</div>
                              <div className="font-mono text-2xs text-muted-foreground">
                                {l.code}
                                {l.barcode ? ` · ${l.barcode}` : ''}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{l.unit}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatQty(l.expectedQty)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatQty(l.countedQty)}
                            </TableCell>
                            <TableCell
                              className={`text-right font-mono tabular-nums ${
                                l.difference < 0 ? 'text-destructive' : 'text-emerald-600'
                              }`}
                            >
                              {formatSignedQty(l.difference)}
                            </TableCell>
                            <TableCell>
                              {l.reasonCode ? COUNT_REASON_LABELS[l.reasonCode] : '—'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : null}

            {/* Lines table */}
            <Card>
              <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm">Satırlar</CardTitle>
                <div className="relative w-56">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Ürün, kod, barkod ara…"
                    className="h-9 pl-8"
                  />
                </div>
              </CardHeader>
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ürün</TableHead>
                      <TableHead>Birim</TableHead>
                      {!hideExpected ? (
                        <TableHead className="text-right">Beklenen</TableHead>
                      ) : null}
                      <TableHead className="text-right">Sayılan</TableHead>
                      {!hideExpected ? (
                        <TableHead className="text-right">Fark</TableHead>
                      ) : null}
                      <TableHead>Sebep</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linesQuery.isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                          Yükleniyor…
                        </TableCell>
                      </TableRow>
                    ) : filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                          Satır yok.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((line) => (
                        <LineRow
                          key={line.id}
                          line={line}
                          hideExpected={hideExpected}
                          editable={isCounting && canCount}
                          canReview={canReview && count.status === 'review'}
                          onSetQty={(qty) =>
                            setLineMutation.mutate({ lineId: line.id, input: { countedQty: qty } })
                          }
                          onSetReason={(reason) =>
                            setLineMutation.mutate({
                              lineId: line.id,
                              input: { reasonCode: reason },
                            })
                          }
                          onRecount={() => recountMutation.mutate(line.id)}
                        />
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            </div>
          </>
        )}
      </PageWrapper>
    </PermissionRequired>
  )
}

function LineRow({
  line,
  hideExpected,
  editable,
  canReview,
  onSetQty,
  onSetReason,
  onRecount,
}: {
  line: StockCountLineDto
  hideExpected: boolean
  editable: boolean
  canReview: boolean
  onSetQty: (qty: number) => void
  onSetReason: (reason: CountReason | null) => void
  onRecount: () => void
}) {
  const [draft, setDraft] = React.useState(String(line.countedQty ?? ''))

  // Keep the local draft in sync when the server value changes (e.g. recount).
  React.useEffect(() => {
    setDraft(line.countedQty == null ? '' : String(line.countedQty))
  }, [line.countedQty])

  const commit = () => {
    const n = draft === '' ? 0 : Number(draft)
    if (Number.isNaN(n)) return
    if (n !== line.countedQty) onSetQty(n)
  }

  const hasVariance = line.difference !== 0

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <div>
            <div className="font-medium">{line.name}</div>
            <div className="font-mono text-2xs text-muted-foreground">
              {line.code}
              {line.barcode ? ` · ${line.barcode}` : ''}
            </div>
          </div>
          {line.recountRequested ? <Badge variant="warning">Tekrar say</Badge> : null}
          {line.status === 'counted' ? <Badge variant="info">Sayıldı</Badge> : null}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">{line.unit}</TableCell>
      {!hideExpected ? (
        <TableCell className="text-right tabular-nums">{formatQty(line.expectedQty)}</TableCell>
      ) : null}
      <TableCell className="text-right">
        {editable ? (
          <Input
            type="number"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                ;(e.target as HTMLInputElement).blur()
              }
            }}
            className="h-8 w-24 text-right tabular-nums"
          />
        ) : (
          <span className="tabular-nums">{formatQty(line.countedQty)}</span>
        )}
      </TableCell>
      {!hideExpected ? (
        <TableCell
          className={`text-right font-mono tabular-nums ${
            line.difference < 0
              ? 'text-destructive'
              : line.difference > 0
                ? 'text-emerald-600'
                : 'text-muted-foreground'
          }`}
        >
          {formatSignedQty(line.difference)}
        </TableCell>
      ) : null}
      <TableCell>
        {hasVariance || line.reasonCode ? (
          <Select
            value={line.reasonCode ?? ''}
            onValueChange={(v) => onSetReason(v ? (v as CountReason) : null)}
            disabled={!editable && !canReview}
          >
            <SelectTrigger className="h-8 w-44">
              <SelectValue placeholder="Sebep seç" />
            </SelectTrigger>
            <SelectContent>
              {COUNT_REASONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {COUNT_REASON_LABELS[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        {canReview && hasVariance && !line.recountRequested ? (
          <Button variant="ghost" size="sm" onClick={onRecount}>
            <RotateCcw className="size-4" />
            Tekrar Say
          </Button>
        ) : null}
      </TableCell>
    </TableRow>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-2xs tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  )
}

function Breadcrumb({ id, label }: { id: string; label: string }) {
  useRegisterBreadcrumbLabel(`/stocktake/${id}`, label)
  return null
}

function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground">
      <p>Sayım bulunamadı.</p>
      <Button variant="outline" onClick={() => navigate({ to: '/stocktake/counts' })}>
        <ArrowLeft />
        Listeye dön
      </Button>
    </div>
  )
}
