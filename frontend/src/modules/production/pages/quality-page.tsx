import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { ShieldCheck } from 'lucide-react'

import {
  QUALITY_TYPE_LABELS,
  ProductionPermissions,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { formatDate } from '@/lib/datetime'
import { PageWrapper } from '@/components/layout/page'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EntityCombobox } from '@/modules/invoices/components/entity-combobox'
import { QualityRecordDialog } from '../components/quality-record-dialog'
import { QualityResultBadge } from '../components/status-badge'
import { formatQty } from '../format'

export function QualityPage() {
  const { hasPermission } = useAuth()
  const canRead = hasPermission(ProductionPermissions.read)
  const canManage = hasPermission(ProductionPermissions.qualityManage)

  const [moId, setMoId] = React.useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)

  const ordersQuery = useQuery({
    queryKey: ['production', 'orders', 'list'],
    queryFn: () => api.production.orders.list(),
    enabled: canRead,
  })
  const checksQuery = useQuery({
    queryKey: ['production', 'quality', 'list'],
    queryFn: () => api.production.qualityChecks.list(),
    enabled: canRead,
  })

  return (
    <PermissionRequired permission={ProductionPermissions.read}>
      <PageWrapper>
        <div className="space-y-4">
          {canManage ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Yeni Kalite Kaydı</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-end gap-3">
                <div className="min-w-64 flex-1 space-y-1.5">
                  <Label>Üretim Emri</Label>
                  <EntityCombobox
                    items={ordersQuery.data ?? []}
                    value={moId}
                    onChange={(id) => setMoId(id)}
                    getId={(o) => o.id}
                    getLabel={(o) => `${o.orderNo} · ${o.productName}`}
                    getSub={(o) => o.productCode}
                    placeholder="Emir seç"
                    searchPlaceholder="Emir ara…"
                    emptyText="Emir bulunamadı"
                  />
                </div>
                <Button disabled={!moId} onClick={() => setDialogOpen(true)}>
                  <ShieldCheck /> Kalite Kaydet
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Kalite Kayıtları</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              {checksQuery.isLoading ? (
                <div className="space-y-2 px-4">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tarih</TableHead>
                      <TableHead>Üretim Emri</TableHead>
                      <TableHead>Tür</TableHead>
                      <TableHead>Sonuç</TableHead>
                      <TableHead className="text-right">İncelenen</TableHead>
                      <TableHead className="text-right">Geçen</TableHead>
                      <TableHead className="text-right">Reddedilen</TableHead>
                      <TableHead>Not</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(checksQuery.data ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="py-6 text-center text-muted-foreground">
                          Kalite kaydı yok.
                        </TableCell>
                      </TableRow>
                    ) : (
                      (checksQuery.data ?? []).map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="text-sm">{formatDate(c.checkedAt)}</TableCell>
                          <TableCell className="font-mono text-xs">{c.manufacturingOrderNo}</TableCell>
                          <TableCell className="text-sm">{QUALITY_TYPE_LABELS[c.checkType]}</TableCell>
                          <TableCell>
                            <QualityResultBadge result={c.result} />
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{formatQty(c.inspectedQuantity)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatQty(c.passedQuantity)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatQty(c.rejectedQuantity)}</TableCell>
                          <TableCell className="max-w-56 truncate text-sm text-muted-foreground">{c.notes || '—'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {canManage && moId ? (
          <QualityRecordDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            manufacturingOrderId={moId}
            onRecorded={() => void checksQuery.refetch()}
          />
        ) : null}
      </PageWrapper>
    </PermissionRequired>
  )
}
