import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  CONTACT_DOCUMENT_TYPES,
  toApiError,
  type ContactDocumentType,
  type ContactTransactionDto,
  type CreateContactTransactionRequest,
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
import { Textarea } from '@/components/ui/textarea'

const DOCUMENT_TYPE_LABELS: Record<ContactDocumentType, string> = {
  invoice: 'Fatura',
  payment: 'Ödeme',
  receipt: 'Tahsilat',
  opening: 'Açılış',
  adjustment: 'Düzeltme',
  return: 'İade',
}

type EntrySide = 'debit' | 'credit'

interface FormState {
  date: string
  documentType: ContactDocumentType
  documentNo: string
  description: string
  side: EntrySide
  amount: string
  dueDate: string
}

function todayInput(): string {
  return new Date().toISOString().substring(0, 10)
}

function emptyForm(): FormState {
  return {
    date: todayInput(), documentType: 'invoice', documentNo: '', description: '',
    side: 'debit', amount: '', dueDate: '',
  }
}

export function ContactTransactionDialog({
  open,
  onOpenChange,
  contactId,
  editing,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  contactId: string
  editing: ContactTransactionDto | null
  onSaved: () => void
}) {
  const [form, setForm] = React.useState<FormState>(emptyForm)

  React.useEffect(() => {
    if (!open) return
    setForm(
      editing
        ? {
            date: editing.date.substring(0, 10),
            documentType: editing.documentType,
            documentNo: editing.documentNo ?? '',
            description: editing.description ?? '',
            side: editing.credit > 0 ? 'credit' : 'debit',
            amount: String(editing.credit > 0 ? editing.credit : editing.debit),
            dueDate: editing.dueDate ? editing.dueDate.substring(0, 10) : '',
          }
        : emptyForm(),
    )
  }, [open, editing])

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const save = useMutation({
    mutationFn: () => {
      const amount = Number(form.amount) || 0
      const payload = {
        date: new Date(form.date).toISOString(),
        documentType: form.documentType,
        debit: form.side === 'debit' ? amount : 0,
        credit: form.side === 'credit' ? amount : 0,
        documentNo: form.documentNo || null,
        description: form.description || null,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
      }
      return editing
        ? api.contacts.transactions.update(editing.id, payload)
        : api.contacts.transactions.create({ contactId, ...payload } as CreateContactTransactionRequest)
    },
    onSuccess: () => {
      toast.success(editing ? 'Hareket güncellendi' : 'Hareket eklendi')
      onOpenChange(false)
      onSaved()
    },
    onError: (e) => toast.error('İşlem başarısız', { description: toApiError(e).message }),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto px-1 sm:max-w-lg">
        <div className="px-5">
          <DialogHeader>
            <DialogTitle>{editing ? 'Hareketi düzenle' : 'Yeni hareket'}</DialogTitle>
            <DialogDescription>Cari hesap hareketi (borç/alacak) kaydı.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tarih">
                <Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
              </Field>
              <Field label="Belge türü">
                <Select value={form.documentType} onValueChange={(v) => set('documentType', v as ContactDocumentType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONTACT_DOCUMENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{DOCUMENT_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field label="Belge no">
              <Input value={form.documentNo} onChange={(e) => set('documentNo', e.target.value)} />
            </Field>

            <Field label="Açıklama">
              <Textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} />
            </Field>

            <div className="grid grid-cols-[auto_1fr] gap-3">
              <Field label="Borç / Alacak">
                <Select value={form.side} onValueChange={(v) => set('side', v as EntrySide)}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debit">Borç</SelectItem>
                    <SelectItem value="credit">Alacak</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Tutar">
                <Input type="number" step="any" value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="0.00" />
              </Field>
            </div>

            <Field label="Vade tarihi">
              <Input type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
            </Field>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
            <Button
              onClick={() => save.mutate()}
              disabled={save.isPending || !form.date || !(Number(form.amount) > 0)}
            >
              {editing ? 'Kaydet' : 'Ekle'}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}
