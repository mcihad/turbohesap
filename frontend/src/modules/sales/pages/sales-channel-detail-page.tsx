import * as React from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'

import { SalesPermissions } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { useRegisterBreadcrumbLabel } from '@/lib/layout/breadcrumb-store'
import { formatDateTime } from '@/lib/datetime'
import { PageHeader, PageWrapper } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { salesChannelTypeLabel } from '../labels'

const ROUTE = '/_authed/sales/channels/$id'

export function SalesChannelDetailPage() {
  const { id } = useParams({ from: ROUTE })
  const { hasPermission } = useAuth()
  const canRead = hasPermission(SalesPermissions.channelsRead)

  const query = useQuery({
    queryKey: ['sales', 'channels', id],
    queryFn: () => api.sales.channels.get(id),
    enabled: canRead,
  })
  const channel = query.data

  return (
    <PermissionRequired permission={SalesPermissions.channelsRead}>
      <PageWrapper>
        {query.isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : !channel ? (
          <NotFound />
        ) : (
          <>
            <Breadcrumb id={channel.id} name={channel.name} />
            <PageHeader
              title={channel.name}
              description={`${channel.code} · ${salesChannelTypeLabel(channel.type)}`}
              audit={{
                entityType: 'SalesChannel',
                entityId: channel.id,
                title: 'Satış kanalı denetim kaydı',
              }}
              actions={
                <Button variant="outline" size="sm" asChild>
                  <Link to="/sales/channels">
                    <ArrowLeft />
                    Kanallar
                  </Link>
                </Button>
              }
            />

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
                  <CardTitle className="text-sm">Genel</CardTitle>
                  <div className="flex gap-1.5">
                    {channel.isDefault ? <Badge variant="info">Varsayılan</Badge> : null}
                    <Badge variant={channel.isActive ? 'success' : 'outline'}>
                      {channel.isActive ? 'Aktif' : 'Pasif'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3">
                  <Field label="Kod" value={channel.code} mono />
                  <Field label="Tür" value={salesChannelTypeLabel(channel.type)} />
                  <Field label="Para birimi" value={channel.currency} />
                  <Field
                    label="Komisyon"
                    value={channel.commissionRate == null ? '—' : `%${channel.commissionRate}`}
                  />
                  <Field label="Sıra" value={String(channel.sortOrder)} />
                  <Field label="Web sitesi" value={channel.website || '—'} />
                  <Field label="Açıklama" value={channel.description || '—'} full />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">İletişim ve yetkili</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3">
                  <Field label="Yetkili" value={channel.contactName || '—'} />
                  <Field label="Unvanı" value={channel.contactTitle || '—'} />
                  <Field label="Telefon" value={channel.contactPhone || '—'} />
                  <Field label="E-posta" value={channel.contactEmail || '—'} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Adres</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3">
                  <Field label="Ülke" value={channel.country || '—'} />
                  <Field label="İl" value={channel.city || '—'} />
                  <Field label="İlçe" value={channel.district || '—'} />
                  <Field label="Posta kodu" value={channel.postalCode || '—'} />
                  <Field label="Açık adres" value={channel.addressLine || '—'} full />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Kayıt</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3">
                  <Field label="Oluşturma" value={formatDateTime(channel.createdAt)} />
                  <Field label="Güncelleme" value={formatDateTime(channel.updatedAt)} />
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
  useRegisterBreadcrumbLabel(`/sales/channels/${id}`, name)
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
      <p>Satış kanalı bulunamadı.</p>
      <Button variant="outline" onClick={() => navigate({ to: '/sales/channels' })}>
        <ArrowLeft />
        Kanallara dön
      </Button>
    </div>
  )
}
