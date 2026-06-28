import * as React from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, FolderPlus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  FilesPermissions,
  InventoryPermissions,
  toApiError,
  type CategoryFieldDef,
  type ProductDto,
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
import { FileManager } from '@/modules/files/components/file-manager'
import { CategoryDialog } from '../components/category-dialog'
import { FieldDefBuilder } from '../components/field-def-builder'
import { money } from '../labels'

const ROUTE = '/_authed/inventory/categories/$id'

export function CategoryDetailPage() {
  const { id } = useParams({ from: ROUTE })
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(InventoryPermissions.categoriesRead)
  const canWrite = hasPermission(InventoryPermissions.categoriesWrite)
  const canFiles = hasPermission(FilesPermissions.write)
  const canProductsRead = hasPermission(InventoryPermissions.productsRead)

  const query = useQuery({
    queryKey: ['inventory', 'categories', id],
    queryFn: () => api.inventory.categories.get(id),
    enabled: canRead && !!id,
  })
  const productsQuery = useQuery({
    queryKey: ['inventory', 'products', { categoryId: id }],
    queryFn: () => api.inventory.products.list(id),
    enabled: canProductsRead && !!id,
  })
  const allQuery = useQuery({
    queryKey: ['inventory', 'categories'],
    queryFn: () => api.inventory.categories.list(),
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

  const refetch = () => qc.invalidateQueries({ queryKey: ['inventory', 'categories'] })

  const fieldsSave = useMutation({
    mutationFn: (defs: CategoryFieldDef[]) => api.inventory.categories.update(id, { fieldDefs: defs }),
    onSuccess: () => { toast.success('Alanlar kaydedildi'); refetch() },
    onError: (e) => toast.error('Alanlar kaydedilemedi', { description: toApiError(e).message }),
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.inventory.categories.remove(id),
    onSuccess: () => { toast.success('Kategori silindi'); refetch(); navigate({ to: '/inventory/categories' }) },
    onError: (e) => toast.error('Silinemedi', { description: toApiError(e).message }),
  })

  const productColumns: ColumnDef<ProductDto>[] = [
    { id: 'code', accessorKey: 'code', header: 'Kod', size: 120, cell: ({ row }) => <span className="font-mono text-xs">{row.original.code}</span> },
    { id: 'name', accessorKey: 'name', header: 'Ad', size: 240, cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { id: 'brand', accessorKey: 'brand', header: 'Marka', size: 130, cell: ({ row }) => row.original.brand || '—' },
    { id: 'salePrice', accessorKey: 'salePrice', header: 'Satış', size: 120, cell: ({ row }) => <span className="block text-right tabular-nums">{money(row.original.salePrice, row.original.currency)}</span> },
    { id: 'totalStock', accessorKey: 'totalStock', header: 'Stok', size: 110, cell: ({ row }) => <span className="block text-right tabular-nums">{row.original.totalStock}{row.original.unit ? ` ${row.original.unit}` : ''}</span> },
    { id: 'isActive', accessorKey: 'isActive', header: 'Durum', size: 100, cell: ({ row }) => <Badge variant={row.original.isActive ? 'success' : 'outline'}>{row.original.isActive ? 'Aktif' : 'Pasif'}</Badge> },
  ]

  return (
    <PermissionRequired permission={InventoryPermissions.categoriesRead}>
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
              audit={{ entityType: 'Category', entityId: category.id, title: 'Kategori denetim kaydı' }}
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
                    <Link to="/inventory/categories">
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
                <TabsTrigger value="urunler">Ürünler ({productsQuery.data?.length ?? 0})</TabsTrigger>
                <TabsTrigger value="medya">Görseller</TabsTrigger>
                <TabsTrigger value="alanlar">Özel alanlar ({category.fieldDefs.length})</TabsTrigger>
                <TabsTrigger value="alt">Alt kategoriler ({children.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="genel">
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
                          <Link to="/inventory/categories/$id" params={{ id: parent.id }} className="text-primary hover:underline">
                            {parent.name}
                          </Link>
                        ) : (
                          'Kök kategori'
                        )
                      }
                    />
                    <Field label="Ürün sayısı" value={<Badge variant="secondary">{category.productCount}</Badge>} />
                    <Field label="Sıra" value={String(category.sortOrder)} />
                    <Field label="Oluşturma" value={formatDateTime(category.createdAt)} />
                    <Field label="Güncelleme" value={formatDateTime(category.updatedAt)} />
                    <Field label="Açıklama" value={category.description || '—'} full />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="urunler">
                <DataGrid
                  gridId="inventory.category.products"
                  data={productsQuery.data ?? []}
                  columns={productColumns}
                  getRowId={(p) => p.id}
                  loading={productsQuery.isLoading}
                  onRowClick={(p) => navigate({ to: '/inventory/products/$id', params: { id: p.id } })}
                  emptyText="Bu kategoride ürün yok."
                />
              </TabsContent>

              <TabsContent value="medya">
                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Görseller</CardTitle></CardHeader>
                    <CardContent>
                      <FileManager entityType="Category" entityId={category.id} kind="image" canWrite={canFiles} />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Dosyalar</CardTitle></CardHeader>
                    <CardContent>
                      <FileManager entityType="Category" entityId={category.id} kind="file" canWrite={canFiles} />
                    </CardContent>
                  </Card>
                </div>
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
                      Alanlar otomatik kaydedilir — bu kategoriye eklenen ürünler bu alanları taşır.
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
                          to="/inventory/categories/$id"
                          params={{ id: c.id }}
                          className="flex items-center justify-between px-4 py-3 hover:bg-accent/50"
                        >
                          <span className="flex items-center gap-2">
                            <span className="font-medium">{c.name}</span>
                            {c.code ? <span className="font-mono text-xs text-muted-foreground">{c.code}</span> : null}
                          </span>
                          <span className="flex items-center gap-2">
                            <Badge variant="secondary">{c.productCount} ürün</Badge>
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
  useRegisterBreadcrumbLabel(`/inventory/categories/${id}`, name)
  return null
}

function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground">
      <p>Kategori bulunamadı.</p>
      <Button variant="outline" onClick={() => navigate({ to: '/inventory/categories' })}>
        <ArrowLeft />
        Kategorilere dön
      </Button>
    </div>
  )
}
