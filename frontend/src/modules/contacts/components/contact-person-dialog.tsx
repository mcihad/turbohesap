import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  toApiError,
  type ContactPersonDto,
  type CreateContactPersonRequest,
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

interface FormState {
  firstName: string
  lastName: string
  title: string
  department: string
  email: string
  phone: string
  mobile: string
  isPrimary: boolean
  notes: string
}

function emptyForm(): FormState {
  return {
    firstName: '', lastName: '', title: '', department: '', email: '',
    phone: '', mobile: '', isPrimary: false, notes: '',
  }
}

export function ContactPersonDialog({
  open,
  onOpenChange,
  contactId,
  editing,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  contactId: string
  editing: ContactPersonDto | null
  onSaved: () => void
}) {
  const [form, setForm] = React.useState<FormState>(emptyForm)

  React.useEffect(() => {
    if (!open) return
    setForm(
      editing
        ? {
            firstName: editing.firstName,
            lastName: editing.lastName,
            title: editing.title ?? '',
            department: editing.department ?? '',
            email: editing.email ?? '',
            phone: editing.phone ?? '',
            mobile: editing.mobile ?? '',
            isPrimary: editing.isPrimary,
            notes: editing.notes ?? '',
          }
        : emptyForm(),
    )
  }, [open, editing])

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim() || undefined,
        title: form.title || null,
        department: form.department || null,
        email: form.email || null,
        phone: form.phone || null,
        mobile: form.mobile || null,
        isPrimary: form.isPrimary,
        notes: form.notes || null,
      }
      return editing
        ? api.contacts.persons.update(editing.id, payload)
        : api.contacts.persons.create({ contactId, ...payload } as CreateContactPersonRequest)
    },
    onSuccess: () => {
      toast.success(editing ? 'Kişi güncellendi' : 'Kişi eklendi')
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
            <DialogTitle>{editing ? 'Kişiyi düzenle' : 'Yeni kişi'}</DialogTitle>
            <DialogDescription>Cariye bağlı ilgili kişi bilgileri.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Ad">
                <Input value={form.firstName} onChange={(e) => set('firstName', e.target.value)} autoFocus />
              </Field>
              <Field label="Soyad">
                <Input value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Görevi">
                <Input value={form.title} onChange={(e) => set('title', e.target.value)} />
              </Field>
              <Field label="Departman">
                <Input value={form.department} onChange={(e) => set('department', e.target.value)} />
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label="E-posta">
                <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
              </Field>
              <Field label="Telefon">
                <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} />
              </Field>
              <Field label="Cep">
                <Input value={form.mobile} onChange={(e) => set('mobile', e.target.value)} />
              </Field>
            </div>

            <Field label="Notlar">
              <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} />
            </Field>

            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.isPrimary} onCheckedChange={(v) => set('isPrimary', v)} />
              Birincil kişi
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !form.firstName.trim()}>
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
