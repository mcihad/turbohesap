import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  PRODUCTION_PRIORITY_LABELS,
  ProductionPermissions,
  toApiError,
  type ManufacturingOrderDto,
  type ProductionOrderType,
  type ProductionPriority,
  type ProductionSourceMode,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Textarea } from '@/components/ui/textarea'
import { ProductPickerField } from '@/components/product-picker/product-picker-field'
import { BranchSelect } from './pickers'

const PRIORITIES: ProductionPriority[] = ['low', 'normal', 'high', 'urgent']
const ORDER_TYPES: ProductionOrderType[] = ['standard', 'subcontract']
const TYPE_LABELS: Record<ProductionOrderType, string> = {
  standard: 'Standart',
  subcontract: 'Fason',
}

export function MoCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (mo: ManufacturingOrderDto) => void
}) {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canWrite = hasPermission(ProductionPermissions.ordersWrite)

  const [sourceMode, setSourceMode] = React.useState<ProductionSourceMode>('mts')
  const [productId, setProductId] = React.useState<string | null>(null)
  const [productLabel, setProductLabel] = React.useState('')
  const [unit, setUnit] = React.useState('Adet')
  const [quantity, setQuantity] = React.useState('1')
  const [type, setType] = React.useState<ProductionOrderType>('standard')
  const [priority, setPriority] = React.useState<ProductionPriority>('normal')
  const [targetBranchId, setTargetBranchId] = React.useState('')
  const [componentSourceBranchId, setComponentSourceBranchId] = React.useState('')
  const [dueDate, setDueDate] = React.useState('')
  const [plannedStartDate, setPlannedStartDate] = React.useState('')
  const [notes, setNotes] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setSourceMode('mts')
    setProductId(null)
    setProductLabel('')
    setUnit('Adet')
    setQuantity('1')
    setType('standard')
    setPriority('normal')
    setTargetBranchId('')
    setComponentSourceBranchId('')
    setDueDate('')
    setPlannedStartDate('')
    setNotes('')
  }, [open])

  const mutation = useMutation({
    mutationFn: () => {
      if (!productId) throw new Error('Mamul seçilmelidir')
      const qty = Number(quantity) || 0
      if (qty <= 0) throw new Error('Miktar 0’dan büyük olmalı')
      if (sourceMode === 'mto') {
        return api.production.orders.createFromDemand({
          productId,
          quantity: qty,
          targetBranchId: targetBranchId || null,
          componentSourceBranchId: componentSourceBranchId || null,
          dueDate: dueDate || null,
          priority,
          notes: notes.trim() || null,
        })
      }
      return api.production.orders.create({
        productId,
        plannedQuantity: qty,
        unit: unit.trim() || undefined,
        type,
        sourceMode: 'mts',
        priority,
        targetBranchId: targetBranchId || null,
        componentSourceBranchId: componentSourceBranchId || null,
        dueDate: dueDate || null,
        plannedStartDate: plannedStartDate || null,
        notes: notes.trim() || null,
      })
    },
    onSuccess: (mo) => {
      toast.success('Üretim emri oluşturuldu')
      void qc.invalidateQueries({ queryKey: ['production', 'orders'] })
      onOpenChange(false)
      onCreated(mo)
    },
    onError: (e) => toast.error('Oluşturulamadı', { description: toApiError(e).message }),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Yeni Üretim Emri</DialogTitle>
          <DialogDescription>
            Aktif reçete otomatik kullanılır. Onaylandığında reçete patlatılıp bileşenler rezerve edilir.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Kaynak</Label>
            <ToggleGroup
              type="single"
              variant="outline"
              value={sourceMode}
              onValueChange={(v) => {
                if (v) setSourceMode(v as ProductionSourceMode)
              }}
              className="w-full"
            >
              <ToggleGroupItem value="mts" className="flex-1">
                Stoğa (MTS)
              </ToggleGroupItem>
              <ToggleGroupItem value="mto" className="flex-1">
                Siparişe (MTO)
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="space-y-1.5">
            <Label>Mamul</Label>
            <ProductPickerField
              value={productId}
              onChange={(u) => {
                setProductId(u?.productId ?? null)
                setProductLabel(u?.label ?? '')
                if (u?.unit) setUnit(u.unit)
              }}
              placeholder="Mamul seç…"
            />
            {productLabel ? <p className="text-xs text-muted-foreground">{productLabel}</p> : null}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="mo-qty">Planlanan Miktar</Label>
              <Input id="mo-qty" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="text-right tabular-nums" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mo-unit">Birim</Label>
              <Input id="mo-unit" value={unit} onChange={(e) => setUnit(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {sourceMode === 'mts' ? (
              <div className="space-y-1.5">
                <Label>Tür</Label>
                <Select value={type} onValueChange={(v) => setType(v as ProductionOrderType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label>Öncelik</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as ProductionPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PRODUCTION_PRIORITY_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Hedef Şube (mamul girişi)</Label>
              <BranchSelect value={targetBranchId} onChange={setTargetBranchId} noneLabel="Varsayılan" />
            </div>
            <div className="space-y-1.5">
              <Label>Bileşen Kaynak Şubesi</Label>
              <BranchSelect value={componentSourceBranchId} onChange={setComponentSourceBranchId} noneLabel="Varsayılan" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {sourceMode === 'mts' ? (
              <div className="space-y-1.5">
                <Label htmlFor="mo-start">Planlanan Başlangıç</Label>
                <Input id="mo-start" type="date" value={plannedStartDate} onChange={(e) => setPlannedStartDate(e.target.value)} />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="mo-due">Termin</Label>
              <Input id="mo-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mo-notes">Notlar</Label>
            <Textarea id="mo-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!canWrite || mutation.isPending}>
            Oluştur
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
