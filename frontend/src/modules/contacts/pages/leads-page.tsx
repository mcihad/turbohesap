import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Plus, Sparkles } from 'lucide-react'

import {
  ContactsPermissions,
  type ContactDto,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { formatDate } from '@/lib/datetime'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { PageWrapper } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataGrid, type ColumnDef } from '@/components/data-grid'
import { ContactDialog } from '../components/contact-dialog'
import { ConvertLeadDialog } from '../components/convert-lead-dialog'
import { balanceSideLabel, balanceTone, formatMoney } from '../format'

export function LeadsPage() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canWrite = hasPermission(ContactsPermissions.contactsWrite)

  const query = useQuery({
    queryKey: ['contacts', 'contacts', { role: 'lead' }],
    queryFn: () => api.contacts.contacts.list({ role: 'lead' }),
    enabled: hasPermission(ContactsPermissions.contactsRead),
  })

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [convertFor, setConvertFor] = React.useState<ContactDto | null>(null)

  const refetch = () => void query.refetch()

  const columns: ColumnDef<ContactDto>[] = [
    { id: 'code', accessorKey: 'code', header: 'Kod', size: 120, cell: ({ row }) => <span className="font-mono text-xs">{row.original.code}</span> },
    { id: 'name', accessorKey: 'name', header: 'Ünvan', size: 220, cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { id: 'leadSource', accessorFn: (c) => c.leadSource ?? '', header: 'Kaynak', size: 140, enableGrouping: true, cell: ({ row }) => row.original.leadSource ? <Badge variant="outline">{row.original.leadSource}</Badge> : <span className="text-muted-foreground">—</span> },
    { id: 'leadStatus', accessorFn: (c) => c.leadStatus ?? '', header: 'Durum', size: 140, enableGrouping: true, cell: ({ row }) => row.original.leadStatus ? <Badge variant="secondary">{row.original.leadStatus}</Badge> : <span className="text-muted-foreground">—</span> },
    { id: 'owner', accessorFn: (c) => c.owner?.name ?? '', header: 'Sorumlu', size: 150, enableGrouping: true, cell: ({ row }) => row.original.owner ? row.original.owner.name : <span className="text-muted-foreground">—</span> },
    {
      id: 'balance', accessorKey: 'balance', header: 'Bakiye', size: 150,
      cell: ({ row }) => (
        <span className={`tabular-nums font-medium ${balanceTone(row.original.balanceSide)}`}>
          {formatMoney(row.original.balance, row.original.currencyCode)}
          <span className="ml-1 text-2xs font-normal text-muted-foreground">{balanceSideLabel(row.original.balanceSide)}</span>
        </span>
      ),
    },
    { id: 'createdAt', accessorKey: 'createdAt', header: 'Oluşturma', size: 130, cell: ({ row }) => <span className="text-muted-foreground">{formatDate(row.original.createdAt)}</span> },
    ...(canWrite
      ? [{
          id: 'actions', header: '', size: 120, enableSorting: false, enableHiding: false, enableColumnFilter: false, enableGrouping: false,
          cell: ({ row }) => (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => { e.stopPropagation(); setConvertFor(row.original) }}
              >
                <Sparkles className="size-3.5" />
                Dönüştür
              </Button>
            </div>
          ),
        } as ColumnDef<ContactDto>]
      : []),
  ]

  return (
    <PermissionRequired permission={ContactsPermissions.contactsRead}>
      <PageWrapper>
        <DataGrid
          gridId="contacts.leads"
          data={query.data ?? []}
          columns={columns}
          getRowId={(c) => c.id}
          loading={query.isLoading}
          onRowClick={(c) => navigate({ to: '/contacts/contacts/$id', params: { id: c.id } })}
          emptyText="Aday yok."
          toolbar={canWrite ? <Button onClick={() => setDialogOpen(true)}><Plus />Yeni aday</Button> : null}
        />
        <ContactDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          editing={null}
          defaultRole="lead"
          onSaved={refetch}
        />
        <ConvertLeadDialog
          open={convertFor !== null}
          onOpenChange={(o) => { if (!o) setConvertFor(null) }}
          contact={convertFor}
          onConverted={refetch}
        />
      </PageWrapper>
    </PermissionRequired>
  )
}
