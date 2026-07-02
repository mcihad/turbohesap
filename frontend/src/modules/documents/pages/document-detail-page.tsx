import * as React from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Lock, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  DocumentsPermissions,
  effectiveDocumentFieldDefsWithSource,
  toApiError,
  type DocumentDto,
  type DocumentFieldDef,
  type SourcedDocumentFieldDef,
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
import { FileManager } from '@/modules/files/components/file-manager'
import { DocumentFormDialog } from '../components/document-form-dialog'
import { expiryStatusBadgeVariant, expiryStatusLabel } from '../labels'

const ROUTE = '/_authed/documents/documents/$id'
const FILES_ENTITY_TYPE = 'Document'

export function DocumentDetailPage() {
  const { id } = useParams({ from: ROUTE })
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { hasPermission, user } = useAuth()
  const canRead = hasPermission(DocumentsPermissions.documentsRead)
  const canWrite = hasPermission(DocumentsPermissions.documentsWrite)
  const canDelete = hasPermission(DocumentsPermissions.documentsDelete)
  const canFiles = hasPermission(DocumentsPermissions.documentsWrite)
  const canManagePrivacy = hasPermission(DocumentsPermissions.privateManage)

  const query = useQuery({
    queryKey: ['documents', 'documents', id],
    queryFn: () => api.documents.documents.get(id),
    enabled: canRead && !!id,
  })
  const categoriesQuery = useQuery({
    queryKey: ['documents', 'categories'],
    queryFn: () => api.documents.categories.list(),
    enabled: hasPermission(DocumentsPermissions.categoriesRead),
  })

  const [editOpen, setEditOpen] = React.useState(false)
  const document = query.data
  const refetch = () => qc.invalidateQueries({ queryKey: ['documents', 'documents'] })

  const deleteMutation = useMutation({
    mutationFn: () => api.documents.documents.remove(id),
    onSuccess: () => { toast.success('Evrak silindi'); refetch(); navigate({ to: '/documents/documents' }) },
    onError: (e) => toast.error('Silinemedi', { description: toApiError(e).message }),
  })

  const dynamicFields = React.useMemo(
    () => (document ? effectiveDocumentFieldDefsWithSource(document.categoryId, categoriesQuery.data ?? []) : []),
    [document, categoriesQuery.data],
  )

  const canSeeGizlilik = !!document && (document.ownerId === user?.id || canManagePrivacy || document.isPrivate)

  return (
    <PermissionRequired permission={DocumentsPermissions.documentsRead}>
      <PageWrapper>
        {query.isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : !document ? (
          <NotFound />
        ) : (
          <>
            <Breadcrumb id={document.id} name={document.title} />
            <PageHeader
              title={document.title}
              description={[document.code, document.categoryName].filter(Boolean).join(' · ') || undefined}
              audit={{ entityType: 'Document', entityId: document.id, title: 'Evrak denetim kaydı' }}
              actions={
                <div className="flex flex-wrap gap-2">
                  {canWrite ? (
                    <Button size="sm" onClick={() => setEditOpen(true)}>
                      <Pencil />
                      Düzenle
                    </Button>
                  ) : null}
                  {canDelete ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm(`"${document.title}" silinsin mi?`)) deleteMutation.mutate()
                      }}
                    >
                      <Trash2 className="text-destructive" />
                      Sil
                    </Button>
                  ) : null}
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/documents/documents">
                      <ArrowLeft />
                      Evraklar
                    </Link>
                  </Button>
                </div>
              }
            />

            <DocumentTabs
              document={document}
              dynamicFields={dynamicFields}
              canFiles={canFiles}
              canSeeGizlilik={canSeeGizlilik}
            />

            <DocumentFormDialog
              open={editOpen}
              onOpenChange={setEditOpen}
              editing={document}
              categories={categoriesQuery.data ?? []}
              onSaved={refetch}
            />
          </>
        )}
      </PageWrapper>
    </PermissionRequired>
  )
}

function DocumentTabs({
  document,
  dynamicFields,
  canFiles,
  canSeeGizlilik,
}: {
  document: DocumentDto
  dynamicFields: SourcedDocumentFieldDef[]
  canFiles: boolean
  canSeeGizlilik: boolean
}) {
  return (
    <Tabs defaultValue="genel" className="space-y-4">
      <TabsList className="flex-wrap">
        <TabsTrigger value="genel">Genel</TabsTrigger>
        <TabsTrigger value="dosyalar">Dosyalar ({document.fileCount})</TabsTrigger>
        {canSeeGizlilik ? <TabsTrigger value="gizlilik">Gizlilik</TabsTrigger> : null}
      </TabsList>

      <TabsContent value="genel">
        <Overview document={document} dynamicFields={dynamicFields} />
      </TabsContent>

      <TabsContent value="dosyalar">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-sm">Görseller</CardTitle></CardHeader>
            <CardContent>
              <FileManager entityType={FILES_ENTITY_TYPE} entityId={document.id} kind="image" canWrite={canFiles} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Dosyalar</CardTitle></CardHeader>
            <CardContent>
              <FileManager entityType={FILES_ENTITY_TYPE} entityId={document.id} kind="file" canWrite={canFiles} />
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {canSeeGizlilik ? (
        <TabsContent value="gizlilik">
          <Card>
            <CardHeader className="flex-row items-center gap-2 space-y-0">
              <Lock className="size-4 text-muted-foreground" />
              <CardTitle className="text-sm">Gizlilik</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3">
              <Field label="Kişiye özel mi?" value={document.isPrivate ? 'Evet' : 'Hayır'} />
              <Field label="Sahip" value={document.ownerName || '—'} />
            </CardContent>
          </Card>
        </TabsContent>
      ) : null}
    </Tabs>
  )
}

function Overview({
  document,
  dynamicFields,
}: {
  document: DocumentDto
  dynamicFields: SourcedDocumentFieldDef[]
}) {
  const groups = new Map<string, SourcedDocumentFieldDef[]>()
  for (const f of dynamicFields) {
    const key = f.sourceName || 'Özellikler'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(f)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-sm">Genel</CardTitle>
          <Badge variant={expiryStatusBadgeVariant(document.expiryStatus)}>
            {expiryStatusLabel(document.expiryStatus)}
          </Badge>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3">
          <Field label="Kod" value={document.code || '—'} mono />
          <Field label="Kategori" value={document.categoryName || '—'} />
          <Field
            label="Etiketler"
            value={
              document.tags.length
                ? <div className="flex flex-wrap gap-1">{document.tags.map((t) => <Badge key={t} variant="outline" className="text-2xs">{t}</Badge>)}</div>
                : '—'
            }
            full
          />
          <Field label="Oluşturan" value={document.createdByName || '—'} />
          <Field label="Oluşturma" value={formatDateTime(document.createdAt)} />
          <Field label="Güncelleme" value={formatDateTime(document.updatedAt)} />
          <Field label="Açıklama" value={document.description || '—'} full />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Süreli takip</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3">
          <Field label="Süreli evrak mı?" value={document.isTimeBound ? 'Evet' : 'Hayır'} />
          {document.isTimeBound ? (
            <>
              <Field label="Düzenlenme tarihi" value={document.issueDate ? formatDate(document.issueDate) : '—'} />
              <Field label="Son geçerlilik tarihi" value={document.expiryDate ? formatDate(document.expiryDate) : '—'} />
              <Field label="Hatırlatma" value={document.reminderDaysBefore != null ? `${document.reminderDaysBefore} gün önce` : '—'} />
            </>
          ) : null}
        </CardContent>
      </Card>

      {dynamicFields.length ? (
        [...groups.entries()].map(([source, defs]) => (
          <Card key={source}>
            <CardHeader>
              <CardTitle className="text-sm">{source}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3">
              {defs.map((s) => (
                <Field key={s.def.key} label={s.def.label} value={formatAttr(s.def, document.attributes[s.def.key])} />
              ))}
            </CardContent>
          </Card>
        ))
      ) : null}
    </div>
  )
}

function formatAttr(def: DocumentFieldDef, value: unknown): React.ReactNode {
  if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) return '—'
  switch (def.type) {
    case 'boolean':
      return value ? 'Evet' : 'Hayır'
    case 'money':
      return `${Number(value).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ${def.currency || 'TRY'}`
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
  useRegisterBreadcrumbLabel(`/documents/documents/${id}`, name)
  return null
}

function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground">
      <p>Evrak bulunamadı.</p>
      <Button variant="outline" onClick={() => navigate({ to: '/documents/documents' })}>
        <ArrowLeft />
        Evraklara dön
      </Button>
    </div>
  )
}
