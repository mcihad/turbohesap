import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  INSTRUMENT_DIRECTIONS,
  INSTRUMENT_TYPES,
  toApiError,
  type CreateFinancialInstrumentRequest,
  type FinancialInstrumentDto,
  type InstrumentDirection,
  type InstrumentType,
} from '@turbohesap/shared'

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
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ContactPickerField } from '@/components/contact-picker/contact-picker-field'
import { instrumentDirectionLabel, instrumentTypeLabel } from '../instrument-labels'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

interface InstrumentFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: FinancialInstrumentDto | null
  onSuccess: () => void
}

export function InstrumentFormDialog({
  open,
  onOpenChange,
  editing,
  onSuccess,
}: InstrumentFormDialogProps) {
  const [instrumentType, setInstrumentType] = React.useState<InstrumentType>('check')
  const [direction, setDirection] = React.useState<InstrumentDirection>('received')
  const [contactId, setContactId] = React.useState<string | null>(null)
  const [amount, setAmount] = React.useState('0')
  const [currencyCode, setCurrencyCode] = React.useState('TRY')
  const [issueDate, setIssueDate] = React.useState(today())
  const [dueDate, setDueDate] = React.useState(today())
  const [instrumentNo, setInstrumentNo] = React.useState('')
  const [bankName, setBankName] = React.useState('')
  const [bankBranch, setBankBranch] = React.useState('')
  const [accountNo, setAccountNo] = React.useState('')
  const [drawerName, setDrawerName] = React.useState('')
  const [notes, setNotes] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    if (editing) {
      setInstrumentType(editing.instrumentType)
      setDirection(editing.direction)
      setContactId(editing.contactId)
      setAmount(String(editing.amount))
      setCurrencyCode(editing.currencyCode)
      setIssueDate(editing.issueDate.slice(0, 10))
      setDueDate(editing.dueDate.slice(0, 10))
      setInstrumentNo(editing.instrumentNo)
      setBankName(editing.bankName ?? '')
      setBankBranch(editing.bankBranch ?? '')
      setAccountNo(editing.accountNo ?? '')
      setDrawerName(editing.drawerName ?? '')
      setNotes(editing.notes ?? '')
    } else {
      setInstrumentType('check')
      setDirection('received')
      setContactId(null)
      setAmount('0')
      setCurrencyCode('TRY')
      setIssueDate(today())
      setDueDate(today())
      setInstrumentNo('')
      setBankName('')
      setBankBranch('')
      setAccountNo('')
      setDrawerName('')
      setNotes('')
    }
  }, [editing, open])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const isCheck = instrumentType === 'check'
      const payload: CreateFinancialInstrumentRequest = {
        instrumentType,
        direction,
        contactId: contactId as string,
        amount: Number(amount) || 0,
        currencyCode,
        issueDate,
        dueDate,
        instrumentNo: instrumentNo.trim(),
        bankName: isCheck ? bankName.trim() || null : null,
        bankBranch: isCheck ? bankBranch.trim() || null : null,
        accountNo: isCheck ? accountNo.trim() || null : null,
        drawerName: drawerName.trim() || null,
        notes: notes.trim() || null,
      }
      if (editing) {
        const { instrumentType: _t, direction: _d, ...updatePayload } = payload
        await api.finance.instruments.update(editing.id, updatePayload)
      } else {
        await api.finance.instruments.create(payload)
      }
    },
    onSuccess: () => {
      toast.success(editing ? 'Çek/Senet güncellendi' : 'Çek/Senet oluşturuldu')
      onOpenChange(false)
      onSuccess()
    },
    onError: (e) => {
      toast.error('İşlem başarısız', { description: toApiError(e).message })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!contactId) {
      toast.error('Cari seçilmelidir')
      return
    }
    if (!(Number(amount) > 0)) {
      toast.error('Tutar sıfırdan büyük olmalıdır')
      return
    }
    saveMutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{editing ? 'Çek/Senet Düzenle' : 'Yeni Çek/Senet'}</DialogTitle>
            <DialogDescription>Çek veya senet portföy kaydının detaylarını girin.</DialogDescription>
          </DialogHeader>

          <div className="max-h-[65vh] space-y-4 overflow-y-auto px-1 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="instrumentType">Tür</Label>
                <Select
                  value={instrumentType}
                  onValueChange={(v) => setInstrumentType(v as InstrumentType)}
                  disabled={!!editing}
                >
                  <SelectTrigger id="instrumentType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INSTRUMENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {instrumentTypeLabel(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="direction">Yön</Label>
                <Select
                  value={direction}
                  onValueChange={(v) => setDirection(v as InstrumentDirection)}
                  disabled={!!editing}
                >
                  <SelectTrigger id="direction">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INSTRUMENT_DIRECTIONS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {instrumentDirectionLabel(d)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cari</Label>
              <ContactPickerField
                value={contactId}
                onChange={(contact) => setContactId(contact?.id ?? null)}
                placeholder="Cari seçin"
                title="Çek/Senet için cari seç"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Tutar</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currencyCode">Para Birimi</Label>
                <Select value={currencyCode} onValueChange={setCurrencyCode}>
                  <SelectTrigger id="currencyCode">
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="issueDate">Düzenleme Tarihi</Label>
                <Input
                  id="issueDate"
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Vade Tarihi</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instrumentNo">{instrumentType === 'check' ? 'Çek No' : 'Senet No'}</Label>
              <Input
                id="instrumentNo"
                value={instrumentNo}
                onChange={(e) => setInstrumentNo(e.target.value)}
                placeholder="Örn: 0012345"
              />
            </div>

            {instrumentType === 'check' ? (
              <div className="space-y-4 rounded-lg border p-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bankName">Banka</Label>
                    <Input id="bankName" value={bankName} onChange={(e) => setBankName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bankBranch">Şube</Label>
                    <Input id="bankBranch" value={bankBranch} onChange={(e) => setBankBranch(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountNo">Hesap No</Label>
                  <Input id="accountNo" value={accountNo} onChange={(e) => setAccountNo(e.target.value)} />
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="drawerName">{direction === 'received' ? 'Keşideci' : 'Lehtar'}</Label>
              <Input
                id="drawerName"
                value={drawerName}
                onChange={(e) => setDrawerName(e.target.value)}
                placeholder="Çeki/senedi düzenleyen kişi/kurum"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notlar</Label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
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
