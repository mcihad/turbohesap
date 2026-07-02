import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, GitBranch, Plus, Search } from 'lucide-react'

import {
  ProductionPermissions,
  type LotKind,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { formatDate } from '@/lib/datetime'
import { PageWrapper } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
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
import { EntityCombobox } from '@/modules/invoices/components/entity-combobox'
import { LotCreateDialog } from '../components/lot-create-dialog'
import { formatQty } from '../format'

const KIND_LABELS: Record<LotKind, string> = { lot: 'Parti', serial: 'Seri' }

export function LotsPage() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(ProductionPermissions.read)
  const canManage = hasPermission(ProductionPermissions.qualityManage)

  const [tab, setTab] = React.useState('lots')
  const [selectedLotId, setSelectedLotId] = React.useState<string | null>(null)
  const [createOpen, setCreateOpen] = React.useState(false)

  const lotsQuery = useQuery({
    queryKey: ['production', 'lots', 'list'],
    queryFn: () => api.production.lots.list(),
    enabled: canRead,
  })
  const traceQuery = useQuery({
    queryKey: ['production', 'lots', 'trace', selectedLotId],
    queryFn: () => api.production.lots.trace(selectedLotId as string),
    enabled: canRead && !!selectedLotId,
  })

  const openTrace = (lotId: string) => {
    setSelectedLotId(lotId)
    setTab('trace')
  }

  const trace = traceQuery.data

  return (
    <PermissionRequired permission={ProductionPermissions.read}>
      <PageWrapper>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="lots">Lotlar</TabsTrigger>
            <TabsTrigger value="trace">İzlenebilirlik</TabsTrigger>
          </TabsList>

          {/* Lots list */}
          <TabsContent value="lots" className="mt-4">
            <Card>
              <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm">Lot / Seri Kayıtları</CardTitle>
                {canManage ? (
                  <Button size="sm" onClick={() => setCreateOpen(true)}>
                    <Plus /> Yeni Lot
                  </Button>
                ) : null}
              </CardHeader>
              <CardContent className="px-0">
                {lotsQuery.isLoading ? (
                  <div className="space-y-2 px-4">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Lot / Seri No</TableHead>
                        <TableHead>Ürün</TableHead>
                        <TableHead>Tür</TableHead>
                        <TableHead>Oluşturma</TableHead>
                        <TableHead className="w-24" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(lotsQuery.data ?? []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                            Lot kaydı yok.
                          </TableCell>
                        </TableRow>
                      ) : (
                        (lotsQuery.data ?? []).map((l) => (
                          <TableRow key={l.id}>
                            <TableCell className="font-mono text-sm font-medium">{l.lotNo}</TableCell>
                            <TableCell>{l.productName}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{KIND_LABELS[l.kind]}</Badge>
                            </TableCell>
                            <TableCell className="text-sm">{formatDate(l.createdAt)}</TableCell>
                            <TableCell>
                              <div className="flex justify-end">
                                <Button variant="ghost" size="sm" onClick={() => openTrace(l.id)}>
                                  <GitBranch className="size-4" /> İzle
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trace */}
          <TabsContent value="trace" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Search className="size-4 text-muted-foreground" /> Lot Seç
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-w-md space-y-1.5">
                  <Label>Lot / Seri No</Label>
                  <EntityCombobox
                    items={lotsQuery.data ?? []}
                    value={selectedLotId}
                    onChange={(id) => setSelectedLotId(id)}
                    getId={(l) => l.id}
                    getLabel={(l) => l.lotNo}
                    getSub={(l) => l.productName}
                    placeholder="Lot seç"
                    searchPlaceholder="Lot ara…"
                    emptyText="Lot bulunamadı"
                  />
                </div>
              </CardContent>
            </Card>

            {!selectedLotId ? (
              <p className="py-12 text-center text-muted-foreground">Şecere görüntülemek için bir lot seçin.</p>
            ) : traceQuery.isLoading ? (
              <Skeleton className="h-48 w-full rounded-xl" />
            ) : trace ? (
              <div className="space-y-4">
                <Card>
                  <CardContent className="flex flex-wrap items-center gap-3 py-4">
                    <Badge variant="info" className="font-mono">
                      {trace.lot.lotNo}
                    </Badge>
                    <span className="font-medium">{trace.lot.productName}</span>
                    <Badge variant="secondary">{KIND_LABELS[trace.lot.kind]}</Badge>
                  </CardContent>
                </Card>

                {/* Upstream — produced from (consumed lots) */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Geriye İzleme — Bu lotu üreten emirlerde tüketilen lotlar</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {trace.producedFrom.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Kayıt yok.</p>
                    ) : (
                      trace.producedFrom.map((g) => (
                        <div key={g.manufacturingOrderId} className="rounded-lg border p-3">
                          <button
                            type="button"
                            className="mb-2 inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
                            onClick={() => navigate({ to: '/production/orders/$id', params: { id: g.manufacturingOrderId } })}
                          >
                            {g.manufacturingOrderNo} <ArrowRight className="size-3" />
                          </button>
                          <div className="flex flex-wrap gap-1.5">
                            {g.consumedLots.length === 0 ? (
                              <span className="text-xs text-muted-foreground">Tüketilen lot yok</span>
                            ) : (
                              g.consumedLots.map((ref) => (
                                <Badge key={ref.lotId} variant="outline" className="gap-1">
                                  <span className="font-mono">{ref.lotNo}</span>
                                  <span className="text-muted-foreground">{ref.productName}</span>
                                  <span className="tabular-nums">· {formatQty(ref.quantity)}</span>
                                </Badge>
                              ))
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Downstream — consumed into (produced lots) — recall */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">İleriye İzleme (Recall) — Bu lotu tüketen emirlerde üretilen lotlar</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {trace.consumedInto.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Kayıt yok.</p>
                    ) : (
                      trace.consumedInto.map((g) => (
                        <div key={g.manufacturingOrderId} className="rounded-lg border p-3">
                          <button
                            type="button"
                            className="mb-2 inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
                            onClick={() => navigate({ to: '/production/orders/$id', params: { id: g.manufacturingOrderId } })}
                          >
                            {g.manufacturingOrderNo} <ArrowRight className="size-3" />
                          </button>
                          <div className="flex flex-wrap gap-1.5">
                            {g.producedLots.length === 0 ? (
                              <span className="text-xs text-muted-foreground">Üretilen lot yok</span>
                            ) : (
                              g.producedLots.map((ref) => (
                                <Badge key={ref.lotId} variant="outline" className="gap-1">
                                  <span className="font-mono">{ref.lotNo}</span>
                                  <span className="text-muted-foreground">{ref.productName}</span>
                                  <span className="tabular-nums">· {formatQty(ref.quantity)}</span>
                                </Badge>
                              ))
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <p className="py-12 text-center text-muted-foreground">Şecere bulunamadı.</p>
            )}
          </TabsContent>
        </Tabs>

        {canManage ? (
          <LotCreateDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={() => void lotsQuery.refetch()} />
        ) : null}
      </PageWrapper>
    </PermissionRequired>
  )
}
