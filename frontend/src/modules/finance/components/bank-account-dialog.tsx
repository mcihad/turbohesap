import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { toApiError, type BankAccountDto, type CreateBankAccountRequest } from '@turbohesap/shared'
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
import { IbanInput } from '@/components/ui/iban-input'

interface BankAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: BankAccountDto | null
  onSuccess: () => void
}

export function BankAccountDialog({
  open,
  onOpenChange,
  editing,
  onSuccess,
}: BankAccountDialogProps) {
  const [name, setName] = React.useState('')
  const [bankName, setBankName] = React.useState('')
  const [branchName, setBranchName] = React.useState('')
  const [branchCode, setBranchCode] = React.useState('')
  const [accountNumber, setAccountNumber] = React.useState('')
  const [iban, setIban] = React.useState('')
  const [currency, setCurrency] = React.useState('TRY')
  const [openingBalance, setOpeningBalance] = React.useState('0')
  const [description, setDescription] = React.useState('')
  const [isActive, setIsActive] = React.useState(true)

  React.useEffect(() => {
    if (editing) {
      setName(editing.name)
      setBankName(editing.bankName)
      setBranchName(editing.branchName)
      setBranchCode(editing.branchCode)
      setAccountNumber(editing.accountNumber)
      setIban(editing.iban)
      setCurrency(editing.currency)
      setOpeningBalance(String(editing.openingBalance))
      setDescription(editing.description)
      setIsActive(editing.isActive)
    } else {
      setName('')
      setBankName('')
      setBranchName('')
      setBranchCode('')
      setAccountNumber('')
      setIban('')
      setCurrency('TRY')
      setOpeningBalance('0')
      setDescription('')
      setIsActive(true)
    }
  }, [editing, open])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: CreateBankAccountRequest = {
        name: name.trim(),
        bankName: bankName.trim(),
        branchName: branchName.trim(),
        branchCode: branchCode.trim(),
        accountNumber: accountNumber.trim(),
        iban,
        currency,
        openingBalance: Number(openingBalance) || 0,
        description: description.trim(),
        isActive,
      }
      if (editing) {
        await api.finance.bankAccounts.update(editing.id, payload)
      } else {
        await api.finance.bankAccounts.create(payload)
      }
    },
    onSuccess: () => {
      toast.success(editing ? 'Banka hesabı güncellendi' : 'Banka hesabı oluşturuldu')
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
      toast.error('Hesap adı boş bırakılamaz')
      return
    }
    if (!bankName.trim()) {
      toast.error('Banka adı boş bırakılamaz')
      return
    }
    if (!iban.trim() || iban.length < 26) {
      toast.error('Geçerli bir IBAN girilmelidir (TR + 24 hane)')
      return
    }
    saveMutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{editing ? 'Hesabı Düzenle' : 'Yeni Banka Hesabı Ekle'}</DialogTitle>
            <DialogDescription>
              Banka hesabının detaylarını ve IBAN bilgisini girin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="name">Hesap Adı / Tanımı</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Örn: Akbank Ticari Hesabı"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bankName">Banka Adı</Label>
                <Input
                  id="bankName"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Örn: Akbank"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="branchName">Şube Adı</Label>
                <Input
                  id="branchName"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="Örn: Kadıköy"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="branchCode">Şube Kodu</Label>
                <Input
                  id="branchCode"
                  value={branchCode}
                  onChange={(e) => setBranchCode(e.target.value)}
                  placeholder="Örn: 123"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountNumber">Hesap Numarası</Label>
                <Input
                  id="accountNumber"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Örn: 1234567"
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="iban">IBAN</Label>
                <IbanInput
                  id="iban"
                  value={iban}
                  onChange={setIban}
                />
              </div>

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
                placeholder="Varsa hesap ile ilgili açıklama yazın..."
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
              <Label htmlFor="isActive">Hesap Aktif</Label>
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
