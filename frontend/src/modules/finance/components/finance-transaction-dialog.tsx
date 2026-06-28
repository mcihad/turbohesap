import * as React from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ContactsPermissions,
  toApiError,
  type CreateFinanceTransactionRequest,
  type FinanceTransactionDto,
} from '@turbohesap/shared'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
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

const NO_CONTACT = '__none__'

interface FinanceTransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cashAccountId?: string | null
  bankAccountId?: string | null
  editing: FinanceTransactionDto | null
  onSuccess: () => void
}

export function FinanceTransactionDialog({
  open,
  onOpenChange,
  cashAccountId = null,
  bankAccountId = null,
  editing,
  onSuccess,
}: FinanceTransactionDialogProps) {
  const { hasPermission } = useAuth()
  const [type, setType] = React.useState<'in' | 'out'>('in')
  const [amount, setAmount] = React.useState('')
  const [date, setDate] = React.useState(() => new Date().toISOString().substring(0, 16))
  const [description, setDescription] = React.useState('')
  const [contactId, setContactId] = React.useState<string>(NO_CONTACT)

  const contactsQuery = useQuery({
    queryKey: ['contacts', 'contacts'],
    queryFn: () => api.contacts.contacts.list(),
    enabled: open && hasPermission(ContactsPermissions.contactsRead),
  })

  React.useEffect(() => {
    if (editing) {
      setType(editing.type)
      setAmount(String(editing.amount))
      setDate(editing.date.substring(0, 16))
      setDescription(editing.description)
      setContactId(editing.contactId ?? NO_CONTACT)
    } else {
      setType('in')
      setAmount('')
      setDate(new Date().toISOString().substring(0, 16))
      setDescription('')
      setContactId(NO_CONTACT)
    }
  }, [editing, open])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: CreateFinanceTransactionRequest = {
        cashAccountId,
        bankAccountId,
        contactId: contactId === NO_CONTACT ? null : contactId,
        type,
        amount: Number(amount) || 0,
        date: new Date(date).toISOString(),
        description: description.trim(),
      }
      if (editing) {
        await api.finance.transactions.update(editing.id, payload)
      } else {
        await api.finance.transactions.create(payload)
      }
    },
    onSuccess: () => {
      toast.success(editing ? 'İşlem güncellendi' : 'İşlem kaydedildi')
      onOpenChange(false)
      onSuccess()
    },
    onError: (e) => {
      toast.error('İşlem başarısız', { description: toApiError(e).message })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || Number(amount) <= 0) {
      toast.error('Geçerli bir tutar girilmelidir')
      return
    }
    if (!date) {
      toast.error('İşlem tarihi seçilmelidir')
      return
    }
    saveMutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{editing ? 'İşlemi Düzenle' : 'Yeni İşlem Ekle'}</DialogTitle>
            <DialogDescription>
              Kasa veya banka hareketi detaylarını girin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">İşlem Yönü</Label>
                <Select value={type} onValueChange={(val: 'in' | 'out') => setType(val)}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">Giriş (Tahsilat)</SelectItem>
                    <SelectItem value="out">Çıkış (Ödeme)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Tutar</Label>
                <Input
                  id="amount"
                  type="number"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Tarih</Label>
              <Input
                id="date"
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            {hasPermission(ContactsPermissions.contactsRead) ? (
              <div className="space-y-2">
                <Label htmlFor="contact">Cari (opsiyonel)</Label>
                <Select value={contactId} onValueChange={setContactId}>
                  <SelectTrigger id="contact">
                    <SelectValue placeholder="Cari seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CONTACT}>Cari yok</SelectItem>
                    {(contactsQuery.data ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="description">Açıklama</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="İşlem açıklaması girin..."
              />
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
