import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Lock, Plus, SlidersHorizontal, User, X } from 'lucide-react'

import {
  DocumentsPermissions,
  type DocumentDto,
  type DocumentExpiryStatus,
  type DocumentListQuery,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { formatDateTime } from '@/lib/datetime'
import { PageWrapper } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { DataGrid, type ColumnDef } from '@/components/data-grid'
import { CategoryTreeSelect } from '../components/category-tree-select'
import { DocumentFormDialog } from '../components/document-form-dialog'
import { expiryStatusBadgeVariant, expiryStatusLabel } from '../labels'

interface UiFilters {
  categoryId: string | null
  tags: string[]
  expiryStatus: DocumentExpiryStatus | undefined
  mine: boolean
  isPrivate: boolean
  search: string
}

const EMPTY_FILTERS: UiFilters = {
  categoryId: null,
  tags: [],
  expiryStatus: undefined,
  mine: false,
  isPrivate: false,
  search: '',
}

export function DocumentsPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canWrite = hasPermission(DocumentsPermissions.documentsWrite)
  const canSeePrivateOfOthers = hasPermission(DocumentsPermissions.privateReadAll)

  const [filters, setFilters] = React.useState<UiFilters>(EMPTY_FILTERS)
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<DocumentDto | null>(null)

  const categoriesQuery = useQuery({
    queryKey: ['documents', 'categories'],
    queryFn: () => api.documents.categories.list(),
    enabled: hasPermission(DocumentsPermissions.categoriesRead),
  })
  const tagsQuery = useQuery({
    queryKey: ['documents', 'tags'],
    queryFn: () => api.documents.tags.list(),
    enabled: hasPermission(DocumentsPermissions.documentsRead),
  })

  // The API filters by a single `tag`; extra selected tags are narrowed
  // client-side below (a document must carry ALL selected tags).
  const query: DocumentListQuery = {
    categoryId: filters.categoryId ?? undefined,
    tag: filters.tags[0],
    expiryStatus: filters.expiryStatus,
    mine: filters.mine || undefined,
    isPrivate: canSeePrivateOfOthers && filters.isPrivate ? true : undefined,
    search: filters.search.trim() || undefined,
  }

  const docsQuery = useQuery({
    queryKey: ['documents', 'documents', query],
    queryFn: () => api.documents.documents.list(query),
    enabled: hasPermission(DocumentsPermissions.documentsRead),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['documents', 'documents'] })

  const extraTags = filters.tags.slice(1)
  const rows = React.useMemo(() => {
    const all = docsQuery.data ?? []
    if (extraTags.length === 0) return all
    return all.filter((d) => extraTags.every((t) => d.tags.includes(t)))
  }, [docsQuery.data, extraTags])

  const advCount =
    (filters.categoryId ? 1 : 0) +
    (filters.tags.length > 0 ? 1 : 0) +
    (filters.expiryStatus ? 1 : 0) +
    (filters.mine ? 1 : 0) +
    (filters.isPrivate ? 1 : 0)

  const columns: ColumnDef<DocumentDto>[] = [
    {
      id: 'title', accessorKey: 'title', header: 'Başlık', size: 260,
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1.5 font-medium">
          {row.original.isPrivate ? <Lock className="size-3.5 shrink-0 text-muted-foreground" /> : null}
          {row.original.title}
        </span>
      ),
    },
    { id: 'category', accessorFn: (d) => d.categoryName ?? '', header: 'Kategori', size: 160, enableGrouping: true, cell: ({ row }) => row.original.categoryName ? <Badge variant="secondary">{row.original.categoryName}</Badge> : <span className="text-muted-foreground">—</span> },
    {
      id: 'tags', accessorFn: (d) => d.tags.join(', '), header: 'Etiketler', size: 200, enableSorting: false,
      cell: ({ row }) => row.original.tags.length
        ? <div className="flex flex-wrap gap-1">{row.original.tags.map((t) => <Badge key={t} variant="outline" className="text-2xs">{t}</Badge>)}</div>
        : <span className="text-muted-foreground">—</span>,
    },
    { id: 'expiryStatus', accessorKey: 'expiryStatus', header: 'Durum', size: 130, enableGrouping: true, cell: ({ row }) => <Badge variant={expiryStatusBadgeVariant(row.original.expiryStatus)}>{expiryStatusLabel(row.original.expiryStatus)}</Badge> },
    { id: 'fileCount', accessorKey: 'fileCount', header: 'Dosya', size: 80, cell: ({ row }) => <span className="tabular-nums">{row.original.fileCount}</span> },
    { id: 'createdByName', accessorKey: 'createdByName', header: 'Oluşturan', size: 150, cell: ({ row }) => row.original.createdByName || '—' },
    { id: 'updatedAt', accessorKey: 'updatedAt', header: 'Güncelleme', size: 150, cell: ({ row }) => formatDateTime(row.original.updatedAt) },
  ]

  return (
    <PermissionRequired permission={DocumentsPermissions.documentsRead}>
      <PageWrapper className="flex h-full flex-col gap-3">
        <DataGrid
          fillHeight
          gridId="documents.documents"
          data={rows}
          columns={columns}
          getRowId={(d) => d.id}
          loading={docsQuery.isLoading}
          onRowClick={(d) => navigate({ to: '/documents/documents/$id', params: { id: d.id } })}
          emptyText={advCount > 0 || filters.search ? 'Filtreyle eşleşen evrak yok.' : 'Evrak yok.'}
          search={{
            value: filters.search,
            onChange: (v) => setFilters((f) => ({ ...f, search: v })),
            placeholder: 'Başlık, kod veya açıklama…',
          }}
          toolbar={
            <>
              {advCount > 0 ? (
                <Button variant="ghost" size="sm" onClick={() => setFilters((f) => ({ ...EMPTY_FILTERS, search: f.search }))} className="gap-1.5">
                  <X className="size-4" />
                  <span className="hidden sm:inline">Filtreleri temizle</span>
                </Button>
              ) : null}

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={advCount > 0 ? 'default' : 'outline'} size="sm" className="gap-1.5">
                    <SlidersHorizontal className="size-4" />
                    <span className="hidden sm:inline">Gelişmiş filtre</span>
                    {advCount ? <Badge variant="secondary" className="px-1.5">{advCount}</Badge> : null}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Kategori</Label>
                    <CategoryTreeSelect value={filters.categoryId} onChange={(id) => setFilters((f) => ({ ...f, categoryId: id }))} />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Durum</Label>
                    <Select
                      value={filters.expiryStatus ?? '__all__'}
                      onValueChange={(v) => setFilters((f) => ({ ...f, expiryStatus: v === '__all__' ? undefined : (v as DocumentExpiryStatus) }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">Hepsi</SelectItem>
                        <SelectItem value="active">Aktif</SelectItem>
                        <SelectItem value="expiring_soon">Yaklaşıyor</SelectItem>
                        <SelectItem value="expired">Süresi doldu</SelectItem>
                        <SelectItem value="none">Süresiz</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Etiketler</Label>
                    {(tagsQuery.data ?? []).length === 0 ? (
                      <p className="text-xs text-muted-foreground">Henüz etiket yok.</p>
                    ) : (
                      <div className="max-h-40 space-y-0.5 overflow-y-auto">
                        {(tagsQuery.data ?? []).map((t) => (
                          <label key={t} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-accent">
                            <Checkbox
                              checked={filters.tags.includes(t)}
                              onCheckedChange={() =>
                                setFilters((f) => ({
                                  ...f,
                                  tags: f.tags.includes(t) ? f.tags.filter((x) => x !== t) : [...f.tags, t],
                                }))
                              }
                            />
                            <span className="truncate">{t}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <label className="flex items-center justify-between gap-2 text-sm">
                    <span className="inline-flex items-center gap-1.5"><User className="size-3.5" />Sadece benim evraklarım</span>
                    <Switch checked={filters.mine} onCheckedChange={(v) => setFilters((f) => ({ ...f, mine: v }))} />
                  </label>

                  {canSeePrivateOfOthers ? (
                    <label className="flex items-center justify-between gap-2 text-sm">
                      <span className="inline-flex items-center gap-1.5"><Lock className="size-3.5" />Kişiye özel olanları göster</span>
                      <Switch checked={filters.isPrivate} onCheckedChange={(v) => setFilters((f) => ({ ...f, isPrivate: v }))} />
                    </label>
                  ) : null}
                </PopoverContent>
              </Popover>

              {canWrite ? (
                <Button size="sm" onClick={() => { setEditing(null); setOpen(true) }}>
                  <Plus />
                  <span className="hidden sm:inline">Yeni evrak</span>
                </Button>
              ) : null}
            </>
          }
        />

        <DocumentFormDialog
          open={open}
          onOpenChange={setOpen}
          editing={editing}
          categories={categoriesQuery.data ?? []}
          onSaved={invalidate}
        />
      </PageWrapper>
    </PermissionRequired>
  )
}
