import * as React from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Pencil } from 'lucide-react'

import {
  FilesPermissions,
  InventoryPermissions,
  effectiveFieldDefsWithSource,
  type CategoryFieldDef,
  type ProductDto,
  type SourcedFieldDef,
} from '@turbohesap/shared'

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProductFormDialog } from '../components/product-form-dialog'
import { VariantsTab } from '../components/product-detail/variants-tab'
import { StockTab } from '../components/product-detail/stock-tab'
import { ChannelPricesTab } from '../components/product-detail/channel-prices-tab'
import { PackagingsTab } from '../components/product-detail/packagings-tab'
import { FileManager } from '@/modules/files/components/file-manager'
import { money, productTypeLabel } from '../labels'

const ROUTE = '/_authed/inventory/products/$id'

export function ProductDetailPage() {
  const { id } = useParams({ from: ROUTE })
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(InventoryPermissions.productsRead)
  const canWrite = hasPermission(InventoryPermissions.productsWrite)
  const canStock = hasPermission(InventoryPermissions.productsStock)
  const canFiles = hasPermission(FilesPermissions.write)

  const query = useQuery({
    queryKey: ['inventory', 'products', id],
    queryFn: () => api.inventory.products.get(id),
    enabled: canRead,
  })
  const categoriesQuery = useQuery({
    queryKey: ['inventory', 'categories'],
    queryFn: () => api.inventory.categories.list(),
    enabled: hasPermission(InventoryPermissions.categoriesRead),
  })

  const [editOpen, setEditOpen] = React.useState(false)
  const product = query.data
  const refetch = () => qc.invalidateQueries({ queryKey: ['inventory', 'products'] })

  const dynamicFields = React.useMemo(
    () => (product ? effectiveFieldDefsWithSource(product.categoryId, categoriesQuery.data ?? []) : []),
    [product, categoriesQuery.data],
  )

  return (
    <PermissionRequired permission={InventoryPermissions.productsRead}>
      <PageWrapper>
        {query.isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : !product ? (
          <NotFound />
        ) : (
          <>
            <Breadcrumb id={product.id} name={product.name} />
            <PageHeader
              title={product.name}
              description={[
                product.code,
                productTypeLabel(product.type),
                product.category?.name,
              ].filter(Boolean).join(' · ')}
              audit={{
                entityType: 'Product',
                entityId: product.id,
                title: 'Ürün denetim kaydı',
              }}
              actions={
                <div className="flex gap-2">
                  {canWrite ? (
                    <Button size="sm" onClick={() => setEditOpen(true)}>
                      <Pencil />
                      Düzenle
                    </Button>
                  ) : null}
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/inventory/products">
                      <ArrowLeft />
                      Ürünler
                    </Link>
                  </Button>
                </div>
              }
            />

            <ProductTabs
              product={product}
              dynamicFields={dynamicFields}
              canWrite={canWrite}
              canStock={canStock}
              canFiles={canFiles}
              refetch={refetch}
            />

            <ProductFormDialog
              open={editOpen}
              onOpenChange={setEditOpen}
              editing={product}
              categories={categoriesQuery.data ?? []}
              onSaved={refetch}
            />
          </>
        )}
      </PageWrapper>
    </PermissionRequired>
  )
}

function ProductTabs({
  product,
  dynamicFields,
  canWrite,
  canStock,
  canFiles,
  refetch,
}: {
  product: ProductDto
  dynamicFields: SourcedFieldDef[]
  canWrite: boolean
  canStock: boolean
  canFiles: boolean
  refetch: () => void
}) {
  const tabs = [
    { value: 'genel', label: 'Genel' },
    { value: 'medya', label: 'Medya' },
    ...(dynamicFields.length ? [{ value: 'ozellikler', label: 'Özellikler' }] : []),
    ...(product.hasVariants ? [{ value: 'varyantlar', label: `Varyantlar (${product.variantCount})` }] : []),
    ...(product.trackStock ? [{ value: 'stok', label: 'Stok' }] : []),
    { value: 'fiyatlar', label: 'Kanal fiyatları' },
    { value: 'paketler', label: 'Paketler' },
  ]

  return (
    <Tabs defaultValue="genel" className="space-y-4">
      <TabsList className="flex-wrap">
        {tabs.map((t) => (
          <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="genel">
        <Overview product={product} />
      </TabsContent>

      <TabsContent value="medya">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-sm">Görseller</CardTitle></CardHeader>
            <CardContent>
              <FileManager entityType="Product" entityId={product.id} kind="image" canWrite={canFiles} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Dosyalar</CardTitle></CardHeader>
            <CardContent>
              <FileManager entityType="Product" entityId={product.id} kind="file" canWrite={canFiles} />
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {dynamicFields.length ? (
        <TabsContent value="ozellikler">
          <AttributesView fields={dynamicFields} values={product.attributes} />
        </TabsContent>
      ) : null}

      {product.hasVariants ? (
        <TabsContent value="varyantlar">
          <VariantsTab product={product} canWrite={canWrite} refetch={refetch} />
        </TabsContent>
      ) : null}

      {product.trackStock ? (
        <TabsContent value="stok">
          <StockTab product={product} canStock={canStock} refetch={refetch} />
        </TabsContent>
      ) : null}

      <TabsContent value="fiyatlar">
        <ChannelPricesTab product={product} canWrite={canWrite} refetch={refetch} />
      </TabsContent>

      <TabsContent value="paketler">
        <PackagingsTab product={product} canWrite={canWrite} refetch={refetch} />
      </TabsContent>
    </Tabs>
  )
}

function Overview({ product }: { product: ProductDto }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-sm">Genel</CardTitle>
          <Badge variant={product.isActive ? 'success' : 'outline'}>
            {product.isActive ? 'Aktif' : 'Pasif'}
          </Badge>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3">
          <Field label="Stok kodu" value={product.code} mono />
          <Field label="Tür" value={productTypeLabel(product.type)} />
          <Field label="Kategori" value={product.category?.name || '—'} />
          <Field label="Marka" value={product.brand || '—'} />
          <Field label="Birim" value={product.unit || '—'} />
          <Field label="Barkod" value={product.barcode || '—'} mono />
          <Field label="Ağırlık" value={product.weight == null ? '—' : `${product.weight} kg`} />
          <Field label="Stok takibi" value={product.trackStock ? 'Açık' : 'Kapalı'} />
          <Field label="Açıklama" value={product.description || '—'} full />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Fiyat ve stok</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3">
          <Field label="Satış fiyatı" value={money(product.salePrice, product.currency)} />
          <Field label="Alış fiyatı" value={money(product.purchasePrice, product.currency)} />
          <Field label="KDV" value={product.taxRate == null ? '—' : `%${product.taxRate}`} />
          <Field label="Para birimi" value={product.currency} />
          <Field
            label="Toplam stok"
            value={
              product.trackStock
                ? `${product.totalStock}${product.unit ? ` ${product.unit}` : ''}`
                : '—'
            }
          />
          <Field label="Min. stok" value={String(product.minQuantity)} />
          <Field label="Oluşturma" value={formatDateTime(product.createdAt)} />
          <Field label="Güncelleme" value={formatDateTime(product.updatedAt)} />
        </CardContent>
      </Card>
    </div>
  )
}

// --- Category attribute display ------------------------------------------
function AttributesView({
  fields,
  values,
}: {
  fields: SourcedFieldDef[]
  values: Record<string, unknown>
}) {
  // Group by source category so inherited fields are visually separated.
  const groups = new Map<string, SourcedFieldDef[]>()
  for (const f of fields) {
    const key = f.sourceName || 'Özellikler'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(f)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {[...groups.entries()].map(([source, defs]) => (
        <Card key={source}>
          <CardHeader>
            <CardTitle className="text-sm">{source}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3">
            {defs.map((s) => (
              <Field key={s.def.key} label={s.def.label} value={formatAttr(s.def, values[s.def.key])} />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function formatAttr(def: CategoryFieldDef, value: unknown): React.ReactNode {
  if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) return '—'
  switch (def.type) {
    case 'boolean':
      return value ? 'Evet' : 'Hayır'
    case 'money':
      return money(Number(value), def.currency || 'TRY')
    case 'number':
      return `${value}${def.unit ? ` ${def.unit}` : ''}`
    case 'date':
      return formatDate(String(value))
    case 'daterange': {
      const v = value as { from?: string; to?: string }
      const from = v.from ? formatDate(v.from) : '?'
      const to = v.to ? formatDate(v.to) : '?'
      return `${from} – ${to}`
    }
    case 'multiselect':
      return Array.isArray(value) ? (value as string[]).join(', ') : String(value)
    default:
      return String(value)
  }
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
  useRegisterBreadcrumbLabel(`/inventory/products/${id}`, name)
  return null
}

function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground">
      <p>Ürün bulunamadı.</p>
      <Button variant="outline" onClick={() => navigate({ to: '/inventory/products' })}>
        <ArrowLeft />
        Ürünlere dön
      </Button>
    </div>
  )
}
