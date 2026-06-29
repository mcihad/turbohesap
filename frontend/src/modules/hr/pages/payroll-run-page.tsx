import * as React from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Calculator, Lock, Trash2, Undo2, Wallet } from 'lucide-react'
import { toast } from 'sonner'

import {
  HrPermissions,
  PAYROLL_RUN_STATUS_LABELS,
  toApiError,
  type PayslipDto,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { useRegisterBreadcrumbLabel } from '@/lib/layout/breadcrumb-store'
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
import { StatGrid, StatTile } from '@/components/layout/stat-tile'
import { BadgeDollarSign, Receipt, Users } from 'lucide-react'
import { PayPayslipDialog } from '../components/pay-payslip-dialog'
import { formatMoney, periodLabel } from '../format'

const ROUTE = '/_authed/hr/payroll/$id'

export function PayrollRunPage() {
  const { id } = useParams({ from: ROUTE })
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(HrPermissions.read)
  const canPayroll = hasPermission(HrPermissions.payroll)
  const canPay = hasPermission(HrPermissions.pay)

  const [payTarget, setPayTarget] = React.useState<PayslipDto | null>(null)

  const runQuery = useQuery({
    queryKey: ['hr', 'payroll', 'runs', id],
    queryFn: () => api.hr.payroll.getRun(id),
    enabled: canRead && !!id,
  })
  const slipsQuery = useQuery({
    queryKey: ['hr', 'payroll', 'runs', id, 'payslips'],
    queryFn: () => api.hr.payroll.payslips(id),
    enabled: canRead && !!id,
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['hr', 'payroll'] })

  const compute = useMutation({
    mutationFn: () => api.hr.payroll.compute(id, {}),
    onSuccess: () => {
      toast.success('Bordro hesaplandı')
      void invalidate()
    },
    onError: (e) => toast.error('Hesaplanamadı', { description: toApiError(e).message }),
  })
  const finalize = useMutation({
    mutationFn: () => api.hr.payroll.finalize(id),
    onSuccess: () => {
      toast.success('Bordro kesinleştirildi')
      void invalidate()
    },
    onError: (e) => toast.error('Kesinleştirilemedi', { description: toApiError(e).message }),
  })
  const removeRun = useMutation({
    mutationFn: () => api.hr.payroll.removeRun(id),
    onSuccess: () => {
      toast.success('Bordro dönemi silindi')
      void invalidate()
      navigate({ to: '/hr/payroll' })
    },
    onError: (e) => toast.error('Silinemedi', { description: toApiError(e).message }),
  })
  const unpay = useMutation({
    mutationFn: (payslipId: string) => api.hr.payroll.unpay(payslipId),
    onSuccess: () => {
      toast.success('Ödeme geri alındı')
      void invalidate()
      void qc.invalidateQueries({ queryKey: ['finance'] })
    },
    onError: (e) => toast.error('Geri alınamadı', { description: toApiError(e).message }),
  })

  const run = runQuery.data
  const slips = slipsQuery.data ?? []

  return (
    <PermissionRequired permission={HrPermissions.read}>
      <PageWrapper>
        {runQuery.isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : !run ? (
          <NotFound />
        ) : (
          <>
            <Breadcrumb id={run.id} label={periodLabel(run.year, run.month)} />
            <PageHeader
              title={`Bordro · ${periodLabel(run.year, run.month)}`}
              description={`${PAYROLL_RUN_STATUS_LABELS[run.status]} · ${run.payslipCount} pusula`}
              audit={{ entityType: 'PayrollRun', entityId: run.id, title: 'Bordro denetim kaydı' }}
              actions={
                <div className="flex flex-wrap gap-2">
                  {canPayroll && run.status === 'draft' ? (
                    <Button size="sm" disabled={compute.isPending} onClick={() => compute.mutate()}>
                      <Calculator />
                      Hesapla
                    </Button>
                  ) : null}
                  {canPayroll && run.status === 'draft' && slips.length > 0 ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={finalize.isPending}
                      onClick={() => {
                        if (confirm('Bordro kesinleştirilsin mi? Kesinleşen bordro yeniden hesaplanamaz.'))
                          finalize.mutate()
                      }}
                    >
                      <Lock />
                      Kesinleştir
                    </Button>
                  ) : null}
                  {canPayroll && run.status === 'draft' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={removeRun.isPending}
                      onClick={() => {
                        if (confirm('Bordro dönemi silinsin mi? Bu işlem geri alınamaz.')) removeRun.mutate()
                      }}
                    >
                      <Trash2 className="text-destructive" />
                      Sil
                    </Button>
                  ) : null}
                  <Button variant="outline" size="sm" onClick={() => navigate({ to: '/hr/payroll' })}>
                    <ArrowLeft />
                    Liste
                  </Button>
                </div>
              }
            />

            <div className="space-y-4">
            <StatGrid>
              <StatTile icon={Users} tone="primary" label="Pusula" value={run.payslipCount} />
              <StatTile icon={BadgeDollarSign} tone="success" label="Net Toplam" value={formatMoney(run.totalNet)} />
              <StatTile icon={Receipt} tone="info" label="İşveren Maliyeti" value={formatMoney(run.totalCost)} />
              <StatTile
                icon={Wallet}
                tone="warning"
                label="Ödenen"
                value={`${slips.filter((s) => s.paidAt).length} / ${slips.length}`}
              />
            </StatGrid>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Maaş pusulaları</CardTitle>
              </CardHeader>
              <CardContent className="px-0">
                <div className="overflow-x-auto">
                  <Table className="min-w-[900px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Personel</TableHead>
                        <TableHead className="text-right">Brüt</TableHead>
                        <TableHead className="text-right">SGK+İşsizlik</TableHead>
                        <TableHead className="text-right">Gelir+Damga</TableHead>
                        <TableHead className="text-right">Net</TableHead>
                        <TableHead className="text-right">İşveren Maliyeti</TableHead>
                        <TableHead className="text-right">Durum</TableHead>
                        <TableHead className="text-right" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {slipsQuery.isLoading ? (
                        <TableRow>
                          <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                            Yükleniyor…
                          </TableCell>
                        </TableRow>
                      ) : slips.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                            Henüz pusula yok. {canPayroll ? '"Hesapla" ile oluşturun.' : ''}
                          </TableCell>
                        </TableRow>
                      ) : (
                        slips.map((s) => (
                          <TableRow
                            key={s.id}
                            className="cursor-pointer"
                            onClick={() => navigate({ to: '/hr/payroll/payslips/$id', params: { id: s.id } })}
                          >
                            <TableCell className="font-medium">{s.employeeName}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatMoney(s.brut)}</TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {formatMoney(s.sgkIsci + s.issizlikIsci)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {formatMoney(s.gelirVergisi - s.gvIstisna + (s.damga - s.damgaIstisna))}
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold tabular-nums">
                              {formatMoney(s.net)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{formatMoney(s.isverenMaliyet)}</TableCell>
                            <TableCell className="text-right">
                              {s.paidAt ? (
                                <Badge variant="success">Ödendi</Badge>
                              ) : (
                                <Badge variant="outline">Bekliyor</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              {canPay && s.paidAt ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={unpay.isPending}
                                  onClick={() => {
                                    if (confirm('Ödeme geri alınsın mı?')) unpay.mutate(s.id)
                                  }}
                                >
                                  <Undo2 className="size-4" />
                                  Geri Al
                                </Button>
                              ) : canPay && !s.paidAt ? (
                                <Button variant="outline" size="sm" onClick={() => setPayTarget(s)}>
                                  <Wallet className="size-4" />
                                  Öde
                                </Button>
                              ) : null}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
            </div>
          </>
        )}

        <PayPayslipDialog payslip={payTarget} open={!!payTarget} onOpenChange={(o) => !o && setPayTarget(null)} />
      </PageWrapper>
    </PermissionRequired>
  )
}

function Breadcrumb({ id, label }: { id: string; label: string }) {
  useRegisterBreadcrumbLabel(`/hr/payroll/${id}`, label)
  return null
}

function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground">
      <p>Bordro dönemi bulunamadı.</p>
      <Button variant="outline" onClick={() => navigate({ to: '/hr/payroll' })}>
        <ArrowLeft />
        Listeye dön
      </Button>
    </div>
  )
}
