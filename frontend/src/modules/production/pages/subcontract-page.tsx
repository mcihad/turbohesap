import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'

import {
  ProductionPermissions,
  type SubcontractDispatchDto,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { formatDate } from '@/lib/datetime'
import { PageWrapper } from '@/components/layout/page'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataGrid, type ColumnDef } from '@/components/data-grid'
import { SubcontractCreateDialog } from '../components/subcontract-create-dialog'
import { SubcontractStatusBadge } from '../components/status-badge'
import { formatMoney, formatQty } from '../format'

export function SubcontractPage() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(ProductionPermissions.read)
  const canManage = hasPermission(ProductionPermissions.subcontractManage)
  const [createOpen, setCreateOpen] = React.useState(false)

  const dispatchesQuery = useQuery({
    queryKey: ['production', 'subcontract', 'list'],
    queryFn: () => api.production.subcontract.list(),
    enabled: canRead,
  })
  const stockQuery = useQuery({
    queryKey: ['production', 'subcontract', 'stock'],
    queryFn: () => api.production.subcontract.stockAtSubcontractor(),
    enabled: canRead,
  })

  const columns: ColumnDef<SubcontractDispatchDto>[] = [
    {
      id: 'dispatchNo',
      accessorKey: 'dispatchNo',
      header: 'Sevk No',
      size: 140,
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.dispatchNo}</span>,
    },
    {
      id: 'mo',
      accessorKey: 'manufacturingOrderNo',
      header: 'Üretim Emri',
      size: 150,
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.manufacturingOrderNo}</span>,
    },
    {
      id: 'contact',
      accessorKey: 'contactName',
      header: 'Fasoncu',
      size: 220,
      cell: ({ row }) => <span className="font-medium">{row.original.contactName}</span>,
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Durum',
      size: 130,
      enableGrouping: true,
      cell: ({ row }) => <SubcontractStatusBadge status={row.original.status} />,
    },
    {
      id: 'date',
      accessorKey: 'dispatchDate',
      header: 'Sevk Tarihi',
      size: 120,
      cell: ({ row }) => <span className="text-sm">{formatDate(row.original.dispatchDate)}</span>,
    },
    {
      id: 'serviceCost',
      accessorKey: 'serviceCost',
      header: 'İşçilik',
      size: 130,
      cell: ({ row }) => (
        <span className="text-right font-mono tabular-nums">
          {row.original.serviceCost ? formatMoney(row.original.serviceCost, row.original.currency) : '—'}
        </span>
      ),
    },
  ]

  return (
    <PermissionRequired permission={ProductionPermissions.read}>
      <PageWrapper>
        <Tabs defaultValue="dispatches">
          <TabsList>
            <TabsTrigger value="dispatches">Sevkler</TabsTrigger>
            <TabsTrigger value="stock">Fasoncudaki Stok</TabsTrigger>
          </TabsList>

          <TabsContent value="dispatches" className="mt-4">
            <DataGrid
              gridId="production.subcontract"
              data={dispatchesQuery.data ?? []}
              columns={columns}
              getRowId={(row) => row.id}
              loading={dispatchesQuery.isLoading}
              onRowClick={(row) => navigate({ to: '/production/subcontract/$id', params: { id: row.id } })}
              emptyText="Henüz fason sevk yok."
              toolbar={
                canManage ? (
                  <Button onClick={() => setCreateOpen(true)}>
                    <Plus /> Yeni Sevk
                  </Button>
                ) : null
              }
            />
          </TabsContent>

          <TabsContent value="stock" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Fasoncudaki Açık Stok</CardTitle>
              </CardHeader>
              <CardContent className="px-0">
                {stockQuery.isLoading ? (
                  <div className="space-y-2 px-4">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fasoncu</TableHead>
                        <TableHead>Bileşen</TableHead>
                        <TableHead className="text-right">Gönderilen</TableHead>
                        <TableHead className="text-right">İade</TableHead>
                        <TableHead className="text-right">Fasonda</TableHead>
                        <TableHead>Birim</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(stockQuery.data ?? []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                            Fasoncuda açık stok yok.
                          </TableCell>
                        </TableRow>
                      ) : (
                        (stockQuery.data ?? []).map((s, i) => (
                          <TableRow key={`${s.contactId}-${s.componentProductId}-${i}`}>
                            <TableCell className="font-medium">{s.contactName}</TableCell>
                            <TableCell>
                              <div>{s.componentName}</div>
                              <div className="font-mono text-2xs text-muted-foreground">{s.componentCode}</div>
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{formatQty(s.sentQuantity)}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatQty(s.returnedQuantity)}</TableCell>
                            <TableCell className="text-right font-mono tabular-nums">{formatQty(s.atSubcontractor)}</TableCell>
                            <TableCell className="text-muted-foreground">{s.unit}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {canManage ? (
          <SubcontractCreateDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            onCreated={(d) => navigate({ to: '/production/subcontract/$id', params: { id: d.id } })}
          />
        ) : null}
      </PageWrapper>
    </PermissionRequired>
  )
}
