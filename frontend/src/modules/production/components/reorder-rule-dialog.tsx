import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  ProductionPermissions,
  toApiError,
  type ReorderRuleDto,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { ProductPickerField } from '@/components/product-picker/product-picker-field'
import { BranchSelect } from './pickers'

export function ReorderRuleDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: ReorderRuleDto | null
  onSaved: () => void
}) {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canPlan = hasPermission(ProductionPermissions.planningRun)

  const [productId, setProductId] = React.useState<string | null>(null)
  const [productLabel, setProductLabel] = React.useState('')
  const [branchId, setBranchId] = React.useState('')
  const [minQty, setMinQty] = React.useState('0')
  const [maxQty, setMaxQty] = React.useState('0')
  const [isActive, setIsActive] = React.useState(true)

  React.useEffect(() => {
    if (!open) return
    setProductId(editing?.productId ?? null)
    setProductLabel(editing?.productName ?? '')
    setBranchId(editing?.branchId ?? '')
    setMinQty(String(editing?.minQty ?? 0))
    setMaxQty(String(editing?.maxQty ?? 0))
    setIsActive(editing?.isActive ?? true)
  }, [open, editing])

  const mutation = useMutation({
    mutationFn: () => {
      if (!productId) throw new Error('Ürün seçilmelidir')
      const base = {
        branchId: branchId || null,
        minQty: Number(minQty) || 0,
        maxQty: Number(maxQty) || 0,
        isActive,
      }
      return editing
        ? api.production.reorderRules.update(editing.id, base)
        : api.production.reorderRules.create({ productId, ...base })
    },
    onSuccess: () => {
      toast.success(editing ? 'Kural güncellendi' : 'Kural eklendi')
      void qc.invalidateQueries({ queryKey: ['production', 'reorder-rules'] })
      onOpenChange(false)
      onSaved()
    },
    onError: (e) => toast.error('Kaydedilemedi', { description: toApiError(e).message }),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'Min/Max Kuralı Düzenle' : 'Yeni Min/Max Kuralı'}</DialogTitle>
          <DialogDescription>Stok min seviyesinin altına düşünce max’a tamamlanacak şekilde öneri üretilir.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Ürün</Label>
            {editing ? (
              <Input value={productLabel} disabled />
            ) : (
              <ProductPickerField
                value={productId}
                onChange={(u) => {
                  setProductId(u?.productId ?? null)
                  setProductLabel(u?.label ?? '')
                }}
                placeholder="Ürün seç…"
              />
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Şube</Label>
            <BranchSelect value={branchId} onChange={setBranchId} noneLabel="Tüm şubeler" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rr-min">Min Miktar</Label>
              <Input id="rr-min" type="number" value={minQty} onChange={(e) => setMinQty(e.target.value)} className="text-right tabular-nums" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rr-max">Max Miktar</Label>
              <Input id="rr-max" type="number" value={maxQty} onChange={(e) => setMaxQty(e.target.value)} className="text-right tabular-nums" />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <Label htmlFor="rr-active">Aktif</Label>
            <Checkbox id="rr-active" checked={isActive} onCheckedChange={(v) => setIsActive(v === true)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!canPlan || mutation.isPending}>
            Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
