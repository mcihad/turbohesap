import * as React from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  toApiError,
  type InvoiceType,
  type PaymentMethod,
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

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function InvoicePaymentDialog({
  open,
  onOpenChange,
  invoiceId,
  type,
  defaultAmount,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoiceId: string
  type: InvoiceType
  defaultAmount: number
  onSaved: () => void
}) {
  const noun = type === 'sales' ? 'Tahsilat' : 'Ödeme'

  const [date, setDate] = React.useState(today())
  const [amount, setAmount] = React.useState(String(defaultAmount))
  const [method, setMethod] = React.useState<PaymentMethod>('cash')
  const [accountId, setAccountId] = React.useState('')
  const [description, setDescription] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setDate(today())
    setAmount(String(defaultAmount))
    setMethod('cash')
    setAccountId('')
    setDescription('')
  }, [open, defaultAmount])

  // Reset selected account whenever the method switches (cash<->bank lists differ).
  React.useEffect(() => {
    setAccountId('')
  }, [method])

  const cashQuery = useQuery({
    queryKey: ['finance', 'cash-accounts'],
    queryFn: () => api.finance.cashAccounts.list(),
    enabled: open && method === 'cash',
  })
  const bankQuery = useQuery({
    queryKey: ['finance', 'bank-accounts'],
    queryFn: () => api.finance.bankAccounts.list(),
    enabled: open && method === 'bank',
  })

  const accounts =
    method === 'cash'
      ? (cashQuery.data ?? []).map((a) => ({ id: a.id, name: a.name }))
      : (bankQuery.data ?? []).map((a) => ({ id: a.id, name: a.name }))

  const save = useMutation({
    mutationFn: () =>
      api.invoices.addPayment(invoiceId, {
        date,
        amount: Number(amount) || 0,
        method,
        cashAccountId: method === 'cash' ? accountId : null,
        bankAccountId: method === 'bank' ? accountId : null,
        description: description.trim() || null,
      }),
    onSuccess: () => {
      toast.success(`${noun} kaydedildi`)
      onOpenChange(false)
      onSaved()
    },
    onError: (e) => toast.error('İşlem başarısız', { description: toApiError(e).message }),
  })

  const canSave = !!accountId && Number(amount) > 0 && !!date

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{noun} ekle</DialogTitle>
          <DialogDescription>
            Kasa veya banka hesabına {type === 'sales' ? 'tahsilat' : 'ödeme'} kaydı oluşturun. Cari
            ve hesap bakiyesi güncellenir.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tarih</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Tutar</Label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Yöntem</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Kasa</SelectItem>
                  <SelectItem value="bank">Banka</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{method === 'cash' ? 'Kasa' : 'Banka hesabı'}</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Hesap seçin" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Açıklama</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !canSave}>
            Kaydet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
