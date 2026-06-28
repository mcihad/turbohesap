import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Ban, FileCheck, FileCode2, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  FilesPermissions,
  InvoicesPermissions,
  toApiError,
  type InvoicePaymentDto,
  type InvoiceStatus,
  type InvoiceType,
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
import { FileManager } from '@/modules/files/components/file-manager'
import { formatMoney } from '../format'
import { InvoicePaymentDialog } from '../components/invoice-payment-dialog'

// Fetch the UBL-TR XML and trigger a browser download.
async function downloadXml(id: string, fileBase: string) {
  try {
    const xml = await api.invoices.xml(id)
    const blob = new Blob([xml], { type: 'application/xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${fileBase || 'fatura'}.xml`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    toast.error('XML indirilemedi', { description: toApiError(e).message })
  }
}

const ROUTE = '/_authed/invoices/invoices/$id'

const TYPE_LABEL: Record<InvoiceType, string> = {
  sales: 'Satış',
  purchase: 'Alış',
  return: 'İade',
}

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: 'Taslak',
  issued: 'Kesildi',
  paid: 'Ödendi',
  cancelled: 'İptal',
}

const STATUS_TONE: Record<InvoiceStatus, 'outline' | 'success' | 'info' | 'destructive'> = {
  draft: 'outline',
  issued: 'success',
  paid: 'info',
  cancelled: 'destructive',
}

export function InvoiceDetailPage() {
  const { id } = useParams({ from: ROUTE })
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(InvoicesPermissions.read)
  const canWrite = hasPermission(InvoicesPermissions.write)
  const canFiles = hasPermission(FilesPermissions.write)

  const [paymentOpen, setPaymentOpen] = useState(false)

  const query = useQuery({
    queryKey: ['invoices', id],
    queryFn: () => api.invoices.get(id),
    enabled: canRead && !!id,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['invoices'] })

  const issueMutation = useMutation({
    mutationFn: () => api.invoices.issue(id),
    onSuccess: () => {
      toast.success('Fatura kesildi')
      void invalidate()
    },
    onError: (e) => toast.error('Fatura kesilemedi', { description: toApiError(e).message }),
  })

  const cancelMutation = useMutation({
    mutationFn: () => api.invoices.cancel(id),
    onSuccess: () => {
      toast.success('Fatura iptal edildi')
      void invalidate()
    },
    onError: (e) => toast.error('İptal başarısız', { description: toApiError(e).message }),
  })

  const invoice = query.data

  return (
    <PermissionRequired permission={InvoicesPermissions.read}>
      <PageWrapper>
        {query.isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : !invoice ? (
          <NotFound />
        ) : (
          <>
            <Breadcrumb
              id={invoice.id}
              label={`${invoice.series}${invoice.number || ' (taslak)'}`}
            />
            <PageHeader
              title={`${invoice.series}${invoice.number || ' (taslak)'}`}
              description={[
                TYPE_LABEL[invoice.type],
                invoice.contact?.name,
                formatDate(invoice.date),
              ]
                .filter(Boolean)
                .join(' · ')}
              audit={{ entityType: 'Invoice', entityId: invoice.id, title: 'Fatura denetim kaydı' }}
              actions={
                <div className="flex flex-wrap gap-2">
                  {canWrite && invoice.status === 'draft' ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          navigate({ to: '/invoices/invoices/$id/edit', params: { id: invoice.id } })
                        }
                      >
                        <Pencil />
                        Düzenle
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (confirm('Fatura kesilsin mi? Numara atanacak ve düzenlenemez olacak.')) {
                            issueMutation.mutate()
                          }
                        }}
                      >
                        <FileCheck />
                        Faturayı Kes
                      </Button>
                    </>
                  ) : null}
                  {canWrite && invoice.status === 'issued' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm('Fatura iptal edilsin mi?')) cancelMutation.mutate()
                      }}
                    >
                      <Ban className="text-destructive" />
                      İptal
                    </Button>
                  ) : null}
                  {invoice.status === 'issued' ? (
                    <Button variant="outline" size="sm" onClick={() => void downloadXml(invoice.id, `${invoice.series}${invoice.number}`)}>
                      <FileCode2 />
                      XML indir
                    </Button>
                  ) : null}
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/invoices/invoices">
                      <ArrowLeft />
                      Faturalar
                    </Link>
                  </Button>
                </div>
              }
            />

            <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                <Card>
                  <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
                    <CardTitle className="text-sm">Fatura bilgileri</CardTitle>
                    <div className="flex items-center gap-2">
                      <PaymentStatusBadge invoice={invoice} />
                      <Badge variant={STATUS_TONE[invoice.status]}>
                        {STATUS_LABEL[invoice.status]}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3">
                    <Field
                      label="Cari"
                      value={invoice.contact?.name ?? '—'}
                    />
                    <Field label="Tarih" value={formatDate(invoice.date)} />
                    <Field
                      label="Vade"
                      value={invoice.dueDate ? formatDate(invoice.dueDate) : '—'}
                    />
                    <Field label="Tip" value={TYPE_LABEL[invoice.type]} />
                    <Field label="Senaryo" value={invoice.senaryo} />
                    <Field label="Fatura tipi" value={invoice.faturaTipi} />
                    <Field
                      label="Durum"
                      value={
                        <Badge variant={STATUS_TONE[invoice.status]}>
                          {STATUS_LABEL[invoice.status]}
                        </Badge>
                      }
                    />
                    <Field label="Para birimi" value={invoice.currencyCode} />
                    {invoice.notes ? (
                      <Field label="Notlar" value={invoice.notes} full />
                    ) : null}
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
                        {invoice.lines.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="py-6 text-center text-muted-foreground">
                              Kalem yok.
                            </TableCell>
                          </TableRow>
                        ) : (
                          invoice.lines.map((line) => (
                            <TableRow key={line.id}>
                              <TableCell className="font-medium">{line.description}</TableCell>
                              <TableCell className="text-right tabular-nums">{line.quantity}</TableCell>
                              <TableCell className="text-muted-foreground">{line.unit}</TableCell>
                              <TableCell className="text-right tabular-nums">
                                {formatMoney(line.unitPrice, invoice.currencyCode)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {line.discountRate ? `%${line.discountRate}` : '—'}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">%{line.vatRate}</TableCell>
                              <TableCell className="text-right tabular-nums">
                                {line.lineWithholding
                                  ? formatMoney(line.lineWithholding, invoice.currencyCode)
                                  : '—'}
                              </TableCell>
                              <TableCell className="text-right font-mono tabular-nums">
                                {formatMoney(line.lineTotal, invoice.currencyCode)}
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
                  <TotalRow label="Ara toplam" value={formatMoney(invoice.subtotal, invoice.currencyCode)} />
                  {invoice.discountTotal ? (
                    <TotalRow
                      label="İskonto"
                      value={`− ${formatMoney(invoice.discountTotal, invoice.currencyCode)}`}
                    />
                  ) : null}

                  {invoice.vatSummary.length > 0 ? (
                    <div className="space-y-1 border-t pt-2">
                      <p className="text-2xs tracking-wide text-muted-foreground uppercase">KDV özeti</p>
                      {invoice.vatSummary.map((row) => (
                        <div
                          key={row.rate}
                          className="flex items-center justify-between text-xs text-muted-foreground"
                        >
                          <span>
                            %{row.rate} matrah {formatMoney(row.base, invoice.currencyCode)}
                          </span>
                          <span className="tabular-nums">
                            KDV {formatMoney(row.vat, invoice.currencyCode)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {invoice.withholdingTotal > 0 ? (
                    <TotalRow
                      label="Tevkifat"
                      value={`− ${formatMoney(invoice.withholdingTotal, invoice.currencyCode)}`}
                    />
                  ) : null}

                  <div className="flex items-center justify-between border-t pt-2 text-base font-semibold">
                    <span>Genel Toplam</span>
                    <span className="font-mono tabular-nums">
                      {formatMoney(invoice.grandTotal, invoice.currencyCode)}
                    </span>
                  </div>

                  <TotalRow
                    label="Ödenen"
                    value={formatMoney(invoice.paidTotal, invoice.currencyCode)}
                  />
                  <div className="flex items-center justify-between text-base font-semibold">
                    <span>Kalan</span>
                    <span
                      className={`font-mono tabular-nums ${
                        invoice.remainingTotal <= 0 ? 'text-emerald-600' : ''
                      }`}
                    >
                      {formatMoney(invoice.remainingTotal, invoice.currencyCode)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {invoice.status === 'issued' || invoice.status === 'paid' ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <PaymentsCard
                  invoiceId={invoice.id}
                  type={invoice.type}
                  currencyCode={invoice.currencyCode}
                  remainingTotal={invoice.remainingTotal}
                  canWrite={canWrite}
                  onAdd={() => setPaymentOpen(true)}
                />

                <Card className="h-fit">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Evraklar</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FileManager
                      entityType="Invoice"
                      entityId={invoice.id}
                      kind="file"
                      canWrite={canFiles}
                    />
                  </CardContent>
                </Card>
              </div>
            ) : null}
            </div>

            <InvoicePaymentDialog
              open={paymentOpen}
              onOpenChange={setPaymentOpen}
              invoiceId={invoice.id}
              type={invoice.type}
              defaultAmount={invoice.remainingTotal}
              onSaved={() => {
                void invalidate()
                void qc.invalidateQueries({ queryKey: ['invoices', id, 'payments'] })
              }}
            />
          </>
        )}
      </PageWrapper>
    </PermissionRequired>
  )
}

const PAYMENT_METHOD_LABEL: Record<'cash' | 'bank', string> = {
  cash: 'Kasa',
  bank: 'Banka',
}

function PaymentsCard({
  invoiceId,
  type,
  currencyCode,
  remainingTotal,
  canWrite,
  onAdd,
}: {
  invoiceId: string
  type: InvoiceType
  currencyCode: string
  remainingTotal: number
  canWrite: boolean
  onAdd: () => void
}) {
  const qc = useQueryClient()
  const noun = type === 'sales' ? 'Tahsilat' : 'Ödeme'

  const query = useQuery({
    queryKey: ['invoices', invoiceId, 'payments'],
    queryFn: () => api.invoices.listPayments(invoiceId),
  })

  const remove = useMutation({
    mutationFn: (paymentId: string) => api.invoices.removePayment(paymentId),
    onSuccess: () => {
      toast.success(`${noun} silindi`)
      void qc.invalidateQueries({ queryKey: ['invoices'] })
      void qc.invalidateQueries({ queryKey: ['invoices', invoiceId, 'payments'] })
    },
    onError: (e) => toast.error('Silme başarısız', { description: toApiError(e).message }),
  })

  const payments = query.data ?? []

  return (
    <Card className="h-fit">
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm">Tahsilat / Ödeme</CardTitle>
        {canWrite && remainingTotal > 0 ? (
          <Button size="sm" variant="outline" onClick={onAdd}>
            <Plus />
            {noun} ekle
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
            Henüz tahsilat/ödeme yok.
          </p>
        ) : (
          <div className="divide-y rounded-lg border">
            {payments.map((p: InvoicePaymentDto) => (
              <div key={p.id} className="flex items-center gap-3 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {PAYMENT_METHOD_LABEL[p.method]}
                    {p.accountName ? ` · ${p.accountName}` : ''}
                  </p>
                  <p className="text-2xs text-muted-foreground">
                    {formatDate(p.date)}
                    {p.description ? ` · ${p.description}` : ''}
                  </p>
                </div>
                <span className="font-mono text-sm font-semibold tabular-nums">
                  {formatMoney(p.amount, currencyCode)}
                </span>
                {canWrite ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Tahsilat/ödeme silinsin mi?')) remove.mutate(p.id)
                    }}
                    className="grid size-8 place-items-center rounded-md text-destructive hover:bg-accent"
                    title="Sil"
                  >
                    <Trash2 className="size-4" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function PaymentStatusBadge({
  invoice,
}: {
  invoice: { paidTotal: number; remainingTotal: number; grandTotal: number }
}) {
  if (invoice.remainingTotal <= 0) {
    return <Badge variant="success">Ödendi</Badge>
  }
  if (invoice.paidTotal > 0) {
    return <Badge variant="info">Kısmi Ödendi</Badge>
  }
  return <Badge variant="outline">Ödenmedi</Badge>
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </div>
  )
}

function Field({
  label,
  value,
  full,
}: {
  label: string
  value: ReactNode
  full?: boolean
}) {
  return (
    <div className={`space-y-0.5 ${full ? 'col-span-2 md:col-span-3' : ''}`}>
      <dt className="text-2xs tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  )
}

function Breadcrumb({ id, label }: { id: string; label: string }) {
  useRegisterBreadcrumbLabel(`/invoices/invoices/${id}`, label)
  return null
}

function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground">
      <p>Fatura bulunamadı.</p>
      <Button variant="outline" onClick={() => navigate({ to: '/invoices/invoices' })}>
        <ArrowLeft />
        Faturalara dön
      </Button>
    </div>
  )
}
