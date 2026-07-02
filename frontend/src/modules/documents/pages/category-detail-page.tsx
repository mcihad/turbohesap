import * as React from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, FolderPlus, Lock, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  DocumentsPermissions,
  toApiError,
  type DocumentDto,
  type DocumentFieldDef,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DataGrid, type ColumnDef } from '@/components/data-grid'
import { CategoryDialog } from '../components/category-dialog'
import { FieldDefBuilder } from '../components/field-def-builder'
import { expiryStatusBadgeVariant, expiryStatusLabel } from '../labels'

const ROUTE = '/_authed/documents/categories/$id'

export function CategoryDetailPage() {
  const { id } = useParams({ from: ROUTE })
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(DocumentsPermissions.categoriesRead)
  const canWrite = hasPermission(DocumentsPermissions.categoriesWrite)
  const canDocsRead = hasPermission(DocumentsPermissions.documentsRead)

  const query = useQuery({
    queryKey: ['documents', 'categories', id],
    queryFn: () => api.documents.categories.get(id),
    enabled: canRead && !!id,
  })
  const documentsQuery = useQuery({
    queryKey: ['documents', 'documents', { categoryId: id }],
    queryFn: () => api.documents.documents.list({ categoryId: id }),
    enabled: canDocsRead && !!id,
  })
  const allQuery = useQuery({
    queryKey: ['documents', 'categories'],
    queryFn: () => api.documents.categories.list(),
    enabled: canRead,
  })

  const [editOpen, setEditOpen] = React.useState(false)
  const [childOpen, setChildOpen] = React.useState(false)

  const category = query.data
  const all = allQuery.data ?? []
  const parent = category?.parentId ? all.find((c) => c.id === category.parentId) ?? null : null
  const children = React.useMemo(
    () => all.filter((c) => c.parentId === id).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'tr')),
    [all, id],
  )

  const refetch = () => qc.invalidateQueries({ queryKey: ['documents', 'categories'] })

  const fieldsSave = useMutation({
    mutationFn: (defs: DocumentFieldDef[]) => api.documents.categories.update(id, { fieldDefs: defs }),
    onSuccess: () => { toast.success('Alanlar kaydedildi'); refetch() },
    onError: (e) => toast.error('Alanlar kaydedilemedi', { description: toApiError(e).message }),
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.documents.categories.remove(id),
    onSuccess: () => { toast.success('Kategori silindi'); refetch(); navigate({ to: '/documents/categories' }) },
    onError: (e) => toast.error('Silinemedi', { description: toApiError(e).message }),
  })

  const documentColumns: ColumnDef<DocumentDto>[] = [
    { id: 'title', accessorKey: 'title', header: 'Başlık', size: 240, cell: ({ row }) => (
      <span className="inline-flex items-center gap-1.5 font-medium">
        {row.original.isPrivate ? <Lock className="size-3.5 shrink-0 text-muted-foreground" /> : null}
        {row.original.title}
      </span>
    ) },
    { id: 'code', accessorKey: 'code', header: 'Kod', size: 120, cell: ({ row }) => <span className="font-mono text-xs">{row.original.code || '—'}</span> },
    { id: 'expiryStatus', accessorKey: 'expiryStatus', header: 'Durum', size: 130, cell: ({ row }) => <Badge variant={expiryStatusBadgeVariant(row.original.expiryStatus)}>{expiryStatusLabel(row.original.expiryStatus)}</Badge> },
    { id: 'createdByName', accessorKey: 'createdByName', header: 'Oluşturan', size: 150, cell: ({ row }) => row.original.createdByName || '—' },
  ]

  return (
    <PermissionRequired permission={DocumentsPermissions.categoriesRead}>
      <PageWrapper>
        {query.isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : !category ? (
          <NotFound />
        ) : (
          <>
            <Breadcrumb id={category.id} name={category.name} />
            <PageHeader
              title={category.name}
              description={[category.code, parent?.name].filter(Boolean).join(' · ') || undefined}
              audit={{ entityType: 'DocumentCategory', entityId: category.id, title: 'Kategori denetim kaydı' }}
              actions={
                <div className="flex flex-wrap gap-2">
                  {canWrite ? (
                    <>
                      <Button size="sm" onClick={() => setEditOpen(true)}>
                        <Pencil />
                        Düzenle
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setChildOpen(true)}>
                        <FolderPlus />
                        Alt kategori
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (children.length) {
                            toast.error('Alt kategorileri olan kategori silinemez', { description: 'Önce alt kategorileri taşıyın veya silin.' })
                            return
                          }
                          if (confirm(`"${category.name}" silinsin mi?`)) deleteMutation.mutate()
                        }}
                      >
                        <Trash2 className="text-destructive" />
                        Sil
                      </Button>
                    </>
                  ) : null}
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/documents/categories">
                      <ArrowLeft />
                      Kategoriler
                    </Link>
                  </Button>
                </div>
              }
            />

            <Tabs defaultValue="genel" className="space-y-4">
              <TabsList className="flex-wrap">
                <TabsTrigger value="genel">Genel</TabsTrigger>
                <TabsTrigger value="evraklar">Evraklar ({documentsQuery.data?.length ?? 0})</TabsTrigger>
                <TabsTrigger value="alanlar">Özel alanlar ({category.fieldDefs.length})</TabsTrigger>
                <TabsTrigger value="alt">Alt kategoriler ({children.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="genel">
                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
                      <CardTitle className="text-sm">Genel</CardTitle>
                      <Badge variant={category.isActive ? 'success' : 'outline'}>
                        {category.isActive ? 'Aktif' : 'Pasif'}
                      </Badge>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3">
                      <Field label="Kod" value={category.code || '—'} mono />
                      <Field
                        label="Üst kategori"
                        value={
                          parent ? (
                            <Link to="/documents/categories/$id" params={{ id: parent.id }} className="text-primary hover:underline">
                              {parent.name}
                            </Link>
                          ) : (
                            'Kök kategori'
                          )
                        }
                      />
                      <Field label="Evrak sayısı" value={<Badge variant="secondary">{category.documentCount}</Badge>} />
                      <Field label="Sıra" value={String(category.sortOrder)} />
                      <Field label="Oluşturma" value={formatDateTime(category.createdAt)} />
                      <Field label="Güncelleme" value={formatDateTime(category.updatedAt)} />
                      <Field label="Açıklama" value={category.description || '—'} full />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex-row items-center gap-2 space-y-0">
                      <Lock className="size-4 text-muted-foreground" />
                      <CardTitle className="text-sm">Gizlilik</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3">
                      <Field label="Kişiye özel mi?" value={category.isPrivate ? 'Evet' : 'Hayır'} />
                      <Field label="Sahip" value={category.ownerName || '—'} />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="evraklar">
                <DataGrid
                  gridId="documents.category.documents"
                  data={documentsQuery.data ?? []}
                  columns={documentColumns}
                  getRowId={(d) => d.id}
                  loading={documentsQuery.isLoading}
                  onRowClick={(d) => navigate({ to: '/documents/documents/$id', params: { id: d.id } })}
                  emptyText="Bu kategoride evrak yok."
                />
              </TabsContent>

              <TabsContent value="alanlar">
                <Card>
                  <CardContent className="pt-6">
                    <fieldset disabled={!canWrite} className="disabled:opacity-80">
                      <FieldDefBuilder
                        value={category.fieldDefs}
                        onChange={(defs) => { if (canWrite) fieldsSave.mutate(defs) }}
                      />
                    </fieldset>
                    <p className="mt-3 text-2xs text-muted-foreground">
                      Alanlar otomatik kaydedilir — bu kategoriye eklenen evraklar bu alanları taşır.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="alt">
                <Card>
                  <CardContent className="divide-y p-0">
                    {children.length === 0 ? (
                      <p className="p-6 text-center text-sm text-muted-foreground">Alt kategori yok.</p>
                    ) : (
                      children.map((c) => (
                        <Link
                          key={c.id}
                          to="/documents/categories/$id"
                          params={{ id: c.id }}
                          className="flex items-center justify-between px-4 py-3 hover:bg-accent/50"
                        >
                          <span className="flex items-center gap-2">
                            {c.isPrivate ? <Lock className="size-3.5 text-muted-foreground" /> : null}
                            <span className="font-medium">{c.name}</span>
                            {c.code ? <span className="font-mono text-xs text-muted-foreground">{c.code}</span> : null}
                          </span>
                          <span className="flex items-center gap-2">
                            <Badge variant="secondary">{c.documentCount} evrak</Badge>
                            <Badge variant={c.isActive ? 'success' : 'outline'}>{c.isActive ? 'Aktif' : 'Pasif'}</Badge>
                          </span>
                        </Link>
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <CategoryDialog
              open={editOpen}
              onOpenChange={setEditOpen}
              editing={category}
              categories={all}
              onSaved={refetch}
            />
            <CategoryDialog
              open={childOpen}
              onOpenChange={setChildOpen}
              editing={null}
              defaultParentId={category.id}
              categories={all}
              onSaved={refetch}
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
  useRegisterBreadcrumbLabel(`/documents/categories/${id}`, name)
  return null
}

function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground">
      <p>Kategori bulunamadı.</p>
      <Button variant="outline" onClick={() => navigate({ to: '/documents/categories' })}>
        <ArrowLeft />
        Kategorilere dön
      </Button>
    </div>
  )
}
