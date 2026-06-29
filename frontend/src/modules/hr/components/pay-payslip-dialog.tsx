import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { toApiError, type PayslipDto } from '@turbohesap/shared'

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
import { formatMoney } from '../format'

type AccountKind = 'cash' | 'bank'

export function PayPayslipDialog({
  payslip,
  open,
  onOpenChange,
}: {
  payslip: PayslipDto | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const qc = useQueryClient()
  const [kind, setKind] = React.useState<AccountKind>('bank')
  const [accountId, setAccountId] = React.useState('')
  const [date, setDate] = React.useState(() => new Date().toISOString().slice(0, 10))

  const cashQuery = useQuery({
    queryKey: ['finance', 'cashAccounts'],
    queryFn: () => api.finance.cashAccounts.list(),
    enabled: open,
  })
  const bankQuery = useQuery({
    queryKey: ['finance', 'bankAccounts'],
    queryFn: () => api.finance.bankAccounts.list(),
    enabled: open,
  })

  React.useEffect(() => {
    if (open) {
      setAccountId('')
      setDate(new Date().toISOString().slice(0, 10))
    }
  }, [open])

  const accounts = kind === 'cash' ? (cashQuery.data ?? []) : (bankQuery.data ?? [])

  const pay = useMutation({
    mutationFn: () => {
      if (!payslip) throw new Error('Pusula bulunamadı')
      if (!accountId) throw new Error('Bir hesap seçilmelidir')
      return api.hr.payroll.pay(payslip.id, {
        cashAccountId: kind === 'cash' ? accountId : null,
        bankAccountId: kind === 'bank' ? accountId : null,
        date,
      })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['hr'] })
      void qc.invalidateQueries({ queryKey: ['finance'] })
      toast.success('Maaş ödemesi kaydedildi')
      onOpenChange(false)
    },
    onError: (e) => toast.error('Ödenemedi', { description: toApiError(e).message }),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Maaş Ödemesi</DialogTitle>
          <DialogDescription>
            {payslip
              ? `${payslip.employeeName} — net ${formatMoney(payslip.net)}`
              : 'Net maaşı kasa/banka hesabından ödeyin.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">Hesap Türü</Label>
              <Select
                value={kind}
                onValueChange={(v) => {
                  setKind(v as AccountKind)
                  setAccountId('')
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Banka</SelectItem>
                  <SelectItem value="cash">Kasa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">Tarih</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block text-xs text-muted-foreground">Hesap</Label>
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button disabled={pay.isPending} onClick={() => pay.mutate()}>
            Öde
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
