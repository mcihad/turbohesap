import { type ReactNode, useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  EMPLOYMENT_TYPE_LABELS,
  HrPermissions,
  SALARY_TYPE_LABELS,
  SGK_STATUS_LABELS,
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
import { EmployeeDialog } from '../components/employee-dialog'
import { formatMoney, periodLabel } from '../format'

const ROUTE = '/_authed/hr/employees/$id'
const YEAR = new Date().getFullYear()

export function EmployeeDetailPage() {
  const { id } = useParams({ from: ROUTE })
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(HrPermissions.read)
  const canWrite = hasPermission(HrPermissions.write)
  const [editOpen, setEditOpen] = useState(false)

  const query = useQuery({
    queryKey: ['hr', 'employees', id],
    queryFn: () => api.hr.employees.get(id),
    enabled: canRead && !!id,
  })

  const balanceQuery = useQuery({
    queryKey: ['hr', 'employees', id, 'leave-balance', YEAR],
    queryFn: () => api.hr.employees.leaveBalance(id, YEAR),
    enabled: canRead && !!id,
  })

  // Recent payslips: scan the latest payroll runs and pull this employee's slips.
  const payslipsQuery = useQuery({
    queryKey: ['hr', 'employees', id, 'payslips'],
    enabled: canRead && !!id,
    queryFn: async () => {
      const runs = (await api.hr.payroll.listRuns())
        .filter((r) => r.status !== 'draft')
        .sort((a, b) => b.year - a.year || b.month - a.month)
        .slice(0, 8)
      const slipsByRun = await Promise.all(runs.map((r) => api.hr.payroll.payslips(r.id)))
      return slipsByRun
        .flat()
        .filter((s) => s.employeeId === id)
        .sort((a, b) => b.year - a.year || b.month - a.month)
        .slice(0, 6)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.hr.employees.remove(id),
    onSuccess: () => {
      toast.success('Personel silindi')
      void qc.invalidateQueries({ queryKey: ['hr'] })
      navigate({ to: '/hr/employees' })
    },
    onError: (e) => toast.error('Silme başarısız', { description: toApiError(e).message }),
  })

  const emp = query.data
  const balance = balanceQuery.data

  return (
    <PermissionRequired permission={HrPermissions.read}>
      <PageWrapper>
        {query.isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : !emp ? (
          <NotFound />
        ) : (
          <>
            <Breadcrumb id={emp.id} label={emp.fullName} />
            <PageHeader
              title={emp.fullName}
              description={[
                emp.positionKey,
                emp.departmentKey,
                EMPLOYMENT_TYPE_LABELS[emp.employmentType],
              ]
                .filter(Boolean)
                .join(' · ')}
              audit={{ entityType: 'Employee', entityId: emp.id, title: 'Personel denetim kaydı' }}
              actions={
                <div className="flex flex-wrap gap-2">
                  {canWrite ? (
                    <>
                      <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                        <Pencil />
                        Düzenle
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={deleteMutation.isPending}
                        onClick={() => {
                          if (confirm('Personel silinsin mi? Bu işlem geri alınamaz.')) deleteMutation.mutate()
                        }}
                      >
                        <Trash2 className="text-destructive" />
                        Sil
                      </Button>
                    </>
                  ) : null}
                  <Button variant="outline" size="sm" onClick={() => navigate({ to: '/hr/employees' })}>
                    <ArrowLeft />
                    Liste
                  </Button>
                </div>
              }
            />

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                <Card>
                  <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
                    <CardTitle className="text-sm">Personel bilgileri</CardTitle>
                    {emp.isActive ? (
                      <Badge variant="success">Aktif</Badge>
                    ) : (
                      <Badge variant="outline">Pasif</Badge>
                    )}
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3">
                    <Field label="TC Kimlik No" value={emp.tcKimlikNo || '—'} />
                    <Field label="İşe Giriş" value={formatDate(emp.hireDate)} />
                    <Field label="Doğum Tarihi" value={emp.birthDate ? formatDate(emp.birthDate) : '—'} />
                    <Field label="Departman" value={emp.departmentKey || '—'} />
                    <Field label="Pozisyon" value={emp.positionKey || '—'} />
                    <Field label="Çalışma Türü" value={EMPLOYMENT_TYPE_LABELS[emp.employmentType]} />
                    <Field
                      label="Maaş"
                      value={`${formatMoney(emp.salaryAmount)} (${SALARY_TYPE_LABELS[emp.salaryType]})`}
                    />
                    <Field label="SGK Durumu" value={SGK_STATUS_LABELS[emp.sgkStatus]} />
                    <Field label="SGK Sicil No" value={emp.sgkSicilNo || '—'} />
                    <Field label="Telefon" value={emp.phone || '—'} />
                    <Field label="E-posta" value={emp.email || '—'} />
                    <Field label="IBAN" value={emp.iban || '—'} />
                    <Field label="Banka" value={emp.bankName || '—'} />
                    <Field label="Yıllık İzin" value={`${emp.annualLeaveDays} gün`} />
                    {emp.address ? <Field label="Adres" value={emp.address} full /> : null}
                    {emp.notes ? <Field label="Notlar" value={emp.notes} full /> : null}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Son maaş pusulaları</CardTitle>
                  </CardHeader>
                  <CardContent className="px-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Dönem</TableHead>
                          <TableHead className="text-right">Brüt</TableHead>
                          <TableHead className="text-right">Net</TableHead>
                          <TableHead className="text-right">Durum</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payslipsQuery.isLoading ? (
                          <TableRow>
                            <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                              Yükleniyor…
                            </TableCell>
                          </TableRow>
                        ) : (payslipsQuery.data ?? []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                              Pusula yok.
                            </TableCell>
                          </TableRow>
                        ) : (
                          payslipsQuery.data!.map((s) => (
                            <TableRow
                              key={s.id}
                              className="cursor-pointer"
                              onClick={() => navigate({ to: '/hr/payroll/payslips/$id', params: { id: s.id } })}
                            >
                              <TableCell className="font-medium">{periodLabel(s.year, s.month)}</TableCell>
                              <TableCell className="text-right tabular-nums">{formatMoney(s.brut)}</TableCell>
                              <TableCell className="text-right font-mono font-semibold tabular-nums">
                                {formatMoney(s.net)}
                              </TableCell>
                              <TableCell className="text-right">
                                {s.paidAt ? (
                                  <Badge variant="success">Ödendi</Badge>
                                ) : (
                                  <Badge variant="outline">Bekliyor</Badge>
                                )}
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
                  <CardTitle className="text-sm">Yıllık izin bakiyesi ({YEAR})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {balanceQuery.isLoading || !balance ? (
                    <Skeleton className="h-24 w-full" />
                  ) : (
                    <>
                      <BalanceRow label="Hak edilen" value={`${balance.entitlement} gün`} />
                      <BalanceRow label="Kullanılan" value={`${balance.used} gün`} />
                      <BalanceRow label="Onay bekleyen" value={`${balance.pending} gün`} />
                      <div className="flex items-center justify-between border-t pt-2 text-base font-semibold">
                        <span>Kalan</span>
                        <span className="tabular-nums">{balance.remaining} gün</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {canWrite ? (
              <EmployeeDialog open={editOpen} onOpenChange={setEditOpen} employee={emp} />
            ) : null}
          </>
        )}
      </PageWrapper>
    </PermissionRequired>
  )
}

function BalanceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
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
  useRegisterBreadcrumbLabel(`/hr/employees/${id}`, label)
  return null
}

function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground">
      <p>Personel bulunamadı.</p>
      <Button variant="outline" onClick={() => navigate({ to: '/hr/employees' })}>
        <ArrowLeft />
        Listeye dön
      </Button>
    </div>
  )
}
