import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  ADDRESS_TYPES,
  toApiError,
  type AddressType,
  type ContactAddressDto,
  type CreateContactAddressRequest,
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
import { Switch } from '@/components/ui/switch'

const ADDRESS_TYPE_LABELS: Record<AddressType, string> = {
  billing: 'Fatura',
  shipping: 'Sevkiyat',
  office: 'Ofis',
  other: 'Diğer',
}

interface FormState {
  addressType: AddressType
  title: string
  line1: string
  line2: string
  district: string
  city: string
  postalCode: string
  country: string
  phone: string
  isPrimaryBilling: boolean
  isPrimaryShipping: boolean
}

function emptyForm(): FormState {
  return {
    addressType: 'billing', title: '', line1: '', line2: '', district: '',
    city: '', postalCode: '', country: 'Türkiye', phone: '',
    isPrimaryBilling: false, isPrimaryShipping: false,
  }
}

export function ContactAddressDialog({
  open,
  onOpenChange,
  contactId,
  editing,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  contactId: string
  editing: ContactAddressDto | null
  onSaved: () => void
}) {
  const [form, setForm] = React.useState<FormState>(emptyForm)

  React.useEffect(() => {
    if (!open) return
    setForm(
      editing
        ? {
            addressType: editing.addressType,
            title: editing.title ?? '',
            line1: editing.line1,
            line2: editing.line2 ?? '',
            district: editing.district ?? '',
            city: editing.city,
            postalCode: editing.postalCode ?? '',
            country: editing.country,
            phone: editing.phone ?? '',
            isPrimaryBilling: editing.isPrimaryBilling,
            isPrimaryShipping: editing.isPrimaryShipping,
          }
        : emptyForm(),
    )
  }, [open, editing])

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        addressType: form.addressType,
        title: form.title || null,
        line1: form.line1.trim(),
        line2: form.line2 || null,
        district: form.district || null,
        city: form.city.trim(),
        postalCode: form.postalCode || null,
        country: form.country.trim() || 'Türkiye',
        phone: form.phone || null,
        isPrimaryBilling: form.isPrimaryBilling,
        isPrimaryShipping: form.isPrimaryShipping,
      }
      return editing
        ? api.contacts.addresses.update(editing.id, payload)
        : api.contacts.addresses.create({ contactId, ...payload } as CreateContactAddressRequest)
    },
    onSuccess: () => {
      toast.success(editing ? 'Adres güncellendi' : 'Adres eklendi')
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
            <DialogTitle>{editing ? 'Adresi düzenle' : 'Yeni adres'}</DialogTitle>
            <DialogDescription>Cariye bağlı adres bilgileri.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Adres türü">
                <Select value={form.addressType} onValueChange={(v) => set('addressType', v as AddressType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ADDRESS_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{ADDRESS_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Başlık">
                <Input value={form.title} onChange={(e) => set('title', e.target.value)} />
              </Field>
            </div>

            <Field label="Adres satırı 1">
              <Input value={form.line1} onChange={(e) => set('line1', e.target.value)} autoFocus />
            </Field>
            <Field label="Adres satırı 2">
              <Input value={form.line2} onChange={(e) => set('line2', e.target.value)} />
            </Field>

            <div className="grid grid-cols-3 gap-3">
              <Field label="İlçe">
                <Input value={form.district} onChange={(e) => set('district', e.target.value)} />
              </Field>
              <Field label="İl">
                <Input value={form.city} onChange={(e) => set('city', e.target.value)} />
              </Field>
              <Field label="Posta kodu">
                <Input value={form.postalCode} onChange={(e) => set('postalCode', e.target.value)} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Ülke">
                <Input value={form.country} onChange={(e) => set('country', e.target.value)} />
              </Field>
              <Field label="Telefon">
                <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} />
              </Field>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.isPrimaryBilling} onCheckedChange={(v) => set('isPrimaryBilling', v)} />
              Birincil fatura adresi
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.isPrimaryShipping} onCheckedChange={(v) => set('isPrimaryShipping', v)} />
              Birincil sevkiyat adresi
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
            <Button
              onClick={() => save.mutate()}
              disabled={save.isPending || !form.line1.trim() || !form.city.trim()}
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
