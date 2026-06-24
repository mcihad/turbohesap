import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

import { IamPermissions } from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { PageHeader, PageWrapper } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'

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
      <PageHeader
        title="İzinler"
        description="Sistemdeki tüm izinler. İzinler kataloğu kod ile tanımlanır; roller bu izinleri kullanır."
      />
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Anahtar</TableHead>
              <TableHead>Grup</TableHead>
              <TableHead>Açıklama</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={3}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : data && data.length > 0 ? (
              data.map((p) => (
                <TableRow key={p.key}>
                  <TableCell>
                    <Link
                      to="/iam/permissions/$key"
                      params={{ key: p.key }}
                      className="font-mono text-xs text-primary hover:underline"
                    >
                      {p.key}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{p.group}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.description}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  İzin bulunamadı.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </PageWrapper>
    </PermissionRequired>
  )
}
