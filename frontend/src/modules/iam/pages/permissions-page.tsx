import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

import { IamPermissions, type PermissionDto } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { PageWrapper } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import { DataGrid, type ColumnDef } from '@/components/data-grid'

const columns: ColumnDef<PermissionDto, unknown>[] = [
  {
    id: 'key',
    accessorKey: 'key',
    header: 'Anahtar',
    cell: ({ row }) => (
      <Link
        to="/iam/permissions/$key"
        params={{ key: row.original.key }}
        className="font-mono text-xs text-primary hover:underline"
      >
        {row.original.key}
      </Link>
    ),
  },
  {
    id: 'group',
    accessorKey: 'group',
    header: 'Grup',
    enableGrouping: true,
    cell: ({ row }) => <Badge variant="secondary">{row.original.group}</Badge>,
  },
  {
    id: 'description',
    accessorKey: 'description',
    header: 'Açıklama',
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.description}</span>
    ),
  },
]

// Read-only view of the permission catalog (/api/iam/permissions).
export function PermissionsPage() {
  const { hasPermission } = useAuth()
  const { data, isLoading } = useQuery({
    queryKey: ['iam', 'permissions'],
    queryFn: () => api.iam.permissions.list(),
    enabled: hasPermission(IamPermissions.permissionsRead),
  })

  return (
    <PermissionRequired permission={IamPermissions.permissionsRead}>
    <PageWrapper>
      <DataGrid
        gridId="iam.permissions"
        data={data ?? []}
        columns={columns}
        getRowId={(p) => p.key}
        loading={isLoading}
        emptyText="İzin yok."
      />
    </PageWrapper>
    </PermissionRequired>
  )
}
