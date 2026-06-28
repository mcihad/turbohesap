import * as React from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  CONTACT_ROLES,
  ContactsPermissions,
  toApiError,
  type BalanceSide,
  type ContactDto,
  type ContactRole,
  type ContactType,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
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
import { Textarea } from '@/components/ui/textarea'
import { CrmAttributeSection } from './crm-attribute-section'

const ROLE_LABELS: Record<ContactRole, string> = {
  customer: 'Müşteri',
  supplier: 'Tedarikçi',
  both: 'Müşteri + Tedarikçi',
  lead: 'Aday (Lead)',
}
const NO_GROUP = '__none__'

interface FormState {
  contactType: ContactType
  role: ContactRole
  name: string
  code: string
  taxOffice: string
  taxNumber: string
  nationalId: string
  email: string
  phone: string
  mobile: string
  website: string
  currencyCode: string
  openingBalance: string
  openingBalanceSide: BalanceSide
  creditLimit: string
  paymentTermDays: string
  groupId: string
  leadSource: string
  leadStatus: string
  iban: string
  bankName: string
  notes: string
  isActive: boolean
}

function emptyForm(role: ContactRole = 'customer'): FormState {
  return {
    contactType: 'company', role, name: '', code: '', taxOffice: '', taxNumber: '',
    nationalId: '', email: '', phone: '', mobile: '', website: '', currencyCode: 'TRY',
    openingBalance: '0', openingBalanceSide: 'debit', creditLimit: '0', paymentTermDays: '0',
    groupId: NO_GROUP, leadSource: '', leadStatus: '', iban: '', bankName: '', notes: '', isActive: true,
  }
}

export function ContactDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
  defaultRole = 'customer',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: ContactDto | null
  onSaved: (saved: ContactDto) => void
  /** Role pre-selected when creating (ignored when editing). */
  defaultRole?: ContactRole
}) {
  const { hasPermission } = useAuth()
  const [form, setForm] = React.useState<FormState>(emptyForm)
  const [attributes, setAttributes] = React.useState<Record<string, unknown>>({})

  const groupsQuery = useQuery({
    queryKey: ['contacts', 'groups'],
    queryFn: () => api.contacts.groups.list(),
    enabled: open && hasPermission(ContactsPermissions.contactsRead),
  })

  React.useEffect(() => {
    if (!open) return
    setForm(
      editing
        ? {
            contactType: editing.contactType,
            role: editing.role,
            name: editing.name,
            code: editing.code,
            taxOffice: editing.taxOffice ?? '',
            taxNumber: editing.taxNumber ?? '',
            nationalId: editing.nationalId ?? '',
            email: editing.email ?? '',
            phone: editing.phone ?? '',
            mobile: editing.mobile ?? '',
            website: editing.website ?? '',
            currencyCode: editing.currencyCode,
            openingBalance: String(editing.openingBalance),
            openingBalanceSide: editing.openingBalanceSide,
            creditLimit: String(editing.creditLimit),
            paymentTermDays: String(editing.paymentTermDays),
            groupId: editing.groupId ?? NO_GROUP,
            leadSource: editing.leadSource ?? '',
            leadStatus: editing.leadStatus ?? '',
            iban: editing.iban ?? '',
            bankName: editing.bankName ?? '',
            notes: editing.notes ?? '',
            isActive: editing.isActive,
          }
        : emptyForm(defaultRole),
    )
    setAttributes(editing?.attributes ?? {})
  }, [open, editing, defaultRole])

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        contactType: form.contactType,
        role: form.role,
        name: form.name.trim(),
        code: form.code.trim() || undefined,
        taxOffice: form.taxOffice || null,
        taxNumber: form.taxNumber || null,
        nationalId: form.nationalId || null,
        email: form.email || null,
        phone: form.phone || null,
        mobile: form.mobile || null,
        website: form.website || null,
        currencyCode: form.currencyCode,
        openingBalance: Number(form.openingBalance) || 0,
        openingBalanceSide: form.openingBalanceSide,
        creditLimit: Number(form.creditLimit) || 0,
        paymentTermDays: Number(form.paymentTermDays) || 0,
        groupId: form.groupId === NO_GROUP ? null : form.groupId,
        leadSource: form.leadSource || null,
        leadStatus: form.leadStatus || null,
        iban: form.iban || null,
        bankName: form.bankName || null,
        notes: form.notes || null,
        isActive: form.isActive,
        attributes,
      }
      return editing
        ? api.contacts.contacts.update(editing.id, payload)
        : api.contacts.contacts.create(payload)
    },
    onSuccess: (saved) => {
      toast.success(editing ? 'Cari güncellendi' : 'Cari oluşturuldu')
      onOpenChange(false)
      onSaved(saved)
    },
    onError: (e) => toast.error('İşlem başarısız', { description: toApiError(e).message }),
  })

  const isCompany = form.contactType === 'company'
  const groups = groupsQuery.data ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto px-1 sm:max-w-2xl">
        <div className="px-5">
          <DialogHeader>
            <DialogTitle>{editing ? 'Cariyi düzenle' : 'Yeni cari'}</DialogTitle>
            <DialogDescription>
              Müşteri / tedarikçi temel bilgileri. Hareketler, kişiler, adresler ve fırsatlar
              detay sayfasından yönetilir.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tür">
                <Select value={form.contactType} onValueChange={(v) => set('contactType', v as ContactType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">Kurumsal</SelectItem>
                    <SelectItem value="individual">Bireysel</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Rol">
                <Select value={form.role} onValueChange={(v) => set('role', v as ContactRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONTACT_ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-3">
              <Field label={isCompany ? 'Ünvan' : 'Ad Soyad'}>
                <Input value={form.name} onChange={(e) => set('name', e.target.value)} autoFocus />
              </Field>
              <Field label="Cari Kodu">
                <Input value={form.code} onChange={(e) => set('code', e.target.value)} placeholder="otomatik" className="w-36 font-mono" />
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {isCompany ? (
                <>
                  <Field label="Vergi Dairesi"><Input value={form.taxOffice} onChange={(e) => set('taxOffice', e.target.value)} /></Field>
                  <Field label="Vergi No"><Input value={form.taxNumber} onChange={(e) => set('taxNumber', e.target.value)} /></Field>
                  <Field label="Grup">
                    <Select value={form.groupId} onValueChange={(v) => set('groupId', v)}>
                      <SelectTrigger><SelectValue placeholder="Grup yok" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_GROUP}>Grup yok</SelectItem>
                        {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                </>
              ) : (
                <>
                  <Field label="TCKN"><Input value={form.nationalId} onChange={(e) => set('nationalId', e.target.value)} /></Field>
                  <Field label="Grup">
                    <Select value={form.groupId} onValueChange={(v) => set('groupId', v)}>
                      <SelectTrigger><SelectValue placeholder="Grup yok" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_GROUP}>Grup yok</SelectItem>
                        {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <div />
                </>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label="E-posta"><Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
              <Field label="Telefon"><Input value={form.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
              <Field label="Cep"><Input value={form.mobile} onChange={(e) => set('mobile', e.target.value)} /></Field>
            </div>

            {form.role === 'lead' ? (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Kaynak">
                  <Input
                    value={form.leadSource}
                    onChange={(e) => set('leadSource', e.target.value)}
                    placeholder="Web, fuar, referans…"
                  />
                </Field>
                <Field label="Durum">
                  <Input
                    value={form.leadStatus}
                    onChange={(e) => set('leadStatus', e.target.value)}
                    placeholder="Yeni, iletişimde, nitelikli…"
                  />
                </Field>
              </div>
            ) : null}

            <div className="grid grid-cols-[1fr_auto_auto] gap-3">
              <Field label="Açılış Bakiyesi"><Input type="number" value={form.openingBalance} onChange={(e) => set('openingBalance', e.target.value)} /></Field>
              <Field label="Yön">
                <Select value={form.openingBalanceSide} onValueChange={(v) => set('openingBalanceSide', v as BalanceSide)}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debit">Borç</SelectItem>
                    <SelectItem value="credit">Alacak</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Para">
                <Input value={form.currencyCode} onChange={(e) => set('currencyCode', e.target.value)} className="w-20" />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Risk Limiti"><Input type="number" value={form.creditLimit} onChange={(e) => set('creditLimit', e.target.value)} /></Field>
              <Field label="Vade (gün)"><Input type="number" value={form.paymentTermDays} onChange={(e) => set('paymentTermDays', e.target.value)} /></Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="IBAN"><Input value={form.iban} onChange={(e) => set('iban', e.target.value)} className="font-mono" /></Field>
              <Field label="Banka"><Input value={form.bankName} onChange={(e) => set('bankName', e.target.value)} /></Field>
            </div>

            <Field label="Notlar"><Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} /></Field>

            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.isActive} onCheckedChange={(v) => set('isActive', v)} />
              Aktif
            </label>

            <CrmAttributeSection
              entity="contact"
              enabled={open}
              values={attributes}
              onChange={(key, value) => setAttributes((a) => ({ ...a, [key]: value }))}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !form.name.trim()}>
              {editing ? 'Kaydet' : 'Oluştur'}
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
