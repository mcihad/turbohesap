import { type ReactNode } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Printer } from 'lucide-react'

import { HrPermissions } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { useRegisterBreadcrumbLabel } from '@/lib/layout/breadcrumb-store'
import { PageHeader, PageWrapper } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PayslipPrint } from '../components/payslip-print'
import { formatMoney, periodLabel } from '../format'

const ROUTE = '/_authed/hr/payroll/payslips/$id'

export function PayslipPage() {
  const { id } = useParams({ from: ROUTE })
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(HrPermissions.read)

  const query = useQuery({
    queryKey: ['hr', 'payroll', 'payslips', id],
    queryFn: () => api.hr.payroll.getPayslip(id),
    enabled: canRead && !!id,
  })

  const s = query.data
  const gvNet = s ? s.gelirVergisi - s.gvIstisna : 0
  const damgaNet = s ? s.damga - s.damgaIstisna : 0

  return (
    <PermissionRequired permission={HrPermissions.read}>
      <PageWrapper>
        {query.isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : !s ? (
          <NotFound />
        ) : (
          <>
            <Breadcrumb id={s.id} label={`${s.employeeName} · ${periodLabel(s.year, s.month)}`} />
            <PageHeader
              title={`Maaş Pusulası · ${s.employeeName}`}
              description={periodLabel(s.year, s.month)}
              actions={
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => window.print()}>
                    <Printer />
                    Yazdır
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate({ to: '/hr/payroll/$id', params: { id: s.runId } })}
                  >
                    <ArrowLeft />
                    Bordro
                  </Button>
                </div>
              }
            />

            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
                  <CardTitle className="text-sm">Kazanç ve kesintiler</CardTitle>
                  {s.paidAt ? <Badge variant="success">Ödendi</Badge> : <Badge variant="outline">Ödenmedi</Badge>}
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <Row label="Brüt Ücret" value={formatMoney(s.brut)} strong />
                  <Row label={`SGK İşçi Payı (matrah ${formatMoney(s.sgkMatrah)})`} value={`− ${formatMoney(s.sgkIsci)}`} muted />
                  <Row label="İşsizlik İşçi Payı" value={`− ${formatMoney(s.issizlikIsci)}`} muted />
                  <Row label={`Gelir Vergisi (matrah ${formatMoney(s.gvMatrah)})`} value={`− ${formatMoney(s.gelirVergisi)}`} muted />
                  {s.gvIstisna > 0 ? <Row label="Gelir Vergisi İstisnası" value={`+ ${formatMoney(s.gvIstisna)}`} muted /> : null}
                  <Row label="Damga Vergisi" value={`− ${formatMoney(s.damga)}`} muted />
                  {s.damgaIstisna > 0 ? <Row label="Damga İstisnası" value={`+ ${formatMoney(s.damgaIstisna)}`} muted /> : null}
                  <div className="mt-1 flex items-center justify-between border-t pt-2 text-base font-semibold">
                    <span>Net Ödenen</span>
                    <span className="tabular-nums text-primary">{formatMoney(s.net)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="h-fit">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">İşveren maliyeti</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <Row label="Brüt" value={formatMoney(s.brut)} />
                  <Row label="SGK İşveren Payı" value={formatMoney(s.sgkIsveren)} muted />
                  <Row label="İşsizlik İşveren Payı" value={formatMoney(s.issizlikIsveren)} muted />
                  <div className="flex items-center justify-between border-t pt-2 text-base font-semibold">
                    <span>Toplam Maliyet</span>
                    <span className="tabular-nums">{formatMoney(s.isverenMaliyet)}</span>
                  </div>
                  <div className="space-y-1 border-t pt-2 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Çalışılan gün</span>
                      <span className="tabular-nums">{s.days}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Gelir vergisi (net)</span>
                      <span className="tabular-nums">{formatMoney(gvNet)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Damga vergisi (net)</span>
                      <span className="tabular-nums">{formatMoney(damgaNet)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <PayslipPrint payslip={s} />
          </>
        )}
      </PageWrapper>
    </PermissionRequired>
  )
}

function Row({ label, value, muted, strong }: { label: ReactNode; value: string; muted?: boolean; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${muted ? 'text-muted-foreground' : ''} ${strong ? 'font-semibold' : ''}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}

function Breadcrumb({ id, label }: { id: string; label: string }) {
  useRegisterBreadcrumbLabel(`/hr/payroll/payslips/${id}`, label)
  return null
}

function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground">
      <p>Pusula bulunamadı.</p>
      <Button variant="outline" onClick={() => navigate({ to: '/hr/payroll' })}>
        <ArrowLeft />
        Bordroya dön
      </Button>
    </div>
  )
}
