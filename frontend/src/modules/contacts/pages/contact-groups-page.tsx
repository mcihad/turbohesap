import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FolderPlus, Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { ContactsPermissions, toApiError, type ContactGroupDto } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { PageWrapper } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataGrid, type ColumnDef } from '@/components/data-grid'
import { ContactGroupDialog } from '../components/contact-group-dialog'

interface GroupNode extends ContactGroupDto {
  children: GroupNode[]
}

function buildNested(groups: ContactGroupDto[]): GroupNode[] {
  const byParent = new Map<string | null, ContactGroupDto[]>()
  for (const g of groups) {
    const arr = byParent.get(g.parentId) ?? []
    arr.push(g)
    byParent.set(g.parentId, arr)
  }
  const make = (parentId: string | null): GroupNode[] =>
    (byParent.get(parentId) ?? [])
      .sort((a, b) => a.name.localeCompare(b.name, 'tr'))
      .map((g) => ({ ...g, children: make(g.id) }))
  return make(null)
}

export function ContactGroupsPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canWrite = hasPermission(ContactsPermissions.contactsWrite)

  // Dialog state drives create-root / create-child / edit.
  const [dialog, setDialog] = React.useState<
    { editing: ContactGroupDto | null; parentId: string | null } | null
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

  const groupsQuery = useQuery({
    queryKey: ['contacts', 'groups'],
    queryFn: () => api.contacts.groups.list(),
    enabled: hasPermission(ContactsPermissions.contactsRead),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['contacts', 'groups'] })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.contacts.groups.remove(id),
    onSuccess: () => { toast.success('Grup silindi'); void invalidate() },
    onError: (e) => toast.error('Silinemedi', { description: toApiError(e).message }),
  })

  const groups = groupsQuery.data ?? []
  const roots = React.useMemo(() => buildNested(groups), [groups])

  const columns: ColumnDef<GroupNode>[] = [
    { id: 'name', accessorKey: 'name', header: 'Grup', size: 280, cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { id: 'code', accessorKey: 'code', header: 'Kod', size: 120, cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.code || '—'}</span> },
    { id: 'contactCount', accessorKey: 'contactCount', header: 'Cari', size: 90, cell: ({ row }) => <Badge variant="secondary">{row.original.contactCount}</Badge> },
    { id: 'isActive', accessorKey: 'isActive', header: 'Durum', size: 100, enableGrouping: true, cell: ({ row }) => <Badge variant={row.original.isActive ? 'success' : 'outline'}>{row.original.isActive ? 'Aktif' : 'Pasif'}</Badge> },
    ...(canWrite
      ? [{
          id: 'actions', header: '', size: 130, enableSorting: false, enableHiding: false, enableColumnFilter: false, enableGrouping: false,
          cell: ({ row }) => (
            <div className="flex justify-end gap-1">
              <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); setDialog({ editing: null, parentId: row.original.id }) }} title="Alt grup ekle"><FolderPlus className="size-4" /></Button>
              <Button variant="ghost" size="icon-sm" onClick={(e) => { e.stopPropagation(); setDialog({ editing: row.original, parentId: null }) }} title="Düzenle"><Pencil className="size-4" /></Button>
              <Button variant="ghost" size="icon-sm" onClick={(e) => {
                e.stopPropagation()
                if (row.original.children.length) { toast.error('Alt grupları olan grup silinemez'); return }
                if (confirm(`"${row.original.name}" silinsin mi?`)) deleteMutation.mutate(row.original.id)
              }} title="Sil"><Trash2 className="size-4 text-destructive" /></Button>
            </div>
          ),
        } as ColumnDef<GroupNode>]
      : []),
  ]

  return (
    <PermissionRequired permission={ContactsPermissions.contactsRead}>
      <PageWrapper>
        <DataGrid
          gridId="contacts.groups"
          data={roots}
          columns={columns}
          getRowId={(g) => g.id}
          getSubRows={(g) => g.children}
          treeColumnId="name"
          defaultExpanded
          pagination={false}
          loading={groupsQuery.isLoading}
          onRowClick={(g) => navigate({ to: '/contacts/groups/$id', params: { id: g.id } })}
          rowClassName={(g) => (g.id === highlightId ? 'bg-primary/10' : undefined)}
          emptyText="Henüz grup yok."
          toolbar={canWrite ? <Button onClick={() => setDialog({ editing: null, parentId: null })}><Plus />Yeni grup</Button> : null}
        />

        <ContactGroupDialog
          open={dialog !== null}
          onOpenChange={(o) => { if (!o) setDialog(null) }}
          editing={dialog?.editing ?? null}
          defaultParentId={dialog?.parentId ?? null}
          groups={groups}
          onSaved={(saved) => { void invalidate(); flash(saved.id) }}
        />
      </PageWrapper>
    </PermissionRequired>
  )
}
