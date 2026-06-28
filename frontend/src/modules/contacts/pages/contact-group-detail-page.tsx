import * as React from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Building2, Pencil, Trash2, User } from 'lucide-react'
import { toast } from 'sonner'

import {
  ContactsPermissions,
  toApiError,
  type ContactDto,
  type ContactRole,
} from '@turbohesap/shared'

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
import { DataGrid, type ColumnDef } from '@/components/data-grid'
import { ContactGroupDialog } from '../components/contact-group-dialog'
import { balanceSideLabel, balanceTone, formatMoney } from '../format'

const ROUTE = '/_authed/contacts/groups/$id'

const ROLE_LABEL: Record<ContactRole, string> = {
  customer: 'Müşteri', supplier: 'Tedarikçi', both: 'Müşteri+Tedarikçi', lead: 'Aday',
}
const ROLE_TONE: Record<ContactRole, 'success' | 'info' | 'secondary' | 'warning'> = {
  customer: 'success', supplier: 'info', both: 'secondary', lead: 'warning',
}

export function ContactGroupDetailPage() {
  const { id } = useParams({ from: ROUTE })
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(ContactsPermissions.contactsRead)
  const canWrite = hasPermission(ContactsPermissions.contactsWrite)

  const query = useQuery({
    queryKey: ['contacts', 'groups', id],
    queryFn: () => api.contacts.groups.get(id),
    enabled: canRead && !!id,
  })
  const allQuery = useQuery({
    queryKey: ['contacts', 'groups'],
    queryFn: () => api.contacts.groups.list(),
    enabled: canRead,
  })
  const contactsQuery = useQuery({
    queryKey: ['contacts', 'contacts', { groupId: id }],
    queryFn: () => api.contacts.contacts.list({ groupId: id }),
    enabled: canRead && !!id,
  })

  const [editOpen, setEditOpen] = React.useState(false)

  const group = query.data
  const allGroups = allQuery.data ?? []
  const parent = group?.parentId ? allGroups.find((g) => g.id === group.parentId) ?? null : null
  const subGroups = React.useMemo(
    () => allGroups.filter((g) => g.parentId === id).sort((a, b) => a.name.localeCompare(b.name, 'tr')),
    [allGroups, id],
  )
  const contacts = contactsQuery.data ?? []

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['contacts', 'groups'] })
    void qc.invalidateQueries({ queryKey: ['contacts', 'groups', id] })
    void qc.invalidateQueries({ queryKey: ['contacts', 'contacts'] })
  }

  const deleteMutation = useMutation({
    mutationFn: () => api.contacts.groups.remove(id),
    onSuccess: () => {
      toast.success('Grup silindi')
      void qc.invalidateQueries({ queryKey: ['contacts', 'groups'] })
      navigate({ to: '/contacts/groups' })
    },
    onError: (e) => toast.error('Silinemedi', { description: toApiError(e).message }),
  })

  const columns: ColumnDef<ContactDto>[] = [
    { id: 'code', accessorKey: 'code', header: 'Kod', size: 120, cell: ({ row }) => <span className="font-mono text-xs">{row.original.code}</span> },
    {
      id: 'name', accessorKey: 'name', header: 'Ünvan', size: 240,
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1.5 font-medium">
          {row.original.contactType === 'company' ? <Building2 className="size-3.5 text-muted-foreground" /> : <User className="size-3.5 text-muted-foreground" />}
          {row.original.name}
        </span>
      ),
    },
    { id: 'role', accessorKey: 'role', header: 'Rol', size: 140, enableGrouping: true, cell: ({ row }) => <Badge variant={ROLE_TONE[row.original.role]}>{ROLE_LABEL[row.original.role]}</Badge> },
    {
      id: 'balance', accessorKey: 'balance', header: 'Bakiye', size: 150,
      cell: ({ row }) => (
        <span className={`tabular-nums font-medium ${balanceTone(row.original.balanceSide)}`}>
          {formatMoney(row.original.balance, row.original.currencyCode)}
          <span className="ml-1 text-2xs font-normal text-muted-foreground">{balanceSideLabel(row.original.balanceSide)}</span>
        </span>
      ),
    },
    { id: 'isActive', accessorKey: 'isActive', header: 'Durum', size: 100, enableGrouping: true, cell: ({ row }) => <Badge variant={row.original.isActive ? 'success' : 'outline'}>{row.original.isActive ? 'Aktif' : 'Pasif'}</Badge> },
  ]

  return (
    <PermissionRequired permission={ContactsPermissions.contactsRead}>
      <PageWrapper>
        {query.isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : !group ? (
          <NotFound />
        ) : (
          <>
            <Breadcrumb id={group.id} name={group.name} />
            <PageHeader
              title={group.name}
              description={[group.code, parent?.name].filter(Boolean).join(' · ') || undefined}
              audit={{ entityType: 'ContactGroup', entityId: group.id, title: 'Grup denetim kaydı' }}
              actions={
                <div className="flex flex-wrap gap-2">
                  {canWrite ? (
                    <>
                      <Button size="sm" onClick={() => setEditOpen(true)}>
                        <Pencil />
                        Düzenle
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (subGroups.length) {
                            toast.error('Alt grupları olan grup silinemez', { description: 'Önce alt grupları taşıyın veya silin.' })
                            return
                          }
                          if (group.contactCount > 0) {
                            toast.error('Cariler içeren grup silinemez', { description: 'Önce carileri başka gruba taşıyın.' })
                            return
                          }
                          if (confirm(`"${group.name}" silinsin mi?`)) deleteMutation.mutate()
                        }}
                      >
                        <Trash2 className="text-destructive" />
                        Sil
                      </Button>
                    </>
                  ) : null}
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/contacts/groups">
                      <ArrowLeft />
                      Gruplar
                    </Link>
                  </Button>
                </div>
              }
            />

            <div className="space-y-5">
            <Card>
              <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
                <CardTitle className="text-sm">Genel</CardTitle>
                <Badge variant={group.isActive ? 'success' : 'outline'}>
                  {group.isActive ? 'Aktif' : 'Pasif'}
                </Badge>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3">
                <Field label="Kod" value={group.code || '—'} mono />
                <Field
                  label="Üst grup"
                  value={
                    parent ? (
                      <Link to="/contacts/groups/$id" params={{ id: parent.id }} className="text-primary hover:underline">
                        {parent.name}
                      </Link>
                    ) : (
                      'Kök grup'
                    )
                  }
                />
                <Field label="Cari sayısı" value={<Badge variant="secondary">{group.contactCount}</Badge>} />
                <Field label="Durum" value={group.isActive ? 'Aktif' : 'Pasif'} />
                <Field label="Oluşturma" value={formatDateTime(group.createdAt)} />
                <Field label="Güncelleme" value={formatDateTime(group.updatedAt)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Alt gruplar ({subGroups.length})</CardTitle></CardHeader>
              <CardContent className="divide-y p-0">
                {subGroups.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted-foreground">Alt grup yok.</p>
                ) : (
                  subGroups.map((g) => (
                    <Link
                      key={g.id}
                      to="/contacts/groups/$id"
                      params={{ id: g.id }}
                      className="flex items-center justify-between px-4 py-3 hover:bg-accent/50"
                    >
                      <span className="flex items-center gap-2">
                        <span className="font-medium">{g.name}</span>
                        {g.code ? <span className="font-mono text-xs text-muted-foreground">{g.code}</span> : null}
                      </span>
                      <span className="flex items-center gap-2">
                        <Badge variant="secondary">{g.contactCount} cari</Badge>
                        <Badge variant={g.isActive ? 'success' : 'outline'}>{g.isActive ? 'Aktif' : 'Pasif'}</Badge>
                      </span>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>

            <section className="space-y-2">
              <h2 className="text-sm font-medium">Bu gruptaki cariler ({contacts.length})</h2>
              <DataGrid
                gridId="contacts.group.contacts"
                data={contacts}
                columns={columns}
                getRowId={(c) => c.id}
                loading={contactsQuery.isLoading}
                onRowClick={(c) => navigate({ to: '/contacts/contacts/$id', params: { id: c.id } })}
                emptyText="Bu grupta cari yok."
              />
            </section>
            </div>

            <ContactGroupDialog
              open={editOpen}
              onOpenChange={setEditOpen}
              editing={group}
              groups={allGroups}
              onSaved={invalidate}
            />
          </>
        )}
      </PageWrapper>
    </PermissionRequired>
  )
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
      <dt className="text-2xs tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className={`text-sm ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  )
}

function Breadcrumb({ id, name }: { id: string; name: string }) {
  useRegisterBreadcrumbLabel(`/contacts/groups/${id}`, name)
  return null
}

function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground">
      <p>Grup bulunamadı.</p>
      <Button variant="outline" onClick={() => navigate({ to: '/contacts/groups' })}>
        <ArrowLeft />
        Gruplara dön
      </Button>
    </div>
  )
}
