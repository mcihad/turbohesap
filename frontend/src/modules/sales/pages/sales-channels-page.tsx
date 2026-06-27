import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  SALES_CHANNEL_TYPES,
  SalesPermissions,
  toApiError,
  type SalesChannelDto,
  type SalesChannelType,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { PageHeader, PageWrapper } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SALES_CHANNEL_TYPE_LABELS, salesChannelTypeLabel } from '../labels'

interface FormState {
  code: string
  name: string
  type: SalesChannelType
  description: string
  isActive: boolean
  isDefault: boolean
  sortOrder: string
  commissionRate: string
  currency: string
  website: string
  contactName: string
  contactTitle: string
  contactPhone: string
  contactEmail: string
  country: string
  city: string
  district: string
  addressLine: string
  postalCode: string
}

const EMPTY: FormState = {
  code: '',
  name: '',
  type: 'retail',
  description: '',
  isActive: true,
  isDefault: false,
  sortOrder: '0',
  commissionRate: '',
  currency: 'TRY',
  website: '',
  contactName: '',
  contactTitle: '',
  contactPhone: '',
  contactEmail: '',
  country: 'Türkiye',
  city: '',
  district: '',
  addressLine: '',
  postalCode: '',
}

function fromDto(c: SalesChannelDto): FormState {
  return {
    code: c.code,
    name: c.name,
    type: c.type,
    description: c.description,
    isActive: c.isActive,
    isDefault: c.isDefault,
    sortOrder: String(c.sortOrder),
    commissionRate: c.commissionRate == null ? '' : String(c.commissionRate),
    currency: c.currency,
    website: c.website,
    contactName: c.contactName,
    contactTitle: c.contactTitle,
    contactPhone: c.contactPhone,
    contactEmail: c.contactEmail,
    country: c.country,
    city: c.city,
    district: c.district,
    addressLine: c.addressLine,
    postalCode: c.postalCode,
  }
}

function toPayload(form: FormState) {
  return {
    code: form.code.trim(),
    name: form.name.trim(),
    type: form.type,
    description: form.description,
    isActive: form.isActive,
    isDefault: form.isDefault,
    sortOrder: Number(form.sortOrder) || 0,
    commissionRate:
      form.commissionRate.trim() === '' ? null : Number(form.commissionRate),
    currency: form.currency,
    website: form.website,
    contactName: form.contactName,
    contactTitle: form.contactTitle,
    contactPhone: form.contactPhone,
    contactEmail: form.contactEmail,
    country: form.country,
    city: form.city,
    district: form.district,
    addressLine: form.addressLine,
    postalCode: form.postalCode,
  }
}

export function SalesChannelsPage() {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(SalesPermissions.channelsRead)
  const canWrite = hasPermission(SalesPermissions.channelsWrite)

  const channelsQuery = useQuery({
    queryKey: ['sales', 'channels'],
    queryFn: () => api.sales.channels.list(),
    enabled: canRead,
  })

  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<SalesChannelDto | null>(null)
  const [form, setForm] = React.useState<FormState>(EMPTY)
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  function openCreate() {
    setEditing(null)
    setForm(EMPTY)
    setOpen(true)
  }
  function openEdit(c: SalesChannelDto) {
    setEditing(c)
    setForm(fromDto(c))
    setOpen(true)
  }

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ['sales', 'channels'] })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = toPayload(form)
      if (editing) await api.sales.channels.update(editing.id, payload)
      else await api.sales.channels.create(payload)
    },
    onSuccess: () => {
      toast.success(editing ? 'Satış kanalı güncellendi' : 'Satış kanalı oluşturuldu')
      setOpen(false)
      void invalidate()
    },
    onError: (e) =>
      toast.error('İşlem başarısız', { description: toApiError(e).message }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.sales.channels.remove(id),
    onSuccess: () => {
      toast.success('Satış kanalı silindi')
      void invalidate()
    },
    onError: (e) =>
      toast.error('Silme başarısız', { description: toApiError(e).message }),
  })

  const channels = channelsQuery.data ?? []

  return (
    <PermissionRequired permission={SalesPermissions.channelsRead}>
      <PageWrapper>
        <PageHeader
          title="Satış Kanalları"
          description="Ürünlerin satıldığı kanalları yönetin (perakende, online, pazaryeri…)."
          actions={
            canWrite ? (
              <Button onClick={openCreate}>
                <Plus />
                Yeni kanal
              </Button>
            ) : null
          }
        />

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kod</TableHead>
                <TableHead>Ad</TableHead>
                <TableHead>Tür</TableHead>
                <TableHead>Yetkili</TableHead>
                <TableHead>Komisyon</TableHead>
                <TableHead>Durum</TableHead>
                {canWrite ? (
                  <TableHead className="w-24 text-right">İşlem</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {channels.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">
                    <Link
                      to="/sales/channels/$id"
                      params={{ id: c.id }}
                      className="font-medium text-primary hover:underline"
                    >
                      {c.code}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{c.name}</span>
                    {c.isDefault ? (
                      <Badge variant="info" className="ml-2">
                        Varsayılan
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{salesChannelTypeLabel(c.type)}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.contactName || '—'}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {c.commissionRate == null ? '—' : `%${c.commissionRate}`}
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.isActive ? 'success' : 'outline'}>
                      {c.isActive ? 'Aktif' : 'Pasif'}
                    </Badge>
                  </TableCell>
                  {canWrite ? (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(c)}
                        aria-label="Düzenle"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          if (confirm(`"${c.name}" kanalı silinsin mi?`))
                            deleteMutation.mutate(c.id)
                        }}
                        aria-label="Sil"
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
              {!channelsQuery.isLoading && channels.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground"
                  >
                    Satış kanalı yok.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editing ? 'Satış kanalını düzenle' : 'Yeni satış kanalı'}
              </DialogTitle>
              <DialogDescription>
                Kanalın kimlik, iletişim ve adres bilgilerini girin.
              </DialogDescription>
            </DialogHeader>

            <div className="grid max-h-[65vh] gap-5 overflow-y-auto px-1 py-2">
              {/* Genel */}
              <Section title="Genel">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Kod">
                    <Input
                      value={form.code}
                      disabled={!!editing}
                      onChange={(e) => set('code', e.target.value)}
                      placeholder="WEB"
                      className="font-mono"
                    />
                  </Field>
                  <Field label="Ad">
                    <Input
                      value={form.name}
                      onChange={(e) => set('name', e.target.value)}
                      placeholder="Web Mağazası"
                    />
                  </Field>
                  <Field label="Tür">
                    <Select
                      value={form.type}
                      onValueChange={(v) => set('type', v as SalesChannelType)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SALES_CHANNEL_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {SALES_CHANNEL_TYPE_LABELS[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Para birimi">
                    <Input
                      value={form.currency}
                      onChange={(e) => set('currency', e.target.value)}
                      placeholder="TRY"
                    />
                  </Field>
                  <Field label="Komisyon (%)">
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={form.commissionRate}
                      onChange={(e) => set('commissionRate', e.target.value)}
                      placeholder="örn. 12.5"
                    />
                  </Field>
                  <Field label="Sıra">
                    <Input
                      type="number"
                      value={form.sortOrder}
                      onChange={(e) => set('sortOrder', e.target.value)}
                    />
                  </Field>
                  <Field label="Web sitesi" className="col-span-2">
                    <Input
                      value={form.website}
                      onChange={(e) => set('website', e.target.value)}
                      placeholder="https://…"
                    />
                  </Field>
                  <Field label="Açıklama" className="col-span-2">
                    <Textarea
                      value={form.description}
                      onChange={(e) => set('description', e.target.value)}
                      rows={2}
                    />
                  </Field>
                </div>
                <div className="flex flex-wrap items-center gap-6 pt-1">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={form.isActive}
                      onCheckedChange={(v) => set('isActive', v)}
                    />
                    Aktif
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={form.isDefault}
                      onCheckedChange={(v) => set('isDefault', v)}
                    />
                    Varsayılan kanal
                  </label>
                </div>
              </Section>

              {/* İletişim / Yetkili */}
              <Section title="İletişim ve yetkili">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Yetkili adı">
                    <Input
                      value={form.contactName}
                      onChange={(e) => set('contactName', e.target.value)}
                    />
                  </Field>
                  <Field label="Unvanı">
                    <Input
                      value={form.contactTitle}
                      onChange={(e) => set('contactTitle', e.target.value)}
                    />
                  </Field>
                  <Field label="Telefon">
                    <Input
                      value={form.contactPhone}
                      onChange={(e) => set('contactPhone', e.target.value)}
                    />
                  </Field>
                  <Field label="E-posta">
                    <Input
                      type="email"
                      value={form.contactEmail}
                      onChange={(e) => set('contactEmail', e.target.value)}
                    />
                  </Field>
                </div>
              </Section>

              {/* Adres */}
              <Section title="Adres">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Ülke">
                    <Input
                      value={form.country}
                      onChange={(e) => set('country', e.target.value)}
                    />
                  </Field>
                  <Field label="İl">
                    <Input
                      value={form.city}
                      onChange={(e) => set('city', e.target.value)}
                    />
                  </Field>
                  <Field label="İlçe">
                    <Input
                      value={form.district}
                      onChange={(e) => set('district', e.target.value)}
                    />
                  </Field>
                  <Field label="Posta kodu">
                    <Input
                      value={form.postalCode}
                      onChange={(e) => set('postalCode', e.target.value)}
                    />
                  </Field>
                  <Field label="Açık adres" className="col-span-2">
                    <Textarea
                      value={form.addressLine}
                      onChange={(e) => set('addressLine', e.target.value)}
                      rows={2}
                    />
                  </Field>
                </div>
              </Section>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                İptal
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={
                  saveMutation.isPending || !form.code.trim() || !form.name.trim()
                }
              >
                {editing ? 'Kaydet' : 'Oluştur'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageWrapper>
    </PermissionRequired>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-2xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h3>
      {children}
    </div>
  )
}

function Field({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      <Label>{label}</Label>
      {children}
    </div>
  )
}
