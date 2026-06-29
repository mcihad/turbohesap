import { type ReactNode } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  FileText,
  LinkIcon,
  Pencil,
  Printer,
  Receipt,
  Trash2,
  Truck,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  ORDER_DIRECTION_LABELS,
  ORDER_KIND_LABELS,
  ORDER_STATUS_LABELS,
  OrdersPermissions,
  toApiError,
  type OrderKind,
  type OrderStatus,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { useRegisterBreadcrumbLabel } from '@/lib/layout/breadcrumb-store'
import { formatDate } from '@/lib/datetime'
import { PageHeader, PageWrapper } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatMoney } from '../format'

const ROUTE = '/_authed/orders/$id'

const STATUS_TONE: Record<OrderStatus, 'outline' | 'success' | 'info' | 'destructive'> = {
  draft: 'outline',
  confirmed: 'success',
  shipped: 'info',
  invoiced: 'info',
  cancelled: 'destructive',
}

// Each kind's list route — used by the breadcrumb / "back" links.
const KIND_LIST: Record<OrderKind, '/orders/quotes' | '/orders/sales' | '/orders/deliveries'> = {
  quote: '/orders/quotes',
  order: '/orders/sales',
  delivery: '/orders/deliveries',
}

export function OrderDetailPage() {
  const { id } = useParams({ from: ROUTE })
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(OrdersPermissions.read)
  const canWrite = hasPermission(OrdersPermissions.write)
  const canConfirm = hasPermission(OrdersPermissions.confirm)
  const canConvert = hasPermission(OrdersPermissions.convert)
  const canCancel = hasPermission(OrdersPermissions.cancel)

  const query = useQuery({
    queryKey: ['orders', id],
    queryFn: () => api.orders.get(id),
    enabled: canRead && !!id,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['orders'] })

  const confirmMutation = useMutation({
    mutationFn: () => api.orders.confirm(id),
    onSuccess: (doc) => {
      toast.success(doc.kind === 'delivery' ? 'Belge sevk edildi' : 'Belge onaylandı')
      void invalidate()
    },
    onError: (e) => toast.error('İşlem başarısız', { description: toApiError(e).message }),
  })

  // Convert to the next document in the chain (quote→order→delivery).
  const convertMutation = useMutation({
    mutationFn: () => api.orders.convert(id),
    onSuccess: (doc) => {
      toast.success('Belge dönüştürüldü')
      void invalidate()
      if (doc.targetDocId) navigate({ to: '/orders/$id', params: { id: doc.targetDocId } })
    },
    onError: (e) => toast.error('Dönüştürme başarısız', { description: toApiError(e).message }),
  })

  // Convert to an invoice (Fatura).
  const invoiceMutation = useMutation({
    mutationFn: () => api.orders.convert(id, { toKind: 'invoice' }),
    onSuccess: (doc) => {
      toast.success('Fatura oluşturuldu')
      void invalidate()
      void qc.invalidateQueries({ queryKey: ['invoices'] })
      if (doc.invoiceId) navigate({ to: '/invoices/invoices/$id', params: { id: doc.invoiceId } })
    },
    onError: (e) => toast.error('Faturalandırma başarısız', { description: toApiError(e).message }),
  })

  const cancelMutation = useMutation({
    mutationFn: () => api.orders.cancel(id),
    onSuccess: () => {
      toast.success('Belge iptal edildi')
      void invalidate()
    },
    onError: (e) => toast.error('İptal başarısız', { description: toApiError(e).message }),
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.orders.remove(id),
    onSuccess: () => {
      toast.success('Belge silindi')
      void invalidate()
      navigate({ to: '/orders' })
    },
    onError: (e) => toast.error('Silme başarısız', { description: toApiError(e).message }),
  })

  const doc = query.data

  return (
    <PermissionRequired permission={OrdersPermissions.read}>
      <PageWrapper>
        {query.isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : !doc ? (
          <NotFound />
        ) : (
          <>
            <Breadcrumb id={doc.id} label={`${doc.series}${doc.number || ' (taslak)'}`} />
            <PageHeader
              title={`${ORDER_KIND_LABELS[doc.kind]} · ${doc.series}${doc.number || ' (taslak)'}`}
              description={[
                ORDER_DIRECTION_LABELS[doc.direction],
                doc.contact?.name,
                formatDate(doc.date),
              ]
                .filter(Boolean)
                .join(' · ')}
              audit={{ entityType: 'OrderDocument', entityId: doc.id, title: 'Belge denetim kaydı' }}
              actions={
                <div className="flex flex-wrap gap-2">
                  {/* Confirm (draft → confirmed / shipped). */}
                  {canConfirm && doc.status === 'draft' ? (
                    <Button
                      size="sm"
                      disabled={confirmMutation.isPending}
                      onClick={() => {
                        const msg =
                          doc.kind === 'delivery'
                            ? 'Belge sevk edilsin mi? Numara atanacak ve stok düşülecek.'
                            : 'Belge onaylansın mı? Numara atanacak ve düzenlenemez olacak.'
                        if (confirm(msg)) confirmMutation.mutate()
                      }}
                    >
                      <CheckCircle2 />
                      {doc.kind === 'delivery' ? 'Sevk Et' : 'Onayla'}
                    </Button>
                  ) : null}

                  {/* Convert next: confirmed quote → order, confirmed order → delivery. */}
                  {canConvert && doc.status === 'confirmed' && !doc.targetDocId && doc.kind === 'quote' ? (
                    <Button
                      size="sm"
                      disabled={convertMutation.isPending}
                      onClick={() => convertMutation.mutate()}
                    >
                      <FileText />
                      Siparişe Dönüştür
                    </Button>
                  ) : null}
                  {canConvert && doc.status === 'confirmed' && !doc.targetDocId && doc.kind === 'order' ? (
                    <Button
                      size="sm"
                      disabled={convertMutation.isPending}
                      onClick={() => convertMutation.mutate()}
                    >
                      <Truck />
                      İrsaliye Oluştur
                    </Button>
                  ) : null}

                  {/* Faturalandır: confirmed order or shipped delivery, no invoice yet. */}
                  {canConvert &&
                  !doc.invoiceId &&
                  ((doc.kind === 'order' && doc.status === 'confirmed') ||
                    (doc.kind === 'delivery' && doc.status === 'shipped')) ? (
                    <Button
                      size="sm"
                      disabled={invoiceMutation.isPending}
                      onClick={() => {
                        if (confirm('Bu belgeden fatura oluşturulsun mu?')) invoiceMutation.mutate()
                      }}
                    >
                      <Receipt />
                      Faturalandır
                    </Button>
                  ) : null}

                  {/* Edit (draft only). */}
                  {canWrite && doc.status === 'draft' ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate({ to: '/orders/$id/edit', params: { id: doc.id } })}
                      >
                        <Pencil />
                        Düzenle
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={deleteMutation.isPending}
                        onClick={() => {
                          if (confirm('Taslak belge silinsin mi? Bu işlem geri alınamaz.')) deleteMutation.mutate()
                        }}
                      >
                        <Trash2 className="text-destructive" />
                        Sil
                      </Button>
                    </>
                  ) : null}

                  {/* Cancel. */}
                  {canCancel && doc.status !== 'draft' && doc.status !== 'cancelled' && doc.status !== 'invoiced' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm('Belge iptal edilsin mi?')) cancelMutation.mutate()
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
                  <Button variant="outline" size="sm" onClick={() => navigate({ to: KIND_LIST[doc.kind] })}>
                    <ArrowLeft />
                    Liste
                  </Button>
                </div>
              }
            />

            <div className="space-y-4">
              {/* Chain references */}
              {doc.sourceDocId || doc.targetDocId || doc.invoiceId ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Belge zinciri</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {doc.sourceDocId ? (
                      <ChainLink
                        label="Kaynak belge"
                        onClick={() => navigate({ to: '/orders/$id', params: { id: doc.sourceDocId as string } })}
                      />
                    ) : null}
                    {doc.targetDocId ? (
                      <ChainLink
                        label="Sonraki belge"
                        onClick={() => navigate({ to: '/orders/$id', params: { id: doc.targetDocId as string } })}
                      />
                    ) : null}
                    {doc.invoiceId ? (
                      <ChainLink
                        label="Fatura"
                        onClick={() => navigate({ to: '/invoices/invoices/$id', params: { id: doc.invoiceId as string } })}
                      />
                    ) : null}
                  </CardContent>
                </Card>
              ) : null}

              <div className="grid gap-4 lg:grid-cols-3">
                <div className="space-y-4 lg:col-span-2">
                  <Card>
                    <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
                      <CardTitle className="text-sm">Belge bilgileri</CardTitle>
                      <Badge variant={STATUS_TONE[doc.status]}>{ORDER_STATUS_LABELS[doc.status]}</Badge>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3">
                      <Field label="Cari" value={doc.contact?.name ?? '—'} />
                      <Field label="Tarih" value={formatDate(doc.date)} />
                      <Field
                        label={doc.kind === 'quote' ? 'Geçerlilik' : 'Termin / Vade'}
                        value={
                          doc.kind === 'quote'
                            ? doc.validUntil
                              ? formatDate(doc.validUntil)
                              : '—'
                            : doc.dueDate
                              ? formatDate(doc.dueDate)
                              : '—'
                        }
                      />
                      <Field label="Tür" value={ORDER_KIND_LABELS[doc.kind]} />
                      <Field label="Yön" value={ORDER_DIRECTION_LABELS[doc.direction]} />
                      <Field
                        label="Durum"
                        value={<Badge variant={STATUS_TONE[doc.status]}>{ORDER_STATUS_LABELS[doc.status]}</Badge>}
                      />
                      <Field label="Para birimi" value={doc.currencyCode} />
                      {doc.notes ? <Field label="Notlar" value={doc.notes} full /> : null}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Kalemler</CardTitle>
                    </CardHeader>
                    <CardContent className="px-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Açıklama</TableHead>
                            <TableHead className="text-right">Miktar</TableHead>
                            <TableHead>Birim</TableHead>
                            <TableHead className="text-right">Birim Fiyat</TableHead>
                            <TableHead className="text-right">İskonto %</TableHead>
                            <TableHead className="text-right">KDV %</TableHead>
                            <TableHead className="text-right">Tevkifat</TableHead>
                            <TableHead className="text-right">Satır Toplamı</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {doc.lines.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={8} className="py-6 text-center text-muted-foreground">
                                Kalem yok.
                              </TableCell>
                            </TableRow>
                          ) : (
                            doc.lines.map((line) => (
                              <TableRow key={line.id}>
                                <TableCell className="font-medium">{line.description}</TableCell>
                                <TableCell className="text-right tabular-nums">{line.quantity}</TableCell>
                                <TableCell className="text-muted-foreground">{line.unit}</TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {formatMoney(line.unitPrice, doc.currencyCode)}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {line.discountRate ? `%${line.discountRate}` : '—'}
                                </TableCell>
                                <TableCell className="text-right tabular-nums">%{line.vatRate}</TableCell>
                                <TableCell className="text-right tabular-nums">
                                  {line.lineWithholding
                                    ? formatMoney(line.lineWithholding, doc.currencyCode)
                                    : '—'}
                                </TableCell>
                                <TableCell className="text-right font-mono tabular-nums">
                                  {formatMoney(line.lineTotal, doc.currencyCode)}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>

                <Card className="h-fit">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Toplamlar</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <TotalRow label="Ara toplam" value={formatMoney(doc.subtotal, doc.currencyCode)} />
                    {doc.discountTotal ? (
                      <TotalRow label="İskonto" value={`− ${formatMoney(doc.discountTotal, doc.currencyCode)}`} />
                    ) : null}

                    {doc.vatSummary.length > 0 ? (
                      <div className="space-y-1 border-t pt-2">
                        <p className="text-2xs tracking-wide text-muted-foreground uppercase">KDV özeti</p>
                        {doc.vatSummary.map((row) => (
                          <div
                            key={row.rate}
                            className="flex items-center justify-between text-xs text-muted-foreground"
                          >
                            <span>
                              %{row.rate} matrah {formatMoney(row.base, doc.currencyCode)}
                            </span>
                            <span className="tabular-nums">KDV {formatMoney(row.vat, doc.currencyCode)}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {doc.withholdingTotal > 0 ? (
                      <TotalRow label="Tevkifat" value={`− ${formatMoney(doc.withholdingTotal, doc.currencyCode)}`} />
                    ) : null}

                    <div className="flex items-center justify-between border-t pt-2 text-base font-semibold">
                      <span>Genel Toplam</span>
                      <span className="font-mono tabular-nums">{formatMoney(doc.grandTotal, doc.currencyCode)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </PageWrapper>
    </PermissionRequired>
  )
}

function ChainLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick}>
      <LinkIcon />
      {label}
    </Button>
  )
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </div>
  )
}

function Field({ label, value, full }: { label: string; value: ReactNode; full?: boolean }) {
  return (
    <div className={`space-y-0.5 ${full ? 'col-span-2 md:col-span-3' : ''}`}>
      <dt className="text-2xs tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  )
}

function Breadcrumb({ id, label }: { id: string; label: string }) {
  useRegisterBreadcrumbLabel(`/orders/${id}`, label)
  return null
}

function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground">
      <p>Belge bulunamadı.</p>
      <Button variant="outline" onClick={() => navigate({ to: '/orders/quotes' })}>
        <ArrowLeft />
        Listeye dön
      </Button>
    </div>
  )
}
