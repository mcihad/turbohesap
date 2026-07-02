import * as React from 'react'
import { type ReactNode } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  PlayCircle,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  PRODUCTION_ORDER_STATUS_LABELS,
  PRODUCTION_PRIORITY_LABELS,
  ProductionPermissions,
  toApiError,
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
import { MoCompleteDialog } from '../components/mo-complete-dialog'
import { QualityRecordDialog } from '../components/quality-record-dialog'
import { MoStatusBadge, WoStatusBadge } from '../components/status-badge'
import { formatMinutes, formatMoney, formatQty } from '../format'

const ROUTE = '/_authed/production/orders/$id'

export function ManufacturingOrderDetailPage() {
  const { id } = useParams({ from: ROUTE })
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(ProductionPermissions.read)
  const canWrite = hasPermission(ProductionPermissions.ordersWrite)
  const canConfirm = hasPermission(ProductionPermissions.ordersConfirm)
  const canComplete = hasPermission(ProductionPermissions.ordersComplete)
  const canCancel = hasPermission(ProductionPermissions.ordersCancel)
  const canQuality = hasPermission(ProductionPermissions.qualityManage)

  const [completeOpen, setCompleteOpen] = React.useState(false)
  const [qualityOpen, setQualityOpen] = React.useState(false)

  const query = useQuery({
    queryKey: ['production', 'orders', id],
    queryFn: () => api.production.orders.get(id),
    enabled: canRead && !!id,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['production'] })

  const confirmMutation = useMutation({
    mutationFn: () => api.production.orders.confirm(id),
    onSuccess: () => {
      toast.success('Emir onaylandı; reçete patlatıldı ve bileşenler rezerve edildi')
      void invalidate()
    },
    onError: (e) => toast.error('Onaylanamadı', { description: toApiError(e).message }),
  })

  const cancelMutation = useMutation({
    mutationFn: () => api.production.orders.cancel(id),
    onSuccess: () => {
      toast.success('Emir iptal edildi')
      void invalidate()
    },
    onError: (e) => toast.error('İptal başarısız', { description: toApiError(e).message }),
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.production.orders.remove(id),
    onSuccess: () => {
      toast.success('Emir silindi')
      void invalidate()
      navigate({ to: '/production/orders' })
    },
    onError: (e) => toast.error('Silme başarısız', { description: toApiError(e).message }),
  })

  const mo = query.data

  return (
    <PermissionRequired permission={ProductionPermissions.read}>
      <PageWrapper>
        {query.isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : !mo ? (
          <NotFound />
        ) : (
          <>
            <Breadcrumb id={mo.id} label={mo.orderNo} />
            <PageHeader
              title={`${mo.orderNo} · ${mo.productName}`}
              description={[
                PRODUCTION_ORDER_STATUS_LABELS[mo.status],
                PRODUCTION_PRIORITY_LABELS[mo.priority],
                mo.bomCode ? `Reçete ${mo.bomCode} (v${mo.bomVersion ?? '—'})` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
              actions={
                <div className="flex flex-wrap gap-2">
                  {canConfirm && mo.status === 'draft' ? (
                    <Button
                      size="sm"
                      disabled={confirmMutation.isPending}
                      onClick={() => {
                        if (confirm('Emir onaylansın mı? Reçete patlatılıp bileşenler rezerve edilecek.'))
                          confirmMutation.mutate()
                      }}
                    >
                      <CheckCircle2 /> Onayla
                    </Button>
                  ) : null}

                  {canComplete && (mo.status === 'confirmed' || mo.status === 'in_progress') ? (
                    <Button size="sm" onClick={() => setCompleteOpen(true)}>
                      <PlayCircle /> Tamamla
                    </Button>
                  ) : null}

                  {canQuality && mo.status !== 'cancelled' ? (
                    <Button variant="outline" size="sm" onClick={() => setQualityOpen(true)}>
                      <ShieldCheck /> Kalite Kaydet
                    </Button>
                  ) : null}

                  {canWrite && mo.status === 'draft' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={deleteMutation.isPending}
                      onClick={() => {
                        if (confirm('Taslak emir silinsin mi?')) deleteMutation.mutate()
                      }}
                    >
                      <Trash2 className="text-destructive" /> Sil
                    </Button>
                  ) : null}

                  {canCancel && mo.status !== 'draft' && mo.status !== 'done' && mo.status !== 'cancelled' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={cancelMutation.isPending}
                      onClick={() => {
                        if (confirm('Emir iptal edilsin mi? Stok hareketleri geri alınır.')) cancelMutation.mutate()
                      }}
                    >
                      <Ban className="text-destructive" /> İptal
                    </Button>
                  ) : null}

                  <Button variant="outline" size="sm" onClick={() => navigate({ to: '/production/orders' })}>
                    <ArrowLeft /> Liste
                  </Button>
                </div>
              }
            />

            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                  <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
                    <CardTitle className="text-sm">Emir Bilgileri</CardTitle>
                    <MoStatusBadge status={mo.status} />
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3">
                    <Field label="Mamul" value={`${mo.productName} (${mo.productCode})`} />
                    <Field label="Planlanan" value={`${formatQty(mo.plannedQuantity)} ${mo.unit}`} />
                    <Field label="Üretilen" value={`${formatQty(mo.producedQuantity)} ${mo.unit}`} />
                    <Field label="Fire" value={`${formatQty(mo.scrappedQuantity)} ${mo.unit}`} />
                    <Field label="Tür" value={mo.type === 'subcontract' ? 'Fason' : 'Standart'} />
                    <Field label="Kaynak" value={mo.sourceMode === 'mto' ? 'Siparişe (MTO)' : 'Stoğa (MTS)'} />
                    <Field label="Öncelik" value={PRODUCTION_PRIORITY_LABELS[mo.priority]} />
                    <Field label="Termin" value={mo.dueDate ? formatDate(mo.dueDate) : '—'} />
                    <Field label="Başlangıç" value={mo.actualStartDate ? formatDate(mo.actualStartDate) : mo.plannedStartDate ? formatDate(mo.plannedStartDate) : '—'} />
                    {mo.notes ? <Field label="Notlar" value={mo.notes} full /> : null}
                  </CardContent>
                </Card>

                {/* Cost breakdown */}
                <Card className="h-fit">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Maliyet Dökümü</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <CostRow label="Std. Malzeme" value={formatMoney(mo.stdMaterialCost, mo.currency)} />
                    <CostRow label="Std. Operasyon" value={formatMoney(mo.stdOperationCost, mo.currency)} />
                    <div className="border-t pt-2" />
                    <CostRow label="Gerç. Malzeme" value={formatMoney(mo.actualMaterialCost, mo.currency)} />
                    <CostRow label="Gerç. Operasyon" value={formatMoney(mo.actualOperationCost, mo.currency)} />
                    {mo.subcontractServiceCost ? (
                      <CostRow label="Fason İşçilik" value={formatMoney(mo.subcontractServiceCost, mo.currency)} />
                    ) : null}
                    {mo.byproductCredit ? (
                      <CostRow label="Yan Ürün Kredisi" value={`− ${formatMoney(mo.byproductCredit, mo.currency)}`} />
                    ) : null}
                    <div className="flex items-center justify-between border-t pt-2 text-base font-semibold">
                      <span>Toplam</span>
                      <span className="font-mono tabular-nums">{formatMoney(mo.totalCost, mo.currency)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Birim Maliyet</span>
                      <span className="font-mono tabular-nums">{formatMoney(mo.unitCost, mo.currency)}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Components */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Bileşenler</CardTitle>
                </CardHeader>
                <CardContent className="px-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bileşen</TableHead>
                        <TableHead className="text-right">Gerekli</TableHead>
                        <TableHead className="text-right">Rezerve</TableHead>
                        <TableHead className="text-right">Tüketilen</TableHead>
                        <TableHead>Birim</TableHead>
                        <TableHead className="text-right">Birim Mal.</TableHead>
                        <TableHead className="text-right">Toplam Mal.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mo.components.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                            Bileşen yok. (Emir onaylandığında reçete patlatılır.)
                          </TableCell>
                        </TableRow>
                      ) : (
                        mo.components.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell>
                              <div className="font-medium">{c.componentName}</div>
                              <div className="font-mono text-2xs text-muted-foreground">
                                {c.componentCode}
                                {c.isOptional ? ' · opsiyonel' : ''}
                              </div>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{formatQty(c.requiredQuantity)}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatQty(c.reservedQuantity)}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatQty(c.consumedQuantity)}</TableCell>
                            <TableCell className="text-muted-foreground">{c.unit}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {c.unitCost != null ? formatMoney(c.unitCost, mo.currency) : '—'}
                            </TableCell>
                            <TableCell className="text-right font-mono tabular-nums">
                              {c.totalCost != null ? formatMoney(c.totalCost, mo.currency) : '—'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Byproducts */}
              {mo.byproducts.length ? (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Yan Ürünler</CardTitle>
                  </CardHeader>
                  <CardContent className="px-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ürün</TableHead>
                          <TableHead className="text-right">Beklenen</TableHead>
                          <TableHead className="text-right">Üretilen</TableHead>
                          <TableHead>Birim</TableHead>
                          <TableHead className="text-right">Birim Mal.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mo.byproducts.map((b) => (
                          <TableRow key={b.id}>
                            <TableCell className="font-medium">{b.productName}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatQty(b.quantity)}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatQty(b.producedQuantity)}</TableCell>
                            <TableCell className="text-muted-foreground">{b.unit}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {b.unitCost != null ? formatMoney(b.unitCost, mo.currency) : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              ) : null}

              {/* Work orders */}
              <Card>
                <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm">İş Emirleri</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => navigate({ to: '/production/work-orders' })}>
                    Saha Terminali
                  </Button>
                </CardHeader>
                <CardContent className="px-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Sıra</TableHead>
                        <TableHead>Operasyon</TableHead>
                        <TableHead>İş Merkezi</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead className="text-right">Üretilen/Planlanan</TableHead>
                        <TableHead className="text-right">Süre</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mo.workOrders.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                            İş emri yok.
                          </TableCell>
                        </TableRow>
                      ) : (
                        [...mo.workOrders]
                          .sort((a, b) => a.sequence - b.sequence)
                          .map((w) => (
                            <TableRow key={w.id}>
                              <TableCell className="tabular-nums">#{w.sequence}</TableCell>
                              <TableCell>
                                <span className="font-medium">{w.name}</span>
                                {w.qualityCheckRequired ? (
                                  <Badge variant="outline" className="ml-2">
                                    Kalite
                                  </Badge>
                                ) : null}
                              </TableCell>
                              <TableCell className="text-muted-foreground">{w.workCenterName}</TableCell>
                              <TableCell>
                                <WoStatusBadge status={w.status} />
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {formatQty(w.producedQuantity)} / {formatQty(w.plannedQuantity)}
                              </TableCell>
                              <TableCell className="text-right text-sm">{formatMinutes(w.actualMinutes)}</TableCell>
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            <MoCompleteDialog open={completeOpen} onOpenChange={setCompleteOpen} mo={mo} onCompleted={() => void query.refetch()} />
            <QualityRecordDialog
              open={qualityOpen}
              onOpenChange={setQualityOpen}
              manufacturingOrderId={mo.id}
              defaultCheckType="final"
              defaultQuantity={mo.producedQuantity || mo.plannedQuantity}
              onRecorded={() => void query.refetch()}
            />
          </>
        )}
      </PageWrapper>
    </PermissionRequired>
  )
}

function CostRow({ label, value }: { label: string; value: string }) {
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
  useRegisterBreadcrumbLabel(`/production/orders/${id}`, label)
  return null
}

function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground">
      <p>Üretim emri bulunamadı.</p>
      <Button variant="outline" onClick={() => navigate({ to: '/production/orders' })}>
        <ArrowLeft /> Listeye dön
      </Button>
    </div>
  )
}
