import * as React from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'

import { toApiError, type FinancialInstrumentDto, type SettleInstrumentRequest } from '@turbohesap/shared'

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

type SettleMethod = 'cash' | 'bank'

interface InstrumentSettleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  instrument: FinancialInstrumentDto | null
  /** `collect` for received (tahsilat), `pay` for issued (ödeme). */
  action: 'collect' | 'pay'
  onSuccess: () => void
}

export function InstrumentSettleDialog({
  open,
  onOpenChange,
  instrument,
  action,
  onSuccess,
}: InstrumentSettleDialogProps) {
  const noun = action === 'collect' ? 'Tahsilat' : 'Ödeme'

  const [method, setMethod] = React.useState<SettleMethod>('cash')
  const [accountId, setAccountId] = React.useState('')
  const [date, setDate] = React.useState(today())
  const [description, setDescription] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setMethod('cash')
    setAccountId('')
    setDate(today())
    setDescription('')
  }, [open, instrument?.id])

  // Reset the selected account whenever the method switches (cash<->bank lists differ).
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

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!instrument) throw new Error('Kayıt bulunamadı')
      const input: SettleInstrumentRequest = {
        cashAccountId: method === 'cash' ? accountId : null,
        bankAccountId: method === 'bank' ? accountId : null,
        date,
        description: description.trim() || null,
      }
      return action === 'collect'
        ? api.finance.instruments.collect(instrument.id, input)
        : api.finance.instruments.pay(instrument.id, input)
    },
    onSuccess: () => {
      toast.success(`${noun} kaydedildi`)
      onOpenChange(false)
      onSuccess()
    },
    onError: (e) => {
      toast.error('İşlem başarısız', { description: toApiError(e).message })
    },
  })

  const canSave = !!accountId && !!date

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{noun}</DialogTitle>
          <DialogDescription>
            {action === 'collect'
              ? 'Çek/senet kasa veya banka hesabına tahsil edilsin. Cari ve hesap bakiyesi güncellenir.'
              : 'Çek/senet kasa veya banka hesabından ödensin. Cari ve hesap bakiyesi güncellenir.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Yöntem</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as SettleMethod)}>
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
            <Label>Tarih</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
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
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !canSave}>
            {saveMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
