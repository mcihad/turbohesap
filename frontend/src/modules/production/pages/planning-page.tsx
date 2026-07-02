import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Pencil, Play, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  ProductionPermissions,
  toApiError,
  type ReorderRuleDto,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { formatDate } from '@/lib/datetime'
import { PageWrapper } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { ReorderRuleDialog } from '../components/reorder-rule-dialog'
import { PlanningRunBadge, SuggestionReasonBadge, SuggestionTypeBadge } from '../components/status-badge'
import { formatQty } from '../format'

export function PlanningPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(ProductionPermissions.read)
  const canPlan = hasPermission(ProductionPermissions.planningRun)

  const [selectedRunId, setSelectedRunId] = React.useState<string | null>(null)
  const [selected, setSelected] = React.useState<Set<string>>(new Set())
  const [ruleDialog, setRuleDialog] = React.useState(false)
  const [editingRule, setEditingRule] = React.useState<ReorderRuleDto | null>(null)

  const runsQuery = useQuery({
    queryKey: ['production', 'planning', 'runs'],
    queryFn: () => api.production.planning.list(),
    enabled: canRead,
  })
  const runs = React.useMemo(
    () => [...(runsQuery.data ?? [])].sort((a, b) => +new Date(b.runDate) - +new Date(a.runDate)),
    [runsQuery.data],
  )

  React.useEffect(() => {
    if (!selectedRunId && runs.length) setSelectedRunId(runs[0].id)
  }, [runs, selectedRunId])

  const runDetail = useQuery({
    queryKey: ['production', 'planning', 'run', selectedRunId],
    queryFn: () => api.production.planning.get(selectedRunId as string),
    enabled: canRead && !!selectedRunId,
  })

  const rulesQuery = useQuery({
    queryKey: ['production', 'reorder-rules'],
    queryFn: () => api.production.reorderRules.list(),
    enabled: canRead,
  })

  const runMutation = useMutation({
    mutationFn: () => api.production.planning.run({ includeReorder: true, includeSalesOrders: true }),
    onSuccess: (run) => {
      toast.success('Planlama çalıştırıldı')
      void qc.invalidateQueries({ queryKey: ['production', 'planning'] })
      setSelectedRunId(run.id)
      setSelected(new Set())
    },
    onError: (e) => toast.error('Çalıştırılamadı', { description: toApiError(e).message }),
  })

  const applyMutation = useMutation({
    mutationFn: (suggestionIds?: string[]) =>
      api.production.planning.apply(selectedRunId as string, suggestionIds ? { suggestionIds } : {}),
    onSuccess: () => {
      toast.success('Öneriler uygulandı; taslak üretim emirleri oluşturuldu')
      void qc.invalidateQueries({ queryKey: ['production'] })
      setSelected(new Set())
    },
    onError: (e) => toast.error('Uygulanamadı', { description: toApiError(e).message }),
  })

  const deleteRule = useMutation({
    mutationFn: (id: string) => api.production.reorderRules.remove(id),
    onSuccess: () => {
      toast.success('Kural silindi')
      void qc.invalidateQueries({ queryKey: ['production', 'reorder-rules'] })
    },
    onError: (e) => toast.error('Silme başarısız', { description: toApiError(e).message }),
  })

  const run = runDetail.data
  const suggestions = React.useMemo(
    () => [...(run?.suggestions ?? [])].sort((a, b) => a.level - b.level || a.productName.localeCompare(b.productName)),
    [run],
  )
  const selectable = suggestions.filter((s) => s.status === 'pending' && s.suggestionType === 'manufacture')

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <PermissionRequired permission={ProductionPermissions.read}>
      <PageWrapper>
        <Tabs defaultValue="planning">
          <TabsList>
            <TabsTrigger value="planning">Planlama</TabsTrigger>
            <TabsTrigger value="rules">Min/Max Kuralları</TabsTrigger>
          </TabsList>

          {/* Planning */}
          <TabsContent value="planning" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
                <CardTitle className="text-sm">Planlama Çalıştırmaları</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  {runs.length ? (
                    <Select value={selectedRunId ?? ''} onValueChange={setSelectedRunId}>
                      <SelectTrigger className="h-9 w-56">
                        <SelectValue placeholder="Çalıştırma seç" />
                      </SelectTrigger>
                      <SelectContent>
                        {runs.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.runNo} · {formatDate(r.runDate)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : null}
                  {canPlan ? (
                    <Button size="sm" disabled={runMutation.isPending} onClick={() => runMutation.mutate()}>
                      <Play /> Planlama Çalıştır
                    </Button>
                  ) : null}
                </div>
              </CardHeader>
              {run ? (
                <CardContent className="flex flex-wrap items-center gap-2 pt-0 text-sm text-muted-foreground">
                  <PlanningRunBadge status={run.status} />
                  <span>Ufuk: {run.horizonDays} gün</span>
                  <span>·</span>
                  <span>{suggestions.length} öneri</span>
                </CardContent>
              ) : null}
            </Card>

            <Card>
              <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm">Öneriler</CardTitle>
                {canPlan && run && run.status !== 'applied' ? (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={applyMutation.isPending || selected.size === 0}
                      onClick={() => applyMutation.mutate([...selected])}
                    >
                      Seçilenleri Uygula ({selected.size})
                    </Button>
                    <Button
                      size="sm"
                      disabled={applyMutation.isPending || selectable.length === 0}
                      onClick={() => applyMutation.mutate(undefined)}
                    >
                      Tümünü Uygula
                    </Button>
                  </div>
                ) : null}
              </CardHeader>
              <CardContent className="px-0">
                {runDetail.isLoading ? (
                  <div className="space-y-2 px-4">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10" />
                        <TableHead>Ürün</TableHead>
                        <TableHead>Tür</TableHead>
                        <TableHead>Sebep</TableHead>
                        <TableHead className="text-right">Gerekli</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suggestions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                            {run ? 'Öneri yok.' : 'Bir çalıştırma seçin veya planlama çalıştırın.'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        suggestions.map((s) => {
                          const canSelect = s.status === 'pending' && s.suggestionType === 'manufacture'
                          return (
                            <TableRow key={s.id}>
                              <TableCell>
                                {canSelect ? (
                                  <Checkbox checked={selected.has(s.id)} onCheckedChange={() => toggle(s.id)} />
                                ) : null}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center" style={{ paddingLeft: s.level * 16 }}>
                                  {s.level > 0 ? <span className="mr-1 text-muted-foreground">└</span> : null}
                                  <div>
                                    <div className="font-medium">{s.productName}</div>
                                    <div className="font-mono text-2xs text-muted-foreground">{s.productCode}</div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <SuggestionTypeBadge type={s.suggestionType} />
                              </TableCell>
                              <TableCell>
                                <SuggestionReasonBadge reason={s.reason} />
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {formatQty(s.requiredQuantity)} {s.unit}
                              </TableCell>
                              <TableCell>
                                {s.status === 'applied' ? (
                                  <Badge variant="success">Uygulandı</Badge>
                                ) : s.status === 'dismissed' ? (
                                  <Badge variant="outline">Yoksayıldı</Badge>
                                ) : (
                                  <Badge variant="secondary">Bekliyor</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {s.createdManufacturingOrderId ? (
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    aria-label="Emre git"
                                    onClick={() =>
                                      navigate({
                                        to: '/production/orders/$id',
                                        params: { id: s.createdManufacturingOrderId as string },
                                      })
                                    }
                                  >
                                    <ArrowRight className="size-4" />
                                  </Button>
                                ) : null}
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rules */}
          <TabsContent value="rules" className="mt-4">
            <Card>
              <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm">Min/Max Stok Kuralları</CardTitle>
                {canPlan ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingRule(null)
                      setRuleDialog(true)
                    }}
                  >
                    <Plus /> Yeni Kural
                  </Button>
                ) : null}
              </CardHeader>
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ürün</TableHead>
                      <TableHead className="text-right">Min</TableHead>
                      <TableHead className="text-right">Max</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead className="w-20" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(rulesQuery.data ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                          Kural yok.
                        </TableCell>
                      </TableRow>
                    ) : (
                      (rulesQuery.data ?? []).map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>
                            <div className="font-medium">{r.productName}</div>
                            <div className="font-mono text-2xs text-muted-foreground">{r.productCode}</div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{formatQty(r.minQty)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatQty(r.maxQty)}</TableCell>
                          <TableCell>
                            {r.isActive ? <Badge variant="success">Aktif</Badge> : <Badge variant="outline">Pasif</Badge>}
                          </TableCell>
                          <TableCell>
                            {canPlan ? (
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label="Düzenle"
                                  onClick={() => {
                                    setEditingRule(r)
                                    setRuleDialog(true)
                                  }}
                                >
                                  <Pencil className="size-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  aria-label="Sil"
                                  onClick={() => {
                                    if (confirm(`"${r.productName}" kuralı silinsin mi?`)) deleteRule.mutate(r.id)
                                  }}
                                >
                                  <Trash2 className="size-4 text-destructive" />
                                </Button>
                              </div>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {canPlan ? (
          <ReorderRuleDialog
            open={ruleDialog}
            onOpenChange={setRuleDialog}
            editing={editingRule}
            onSaved={() => void rulesQuery.refetch()}
          />
        ) : null}
      </PageWrapper>
    </PermissionRequired>
  )
}
