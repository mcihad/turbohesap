import * as React from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'

import { OrgPermissions } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { useRegisterBreadcrumbLabel } from '@/lib/layout/breadcrumb-store'
import { formatDate, formatDateTime } from '@/lib/datetime'
import { PageHeader, PageWrapper } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { branchTypeLabel } from '../labels'

const ROUTE = '/_authed/org/branches/$id'

export function BranchDetailPage() {
  const { id } = useParams({ from: ROUTE })
  const { hasPermission } = useAuth()
  const canRead = hasPermission(OrgPermissions.branchesRead)

  const query = useQuery({
    queryKey: ['org', 'branches', id],
    queryFn: () => api.org.branches.get(id),
    enabled: canRead,
  })
  const branch = query.data

  return (
    <PermissionRequired permission={OrgPermissions.branchesRead}>
      <PageWrapper>
        {query.isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : !branch ? (
          <NotFound />
        ) : (
          <>
            <Breadcrumb id={branch.id} name={branch.name} />
            <PageHeader
              title={branch.name}
              description={`${branch.code} · ${branchTypeLabel(branch.type)}`}
              audit={{
                entityType: 'Branch',
                entityId: branch.id,
                title: 'Şube denetim kaydı',
              }}
              actions={
                <Button variant="outline" size="sm" asChild>
                  <Link to="/org/branches">
                    <ArrowLeft />
                    Şubeler
                  </Link>
                </Button>
              }
            />

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
                  <CardTitle className="text-sm">Genel</CardTitle>
                  <Badge variant={branch.isActive ? 'success' : 'outline'}>
                    {branch.isActive ? 'Aktif' : 'Pasif'}
                  </Badge>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3">
                  <Field label="Kod" value={branch.code} mono />
                  <Field label="Tür" value={branchTypeLabel(branch.type)} />
                  <Field
                    label="Açılış"
                    value={branch.openingDate ? formatDate(branch.openingDate) : '—'}
                  />
                  <Field label="Açıklama" value={branch.description || '—'} full />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">İletişim</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3">
                  <Field label="Telefon" value={branch.phone || '—'} />
                  <Field label="İkinci telefon" value={branch.secondaryPhone || '—'} />
                  <Field label="Faks" value={branch.fax || '—'} />
                  <Field label="E-posta" value={branch.email || '—'} />
                  <Field label="Web sitesi" value={branch.website || '—'} full />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Adres</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3">
                  <Field label="Ülke" value={branch.country || '—'} />
                  <Field label="İl" value={branch.city || '—'} />
                  <Field label="İlçe" value={branch.district || '—'} />
                  <Field label="Mahalle" value={branch.neighborhood || '—'} />
                  <Field label="Posta kodu" value={branch.postalCode || '—'} />
                  <Field
                    label="Konum"
                    value={
                      branch.latitude != null && branch.longitude != null
                        ? `${branch.latitude}, ${branch.longitude}`
                        : '—'
                    }
                  />
                  <Field label="Açık adres" value={branch.addressLine || '—'} full />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Yetkili ve vergi</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3">
                  <Field label="Yetkili" value={branch.managerName || '—'} />
                  <Field label="Unvanı" value={branch.managerTitle || '—'} />
                  <Field label="Telefon" value={branch.managerPhone || '—'} />
                  <Field label="E-posta" value={branch.managerEmail || '—'} />
                  <Field label="Vergi dairesi" value={branch.taxOffice || '—'} />
                  <Field label="Vergi / TC no" value={branch.taxNumber || '—'} />
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-sm">Kayıt</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                  <Field label="Oluşturma" value={formatDateTime(branch.createdAt)} />
                  <Field label="Güncelleme" value={formatDateTime(branch.updatedAt)} />
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </PageWrapper>
    </PermissionRequired>
  )
}

function Breadcrumb({ id, name }: { id: string; name: string }) {
  useRegisterBreadcrumbLabel(`/org/branches/${id}`, name)
  return null
}

function Field({
  label,
  value,
  mono,
  full,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
  full?: boolean
}) {
  return (
    <div className={`space-y-0.5 ${full ? 'col-span-2' : ''}`}>
      <dt className="text-2xs tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className={`text-sm ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  )
}

function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground">
      <p>Şube bulunamadı.</p>
      <Button variant="outline" onClick={() => navigate({ to: '/org/branches' })}>
        <ArrowLeft />
        Şubelere dön
      </Button>
    </div>
  )
}
