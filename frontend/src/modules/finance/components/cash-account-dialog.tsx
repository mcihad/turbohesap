import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { toApiError, type CashAccountDto, type CreateCashAccountRequest } from '@turbohesap/shared'
import { api } from '@/lib/api'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface CashAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: CashAccountDto | null
  onSuccess: () => void
}

export function CashAccountDialog({
  open,
  onOpenChange,
  editing,
  onSuccess,
}: CashAccountDialogProps) {
  const [name, setName] = React.useState('')
  const [currency, setCurrency] = React.useState('TRY')
  const [openingBalance, setOpeningBalance] = React.useState('0')
  const [description, setDescription] = React.useState('')
  const [isActive, setIsActive] = React.useState(true)

  React.useEffect(() => {
    if (editing) {
      setName(editing.name)
      setCurrency(editing.currency)
      setOpeningBalance(String(editing.openingBalance))
      setDescription(editing.description)
      setIsActive(editing.isActive)
    } else {
      setName('')
      setCurrency('TRY')
      setOpeningBalance('0')
      setDescription('')
      setIsActive(true)
    }
  }, [editing, open])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: CreateCashAccountRequest = {
        name: name.trim(),
        currency,
        openingBalance: Number(openingBalance) || 0,
        description: description.trim(),
        isActive,
      }
      if (editing) {
        await api.finance.cashAccounts.update(editing.id, payload)
      } else {
        await api.finance.cashAccounts.create(payload)
      }
    },
    onSuccess: () => {
      toast.success(editing ? 'Kasa hesabı güncellendi' : 'Kasa hesabı oluşturuldu')
      onOpenChange(false)
      onSuccess()
    },
    onError: (e) => {
      toast.error('İşlem başarısız', { description: toApiError(e).message })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Kasa adı boş bırakılamaz')
      return
    }
    saveMutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{editing ? 'Kasayı Düzenle' : 'Yeni Kasa Ekle'}</DialogTitle>
            <DialogDescription>
              Kasa hesabının detaylarını girin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Kasa Adı</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Örn: Merkez Kasa"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Para Birimi</Label>
                <Select value={currency} onValueChange={setCurrency} disabled={!!editing}>
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRY">TRY (₺)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="openingBalance">Açılış Tutarı</Label>
                <Input
                  id="openingBalance"
                  type="number"
                  step="any"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  placeholder="0.00"
                  disabled={!!editing}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Açıklama</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Varsa kasa ile ilgili açıklama yazın..."
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
              <Label htmlFor="isActive">Kasa Aktif</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
