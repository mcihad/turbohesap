import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  toApiError,
  type BranchDto,
  type StockMovementTypeDto,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
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

const NONE = '__none__'

const today = () => new Date().toISOString().slice(0, 10)

const directionLabel = (d: StockMovementTypeDto['direction']) =>
  d === 'in' ? 'Giriş' : 'Çıkış'

/**
 * Records a single stock movement (Stok Hareketi) of a pre-chosen type. The
 * movement type (and its direction) is fixed by the caller and shown read-only;
 * the operator only fills branch, quantity, date and an optional note.
 */
export function StockMovementDialog({
  open,
  onOpenChange,
  productId,
  movementType,
  branches,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  productId: string
  /** The chosen movement type; its name + direction are shown read-only. */
  movementType: StockMovementTypeDto | null
  branches: BranchDto[]
  onSaved: () => void
}) {
  const [branchId, setBranchId] = React.useState<string>(NONE)
  const [quantity, setQuantity] = React.useState('1')
  const [date, setDate] = React.useState(today)
  const [description, setDescription] = React.useState('')

  // Reset the form whenever the dialog opens for a (new) movement type.
  React.useEffect(() => {
    if (!open) return
    setBranchId(NONE)
    setQuantity('1')
    setDate(today())
    setDescription('')
  }, [open, movementType?.id])

  const save = useMutation({
    mutationFn: () =>
      api.inventory.stockMovements.create({
        productId,
        movementTypeId: movementType!.id,
        quantity: Number(quantity) || 0,
        branchId: branchId === NONE ? null : branchId,
        date,
        description: description.trim() || null,
      }),
    onSuccess: () => {
      toast.success('Stok hareketi kaydedildi')
      onOpenChange(false)
      onSaved()
    },
    onError: (e) => toast.error('Kaydetme başarısız', { description: toApiError(e).message }),
  })

  const qty = Number(quantity)
  const canSave = !!movementType && qty > 0 && !save.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Stok Hareketi</DialogTitle>
          <DialogDescription>
            {movementType
              ? `${movementType.name} (${directionLabel(movementType.direction)})`
              : 'Hareket tipi seçilmedi.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="space-y-1.5">
            <Label>Şube</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger>
                <SelectValue placeholder="Şube" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Genel (şubesiz)</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="mv-qty">Miktar</Label>
              <Input
                id="mv-qty"
                type="number"
                min={0}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mv-date">Tarih</Label>
              <Input
                id="mv-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mv-desc">Açıklama</Label>
            <Input
              id="mv-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="İsteğe bağlı"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button onClick={() => save.mutate()} disabled={!canSave}>
            Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
