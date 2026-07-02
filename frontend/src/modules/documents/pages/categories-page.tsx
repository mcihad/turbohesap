import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FolderPlus, Lock, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { DocumentsPermissions, toApiError, type DocumentCategoryDto } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { PageWrapper } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataGrid, type ColumnDef } from '@/components/data-grid'
import { CategoryDialog } from '../components/category-dialog'

interface CatNode extends DocumentCategoryDto {
  children: CatNode[]
}

function buildNested(cats: DocumentCategoryDto[]): CatNode[] {
  const byParent = new Map<string | null, DocumentCategoryDto[]>()
  for (const c of cats) {
    const arr = byParent.get(c.parentId) ?? []
    arr.push(c)
    byParent.set(c.parentId, arr)
  }
  const make = (parentId: string | null): CatNode[] =>
    (byParent.get(parentId) ?? [])
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'tr'))
      .map((c) => ({ ...c, children: make(c.id) }))
  return make(null)
}

export function CategoriesPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canWrite = hasPermission(DocumentsPermissions.categoriesWrite)

  // Dialog state: { editing, parentId } drives create-root / create-child / edit.
  const [dialog, setDialog] = React.useState<
    { editing: DocumentCategoryDto | null; parentId: string | null } | null
  >(null)
  // Briefly highlight a just-saved row so the change is obvious in place.
  const [highlightId, setHighlightId] = React.useState<string | null>(null)
  const highlightTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const flash = (id: string) => {
    setHighlightId(id)
    if (highlightTimer.current) clearTimeout(highlightTimer.current)
    highlightTimer.current = setTimeout(() => setHighlightId(null), 1600)
  }
  React.useEffect(() => () => { if (highlightTimer.current) clearTimeout(highlightTimer.current) }, [])

  const catsQuery = useQuery({
    queryKey: ['documents', 'categories'],
    queryFn: () => api.documents.categories.list(),
    enabled: hasPermission(DocumentsPermissions.categoriesRead),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['documents', 'categories'] })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.documents.categories.remove(id),
    onSuccess: () => { toast.success('Kategori silindi'); void invalidate() },
    onError: (e) => toast.error('Silinemedi', { description: toApiError(e).message }),
  })

  const cats = catsQuery.data ?? []
  const roots = React.useMemo(() => buildNested(cats), [cats])

  const columns: ColumnDef<CatNode>[] = [
    {
      id: 'name', accessorKey: 'name', header: 'Kategori', size: 280,
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1.5 font-medium">
          {row.original.isPrivate ? <Lock className="size-3.5 shrink-0 text-muted-foreground" /> : null}
          {row.original.name}
        </span>
      ),
    },
    { id: 'code', accessorKey: 'code', header: 'Kod', size: 120, cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.code || '—'}</span> },
    { id: 'documentCount', accessorKey: 'documentCount', header: 'Evrak', size: 90, cell: ({ row }) => <Badge variant="secondary">{row.original.documentCount}</Badge> },
    { id: 'fields', header: 'Özel alan', size: 100, accessorFn: (c) => c.fieldDefs.length, cell: ({ row }) => <span className="tabular-nums text-muted-foreground">{row.original.fieldDefs.length}</span> },
    { id: 'isActive', accessorKey: 'isActive', header: 'Durum', size: 100, enableGrouping: true, cell: ({ row }) => <Badge variant={row.original.isActive ? 'success' : 'outline'}>{row.original.isActive ? 'Aktif' : 'Pasif'}</Badge> },
    ...(canWrite
      ? [{
          id: 'actions', header: '', size: 130, enableSorting: false, enableHiding: false, enableColumnFilter: false, enableGrouping: false,
          cell: ({ row }) => (
            <div className="flex justify-end gap-1">
              <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); setDialog({ editing: null, parentId: row.original.id }) }} title="Alt kategori ekle"><FolderPlus className="size-4" /></Button>
              <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); setDialog({ editing: row.original, parentId: null }) }} title="Düzenle"><Pencil className="size-4" /></Button>
              <Button variant="ghost" size="icon-sm" onClick={(e) => {
                e.stopPropagation()
                if (row.original.children.length) { toast.error('Alt kategorileri olan kategori silinemez'); return }
                if (confirm(`"${row.original.name}" silinsin mi?`)) deleteMutation.mutate(row.original.id)
              }} title="Sil"><Trash2 className="size-4 text-destructive" /></Button>
            </div>
          ),
        } as ColumnDef<CatNode>]
      : []),
  ]

  return (
    <PermissionRequired permission={DocumentsPermissions.categoriesRead}>
      <PageWrapper>
        <DataGrid
          gridId="documents.categories"
          data={roots}
          columns={columns}
          getRowId={(c) => c.id}
          getSubRows={(c) => c.children}
          treeColumnId="name"
          defaultExpanded
          pagination={false}
          loading={catsQuery.isLoading}
          onRowClick={(c) => navigate({ to: '/documents/categories/$id', params: { id: c.id } })}
          rowClassName={(c) => (c.id === highlightId ? 'bg-primary/10' : undefined)}
          emptyText="Henüz kategori yok."
          toolbar={canWrite ? <Button onClick={() => setDialog({ editing: null, parentId: null })}><Plus />Yeni kök kategori</Button> : null}
        />

        <CategoryDialog
          open={dialog !== null}
          onOpenChange={(o) => { if (!o) setDialog(null) }}
          editing={dialog?.editing ?? null}
          defaultParentId={dialog?.parentId ?? null}
          categories={cats}
          onSaved={(saved) => { void invalidate(); flash(saved.id) }}
        />
      </PageWrapper>
    </PermissionRequired>
  )
}
