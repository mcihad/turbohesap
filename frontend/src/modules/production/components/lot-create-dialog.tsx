import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  ProductionPermissions,
  toApiError,
  type LotKind,
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
import { ProductPickerField } from '@/components/product-picker/product-picker-field'

const KIND_LABELS: Record<LotKind, string> = { lot: 'Parti (Lot)', serial: 'Seri No' }

export function LotCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}) {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canManage = hasPermission(ProductionPermissions.qualityManage)

  const [productId, setProductId] = React.useState<string | null>(null)
  const [lotNo, setLotNo] = React.useState('')
  const [kind, setKind] = React.useState<LotKind>('lot')

  React.useEffect(() => {
    if (!open) return
    setProductId(null)
    setLotNo('')
    setKind('lot')
  }, [open])

  const mutation = useMutation({
    mutationFn: () => {
      if (!productId) throw new Error('Ürün seçilmelidir')
      if (!lotNo.trim()) throw new Error('Lot / seri no zorunludur')
      return api.production.lots.create({ productId, lotNo: lotNo.trim(), kind })
    },
    onSuccess: () => {
      toast.success('Lot oluşturuldu')
      void qc.invalidateQueries({ queryKey: ['production', 'lots'] })
      onOpenChange(false)
      onCreated()
    },
    onError: (e) => toast.error('Oluşturulamadı', { description: toApiError(e).message }),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Yeni Lot / Seri</DialogTitle>
          <DialogDescription>Parti veya seri numarası oluşturun. Üretimde de otomatik oluşturulur.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Ürün</Label>
            <ProductPickerField value={productId} onChange={(u) => setProductId(u?.productId ?? null)} placeholder="Ürün seç…" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lot-no">Lot / Seri No</Label>
            <Input id="lot-no" value={lotNo} onChange={(e) => setLotNo(e.target.value)} placeholder="Örn. L-2026-001" />
          </div>
          <div className="space-y-1.5">
            <Label>Tür</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as LotKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lot">{KIND_LABELS.lot}</SelectItem>
                <SelectItem value="serial">{KIND_LABELS.serial}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!canManage || mutation.isPending}>
            Oluştur
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
