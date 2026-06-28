import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { toApiError, VAT_RATES, type ProductDto } from '@turbohesap/shared'

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

// Minimal "create a product right here" dialog for the invoice line editor.
// Returns the created product so the caller can select it + prefill the line.
export function QuickProductDialog({
  open,
  onOpenChange,
  initialName = '',
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialName?: string
  onCreated: (product: ProductDto) => void
}) {
  const [name, setName] = React.useState('')
  const [code, setCode] = React.useState('')
  const [unit, setUnit] = React.useState('Adet')
  const [salePrice, setSalePrice] = React.useState('0')
  const [taxRate, setTaxRate] = React.useState('20')

  React.useEffect(() => {
    if (open) {
      setName(initialName)
      setCode('')
      setUnit('Adet')
      setSalePrice('0')
      setTaxRate('20')
    }
  }, [open, initialName])

  const save = useMutation({
    mutationFn: () =>
      api.inventory.products.create({
        name: name.trim(),
        code: code.trim() || `URN-${Date.now().toString().slice(-6)}`,
        unit,
        salePrice: Number(salePrice) || 0,
        taxRate: Number(taxRate) || 0,
      }),
    onSuccess: (product) => {
      toast.success('Ürün oluşturuldu')
      onOpenChange(false)
      onCreated(product)
    },
    onError: (e) => toast.error('Ürün oluşturulamadı', { description: toApiError(e).message }),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Hızlı ürün ekle</DialogTitle>
          <DialogDescription>Faturaya eklemek için yeni ürün oluşturun.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="space-y-1.5">
            <Label>Ürün adı</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Kod</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="otomatik" className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label>Birim</Label>
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Satış fiyatı</Label>
              <Input type="number" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>KDV %</Label>
              <Select value={taxRate} onValueChange={setTaxRate}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VAT_RATES.map((r) => <SelectItem key={r} value={String(r)}>%{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !name.trim()}>Oluştur ve ekle</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
