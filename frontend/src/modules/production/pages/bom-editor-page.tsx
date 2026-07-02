import * as React from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  BOM_TYPE_LABELS,
  CONSUMPTION_POLICY_LABELS,
  ProductionPermissions,
  toApiError,
  type BomType,
  type ComponentConsumptionType,
  type ConsumptionPolicy,
  type CreateBomRequest,
  type OperationTimeBasis,
} from '@turbohesap/shared'

import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { PageHeader, PageWrapper } from '@/components/layout/page'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ProductPickerField } from '@/components/product-picker/product-picker-field'
import { WorkCenterSelect } from '../components/pickers'

const BOM_TYPES: BomType[] = ['manufacture', 'phantom', 'subcontract']
const CONSUMPTION_POLICIES: ConsumptionPolicy[] = ['strict', 'warn', 'flexible']
const TIME_BASES: OperationTimeBasis[] = ['per_unit', 'fixed']
const TIME_BASIS_LABELS: Record<OperationTimeBasis, string> = {
  per_unit: 'Birim başına',
  fixed: 'Sabit',
}
const NONE = '__none__'

let seq = 0
const uid = () => `r${seq++}`

interface CompRow {
  key: string
  productId: string | null
  name: string
  code: string
  quantity: string
  unit: string
  scrapPct: string
  operationRef: number | null
  consumptionType: ComponentConsumptionType
  isOptional: boolean
}
interface OpRow {
  key: string
  sequence: string
  name: string
  workCenterId: string | null
  setupTimeMinutes: string
  timePerUnitMinutes: string
  timeBasis: OperationTimeBasis
  qualityCheckRequired: boolean
}
interface ByproductRow {
  key: string
  productId: string | null
  name: string
  quantity: string
  unit: string
  costSharePct: string
}

const emptyComp = (): CompRow => ({
  key: uid(),
  productId: null,
  name: '',
  code: '',
  quantity: '1',
  unit: 'Adet',
  scrapPct: '0',
  operationRef: null,
  consumptionType: 'auto',
  isOptional: false,
})
const emptyOp = (nextSeq: number): OpRow => ({
  key: uid(),
  sequence: String(nextSeq),
  name: '',
  workCenterId: null,
  setupTimeMinutes: '0',
  timePerUnitMinutes: '0',
  timeBasis: 'per_unit',
  qualityCheckRequired: false,
})
const emptyByproduct = (): ByproductRow => ({
  key: uid(),
  productId: null,
  name: '',
  quantity: '1',
  unit: 'Adet',
  costSharePct: '0',
})

export function BomEditorPage() {
  const params = useParams({ strict: false }) as { id?: string }
  const editId = params.id ?? null
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [productId, setProductId] = React.useState<string | null>(null)
  const [productLabel, setProductLabel] = React.useState('')
  const [code, setCode] = React.useState('')
  const [name, setName] = React.useState('')
  const [type, setType] = React.useState<BomType>('manufacture')
  const [outputQuantity, setOutputQuantity] = React.useState('1')
  const [unit, setUnit] = React.useState('Adet')
  const [consumptionPolicy, setConsumptionPolicy] = React.useState<ConsumptionPolicy>('warn')
  const [notes, setNotes] = React.useState('')
  const [components, setComponents] = React.useState<CompRow[]>([emptyComp()])
  const [operations, setOperations] = React.useState<OpRow[]>([])
  const [byproducts, setByproducts] = React.useState<ByproductRow[]>([])

  const editQuery = useQuery({
    queryKey: ['production', 'boms', editId],
    queryFn: () => api.production.boms.get(editId as string),
    enabled: !!editId,
  })

  const hydrated = React.useRef(false)
  React.useEffect(() => {
    const b = editQuery.data
    if (!b || hydrated.current) return
    hydrated.current = true
    setProductId(b.productId)
    setProductLabel(b.productName)
    setCode(b.code)
    setName(b.name)
    setType(b.type)
    setOutputQuantity(String(b.outputQuantity))
    setUnit(b.unit)
    setConsumptionPolicy(b.consumptionPolicy)
    setNotes(b.notes ?? '')
    const opSeqById = new Map(b.operations.map((o) => [o.id, o.sequence]))
    setOperations(
      b.operations.map((o) => ({
        key: uid(),
        sequence: String(o.sequence),
        name: o.name,
        workCenterId: o.workCenterId,
        setupTimeMinutes: String(o.setupTimeMinutes),
        timePerUnitMinutes: String(o.timePerUnitMinutes),
        timeBasis: o.timeBasis,
        qualityCheckRequired: o.qualityCheckRequired,
      })),
    )
    setComponents(
      b.components.length
        ? b.components.map((c) => ({
            key: uid(),
            productId: c.componentProductId,
            name: c.componentName,
            code: c.componentCode,
            quantity: String(c.quantity),
            unit: c.unit,
            scrapPct: String(Math.round(c.scrapRate * 10000) / 100),
            operationRef: c.operationId ? (opSeqById.get(c.operationId) ?? null) : null,
            consumptionType: c.consumptionType,
            isOptional: c.isOptional,
          }))
        : [emptyComp()],
    )
    setByproducts(
      b.byproducts.map((bp) => ({
        key: uid(),
        productId: bp.productId,
        name: bp.productName,
        quantity: String(bp.quantity),
        unit: bp.unit,
        costSharePct: String(Math.round(bp.costShareRate * 10000) / 100),
      })),
    )
  }, [editQuery.data])

  const save = useMutation({
    mutationFn: () => {
      if (!productId) throw new Error('Mamul (ürün) seçilmelidir')
      const payload: CreateBomRequest = {
        productId,
        code: code.trim() || undefined,
        name: name.trim() || undefined,
        type,
        outputQuantity: Number(outputQuantity) || 1,
        unit: unit.trim() || undefined,
        consumptionPolicy,
        notes: notes.trim() || null,
        components: components
          .filter((c) => c.productId)
          .map((c) => ({
            componentProductId: c.productId as string,
            quantity: Number(c.quantity) || 0,
            unit: c.unit.trim() || undefined,
            scrapRate: c.scrapPct ? Number(c.scrapPct) / 100 : undefined,
            operationRef: c.operationRef ?? null,
            consumptionType: c.consumptionType,
            isOptional: c.isOptional,
          })),
        operations: operations
          .filter((o) => o.workCenterId && o.name.trim())
          .map((o) => ({
            sequence: Number(o.sequence) || 0,
            name: o.name.trim(),
            workCenterId: o.workCenterId as string,
            setupTimeMinutes: o.setupTimeMinutes ? Number(o.setupTimeMinutes) : undefined,
            timePerUnitMinutes: o.timePerUnitMinutes ? Number(o.timePerUnitMinutes) : undefined,
            timeBasis: o.timeBasis,
            qualityCheckRequired: o.qualityCheckRequired,
          })),
        byproducts: byproducts
          .filter((b) => b.productId)
          .map((b) => ({
            productId: b.productId as string,
            quantity: Number(b.quantity) || 0,
            unit: b.unit.trim() || undefined,
            costShareRate: b.costSharePct ? Number(b.costSharePct) / 100 : undefined,
          })),
      }
      return editId ? api.production.boms.update(editId, payload) : api.production.boms.create(payload)
    },
    onSuccess: (bom) => {
      toast.success('Reçete kaydedildi')
      void qc.invalidateQueries({ queryKey: ['production', 'boms'] })
      navigate({ to: '/production/boms/$id', params: { id: bom.id } })
    },
    onError: (e) => toast.error('Kaydedilemedi', { description: toApiError(e).message }),
  })

  // Component helpers
  const setComp = (i: number, patch: Partial<CompRow>) =>
    setComponents((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const setOp = (i: number, patch: Partial<OpRow>) =>
    setOperations((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  const setBp = (i: number, patch: Partial<ByproductRow>) =>
    setByproducts((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))

  const opOptions = operations
    .map((o) => ({ seq: Number(o.sequence), label: `#${o.sequence} ${o.name || 'Operasyon'}` }))
    .filter((o) => !Number.isNaN(o.seq))

  if (editId && editQuery.isLoading) {
    return (
      <PageWrapper>
        <div className="space-y-4">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </PageWrapper>
    )
  }

  const actions = (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => navigate({ to: '/production/boms' })}>
        <ArrowLeft /> Liste
      </Button>
      <Button size="sm" disabled={save.isPending} onClick={() => save.mutate()}>
        <Save /> Kaydet
      </Button>
    </div>
  )

  return (
    <PermissionRequired permission={ProductionPermissions.write}>
      <PageWrapper>
        <PageHeader
          title={editId ? 'Reçeteyi Düzenle' : 'Yeni Reçete'}
          description="Mamul + bileşenler, operasyonlar (rota) ve yan ürünler"
          actions={actions}
        />

        <div className="space-y-4">
          {/* Header */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Reçete Bilgileri</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-12">
              <div className="space-y-1.5 sm:col-span-6">
                <Label>Mamul (Ürün)</Label>
                <ProductPickerField
                  value={productId}
                  onChange={(u) => {
                    setProductId(u?.productId ?? null)
                    setProductLabel(u?.label ?? '')
                    if (u && !unit.trim()) setUnit(u.unit || 'Adet')
                  }}
                  placeholder="Mamul seç…"
                />
                {productLabel ? (
                  <p className="text-xs text-muted-foreground">{productLabel}</p>
                ) : null}
              </div>
              <div className="space-y-1.5 sm:col-span-3">
                <Label>Kod</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Oto" />
              </div>
              <div className="space-y-1.5 sm:col-span-3">
                <Label>Tür</Label>
                <Select value={type} onValueChange={(v) => setType(v as BomType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BOM_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {BOM_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-6">
                <Label>Ad</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Reçete adı" />
              </div>
              <div className="space-y-1.5 sm:col-span-3">
                <Label>Çıktı Miktarı</Label>
                <Input type="number" value={outputQuantity} onChange={(e) => setOutputQuantity(e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-3">
                <Label>Birim</Label>
                <Input value={unit} onChange={(e) => setUnit(e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-6">
                <Label>Tüketim Politikası</Label>
                <Select
                  value={consumptionPolicy}
                  onValueChange={(v) => setConsumptionPolicy(v as ConsumptionPolicy)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONSUMPTION_POLICIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {CONSUMPTION_POLICY_LABELS[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-6">
                <Label>Notlar</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opsiyonel" />
              </div>
            </CardContent>
          </Card>

          {/* Components */}
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm">
                Bileşenler <span className="text-muted-foreground">({components.length})</span>
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setComponents((r) => [...r, emptyComp()])}>
                <Plus className="size-4" /> Satır ekle
              </Button>
            </CardHeader>
            <CardContent className="px-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-2xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-2 text-left font-medium">Bileşen</th>
                      <th className="w-24 px-2 py-2 text-right font-medium">Miktar</th>
                      <th className="w-24 px-2 py-2 text-left font-medium">Birim</th>
                      <th className="w-20 px-2 py-2 text-right font-medium">Fire %</th>
                      <th className="w-40 px-2 py-2 text-left font-medium">Operasyon</th>
                      <th className="w-24 px-2 py-2 text-center font-medium">Opsiyonel</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {components.map((c, i) => (
                      <tr key={c.key} className="border-b align-top last:border-0">
                        <td className="px-3 py-2">
                          <ProductPickerField
                            value={c.productId}
                            onChange={(u) =>
                              setComp(i, {
                                productId: u?.productId ?? null,
                                name: u?.label ?? '',
                                code: u?.code ?? '',
                                unit: u?.unit || c.unit,
                              })
                            }
                            placeholder="Bileşen seç…"
                          />
                          {c.name ? (
                            <p className="mt-1 text-2xs text-muted-foreground">{c.name}</p>
                          ) : null}
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            type="number"
                            value={c.quantity}
                            onChange={(e) => setComp(i, { quantity: e.target.value })}
                            className="h-9 text-right tabular-nums"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input value={c.unit} onChange={(e) => setComp(i, { unit: e.target.value })} className="h-9" />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            type="number"
                            value={c.scrapPct}
                            onChange={(e) => setComp(i, { scrapPct: e.target.value })}
                            className="h-9 text-right tabular-nums"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Select
                            value={c.operationRef == null ? NONE : String(c.operationRef)}
                            onValueChange={(v) => setComp(i, { operationRef: v === NONE ? null : Number(v) })}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NONE}>—</SelectItem>
                              {opOptions.map((o) => (
                                <SelectItem key={o.seq} value={String(o.seq)}>
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <Checkbox
                            checked={c.isOptional}
                            onCheckedChange={(v) => setComp(i, { isOptional: v === true })}
                          />
                        </td>
                        <td className="px-1 align-middle">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() =>
                              setComponents((r) => (r.length > 1 ? r.filter((_, idx) => idx !== i) : r))
                            }
                            aria-label="Sil"
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Operations */}
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm">
                Operasyonlar (Rota) <span className="text-muted-foreground">({operations.length})</span>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOperations((r) => [...r, emptyOp((r.at(-1)?.sequence ? Number(r.at(-1)!.sequence) : 0) + 10)])}
              >
                <Plus className="size-4" /> Satır ekle
              </Button>
            </CardHeader>
            <CardContent className="px-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[960px] border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-2xs uppercase tracking-wide text-muted-foreground">
                      <th className="w-20 px-3 py-2 text-left font-medium">Sıra</th>
                      <th className="px-2 py-2 text-left font-medium">Ad</th>
                      <th className="w-56 px-2 py-2 text-left font-medium">İş Merkezi</th>
                      <th className="w-24 px-2 py-2 text-right font-medium">Hazırlık dk</th>
                      <th className="w-28 px-2 py-2 text-right font-medium">Süre/adet dk</th>
                      <th className="w-32 px-2 py-2 text-left font-medium">Baz</th>
                      <th className="w-20 px-2 py-2 text-center font-medium">Kalite</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {operations.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                          Operasyon yok. Rota tanımlamak için satır ekleyin.
                        </td>
                      </tr>
                    ) : (
                      operations.map((o, i) => (
                        <tr key={o.key} className="border-b align-top last:border-0">
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              value={o.sequence}
                              onChange={(e) => setOp(i, { sequence: e.target.value })}
                              className="h-9 text-right tabular-nums"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <Input value={o.name} onChange={(e) => setOp(i, { name: e.target.value })} className="h-9" placeholder="Örn. Kesim" />
                          </td>
                          <td className="px-2 py-2">
                            <WorkCenterSelect value={o.workCenterId} onChange={(id) => setOp(i, { workCenterId: id })} />
                          </td>
                          <td className="px-2 py-2">
                            <Input type="number" value={o.setupTimeMinutes} onChange={(e) => setOp(i, { setupTimeMinutes: e.target.value })} className="h-9 text-right tabular-nums" />
                          </td>
                          <td className="px-2 py-2">
                            <Input type="number" value={o.timePerUnitMinutes} onChange={(e) => setOp(i, { timePerUnitMinutes: e.target.value })} className="h-9 text-right tabular-nums" />
                          </td>
                          <td className="px-2 py-2">
                            <Select value={o.timeBasis} onValueChange={(v) => setOp(i, { timeBasis: v as OperationTimeBasis })}>
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TIME_BASES.map((t) => (
                                  <SelectItem key={t} value={t}>
                                    {TIME_BASIS_LABELS[t]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <Checkbox
                              checked={o.qualityCheckRequired}
                              onCheckedChange={(v) => setOp(i, { qualityCheckRequired: v === true })}
                            />
                          </td>
                          <td className="px-1 align-middle">
                            <Button variant="ghost" size="icon-sm" onClick={() => setOperations((r) => r.filter((_, idx) => idx !== i))} aria-label="Sil">
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Byproducts */}
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm">
                Yan Ürünler <span className="text-muted-foreground">({byproducts.length})</span>
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setByproducts((r) => [...r, emptyByproduct()])}>
                <Plus className="size-4" /> Satır ekle
              </Button>
            </CardHeader>
            <CardContent className="px-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-2xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-2 text-left font-medium">Ürün</th>
                      <th className="w-24 px-2 py-2 text-right font-medium">Miktar</th>
                      <th className="w-24 px-2 py-2 text-left font-medium">Birim</th>
                      <th className="w-28 px-2 py-2 text-right font-medium">Maliyet Payı %</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {byproducts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                          Yan ürün yok.
                        </td>
                      </tr>
                    ) : (
                      byproducts.map((b, i) => (
                        <tr key={b.key} className="border-b align-top last:border-0">
                          <td className="px-3 py-2">
                            <ProductPickerField
                              value={b.productId}
                              onChange={(u) => setBp(i, { productId: u?.productId ?? null, name: u?.label ?? '', unit: u?.unit || b.unit })}
                              placeholder="Ürün seç…"
                            />
                            {b.name ? <p className="mt-1 text-2xs text-muted-foreground">{b.name}</p> : null}
                          </td>
                          <td className="px-2 py-2">
                            <Input type="number" value={b.quantity} onChange={(e) => setBp(i, { quantity: e.target.value })} className="h-9 text-right tabular-nums" />
                          </td>
                          <td className="px-2 py-2">
                            <Input value={b.unit} onChange={(e) => setBp(i, { unit: e.target.value })} className="h-9" />
                          </td>
                          <td className="px-2 py-2">
                            <Input type="number" value={b.costSharePct} onChange={(e) => setBp(i, { costSharePct: e.target.value })} className="h-9 text-right tabular-nums" />
                          </td>
                          <td className="px-1 align-middle">
                            <Button variant="ghost" size="icon-sm" onClick={() => setByproducts((r) => r.filter((_, idx) => idx !== i))} aria-label="Sil">
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className={cn('flex justify-end gap-2 pb-4')}>{actions}</div>
        </div>
      </PageWrapper>
    </PermissionRequired>
  )
}
