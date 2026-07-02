import * as React from 'react'
import { type ReactNode } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Ban, PackageCheck, Send } from 'lucide-react'
import { toast } from 'sonner'

import {
  SUBCONTRACT_DISPATCH_STATUS_LABELS,
  ProductionPermissions,
  toApiError,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { useRegisterBreadcrumbLabel } from '@/lib/layout/breadcrumb-store'
import { formatDate } from '@/lib/datetime'
import { PageHeader, PageWrapper } from '@/components/layout/page'
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
import { SubcontractReceiveDialog } from '../components/subcontract-receive-dialog'
import { SubcontractStatusBadge } from '../components/status-badge'
import { formatMoney, formatQty } from '../format'

const ROUTE = '/_authed/production/subcontract/$id'

export function SubcontractDetailPage() {
  const { id } = useParams({ from: ROUTE })
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(ProductionPermissions.read)
  const canManage = hasPermission(ProductionPermissions.subcontractManage)
  const [receiveOpen, setReceiveOpen] = React.useState(false)

  const query = useQuery({
    queryKey: ['production', 'subcontract', id],
    queryFn: () => api.production.subcontract.get(id),
    enabled: canRead && !!id,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['production', 'subcontract'] })

  const sendMutation = useMutation({
    mutationFn: () => api.production.subcontract.send(id),
    onSuccess: () => {
      toast.success('Sevk edildi')
      void invalidate()
    },
    onError: (e) => toast.error('İşlem başarısız', { description: toApiError(e).message }),
  })
  const cancelMutation = useMutation({
    mutationFn: () => api.production.subcontract.cancel(id),
    onSuccess: () => {
      toast.success('Sevk iptal edildi')
      void invalidate()
    },
    onError: (e) => toast.error('İptal başarısız', { description: toApiError(e).message }),
  })

  const d = query.data

  return (
    <PermissionRequired permission={ProductionPermissions.read}>
      <PageWrapper>
        {query.isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : !d ? (
          <NotFound />
        ) : (
          <>
            <Breadcrumb id={d.id} label={d.dispatchNo} />
            <PageHeader
              title={`Fason Sevk · ${d.dispatchNo}`}
              description={[
                SUBCONTRACT_DISPATCH_STATUS_LABELS[d.status],
                d.contactName,
                d.manufacturingOrderNo,
              ]
                .filter(Boolean)
                .join(' · ')}
              actions={
                <div className="flex flex-wrap gap-2">
                  {canManage && d.status === 'draft' ? (
                    <Button
                      size="sm"
                      disabled={sendMutation.isPending}
                      onClick={() => {
                        if (confirm('Malzeme fasoncuya sevk edilsin mi?')) sendMutation.mutate()
                      }}
                    >
                      <Send /> Sevk Et
                    </Button>
                  ) : null}
                  {canManage && d.status === 'sent' ? (
                    <Button size="sm" onClick={() => setReceiveOpen(true)}>
                      <PackageCheck /> Teslim Al
                    </Button>
                  ) : null}
                  {canManage && d.status !== 'received' && d.status !== 'cancelled' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={cancelMutation.isPending}
                      onClick={() => {
                        if (confirm('Sevk iptal edilsin mi?')) cancelMutation.mutate()
                      }}
                    >
                      <Ban className="text-destructive" /> İptal
                    </Button>
                  ) : null}
                  <Button variant="outline" size="sm" onClick={() => navigate({ to: '/production/subcontract' })}>
                    <ArrowLeft /> Liste
                  </Button>
                </div>
              }
            />

            <div className="space-y-4">
              <Card>
                <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
                  <CardTitle className="text-sm">Sevk Bilgileri</CardTitle>
                  <SubcontractStatusBadge status={d.status} />
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
                  <Field label="Fasoncu" value={d.contactName} />
                  <Field label="Üretim Emri" value={d.manufacturingOrderNo} />
                  <Field label="Sevk Tarihi" value={formatDate(d.dispatchDate)} />
                  <Field label="Beklenen Dönüş" value={d.expectedReturnDate ? formatDate(d.expectedReturnDate) : '—'} />
                  <Field label="İşçilik Ücreti" value={d.serviceCost ? formatMoney(d.serviceCost, d.currency) : '—'} />
                  {d.notes ? <Field label="Notlar" value={d.notes} full /> : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Malzeme Satırları</CardTitle>
                </CardHeader>
                <CardContent className="px-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bileşen</TableHead>
                        <TableHead className="text-right">Gönderilen</TableHead>
                        <TableHead className="text-right">İade</TableHead>
                        <TableHead className="text-right">Fasonda</TableHead>
                        <TableHead>Birim</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {d.lines.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                            Satır yok.
                          </TableCell>
                        </TableRow>
                      ) : (
                        d.lines.map((l) => (
                          <TableRow key={l.id}>
                            <TableCell>
                              <div className="font-medium">{l.componentName}</div>
                              <div className="font-mono text-2xs text-muted-foreground">{l.componentCode}</div>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{formatQty(l.sentQuantity)}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatQty(l.returnedQuantity)}</TableCell>
                            <TableCell className="text-right font-mono tabular-nums">{formatQty(l.atSubcontractor)}</TableCell>
                            <TableCell className="text-muted-foreground">{l.unit}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            <SubcontractReceiveDialog
              open={receiveOpen}
              onOpenChange={setReceiveOpen}
              dispatch={d}
              onReceived={() => void query.refetch()}
            />
          </>
        )}
      </PageWrapper>
    </PermissionRequired>
  )
}

function Field({ label, value, full }: { label: string; value: ReactNode; full?: boolean }) {
  return (
    <div className={`space-y-0.5 ${full ? 'col-span-2 md:col-span-4' : ''}`}>
      <dt className="text-2xs tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  )
}

function Breadcrumb({ id, label }: { id: string; label: string }) {
  useRegisterBreadcrumbLabel(`/production/subcontract/${id}`, label)
  return null
}

function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground">
      <p>Fason sevk bulunamadı.</p>
      <Button variant="outline" onClick={() => navigate({ to: '/production/subcontract' })}>
        <ArrowLeft /> Listeye dön
      </Button>
    </div>
  )
}
