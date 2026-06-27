import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  BRANCH_TYPES,
  OrgPermissions,
  toApiError,
  type BranchDto,
  type BranchType,
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
import { BRANCH_TYPE_LABELS, branchTypeLabel } from '../labels'

interface FormState {
  code: string
  name: string
  type: BranchType
  description: string
  isActive: boolean
  phone: string
  secondaryPhone: string
  fax: string
  email: string
  website: string
  country: string
  city: string
  district: string
  neighborhood: string
  addressLine: string
  postalCode: string
  latitude: string
  longitude: string
  managerName: string
  managerTitle: string
  managerPhone: string
  managerEmail: string
  taxOffice: string
  taxNumber: string
  openingDate: string
}

const EMPTY: FormState = {
  code: '',
  name: '',
  type: 'branch',
  description: '',
  isActive: true,
  phone: '',
  secondaryPhone: '',
  fax: '',
  email: '',
  website: '',
  country: 'Türkiye',
  city: '',
  district: '',
  neighborhood: '',
  addressLine: '',
  postalCode: '',
  latitude: '',
  longitude: '',
  managerName: '',
  managerTitle: '',
  managerPhone: '',
  managerEmail: '',
  taxOffice: '',
  taxNumber: '',
  openingDate: '',
}

function fromDto(b: BranchDto): FormState {
  return {
    code: b.code,
    name: b.name,
    type: b.type,
    description: b.description,
    isActive: b.isActive,
    phone: b.phone,
    secondaryPhone: b.secondaryPhone,
    fax: b.fax,
    email: b.email,
    website: b.website,
    country: b.country,
    city: b.city,
    district: b.district,
    neighborhood: b.neighborhood,
    addressLine: b.addressLine,
    postalCode: b.postalCode,
    latitude: b.latitude == null ? '' : String(b.latitude),
    longitude: b.longitude == null ? '' : String(b.longitude),
    managerName: b.managerName,
    managerTitle: b.managerTitle,
    managerPhone: b.managerPhone,
    managerEmail: b.managerEmail,
    taxOffice: b.taxOffice,
    taxNumber: b.taxNumber,
    openingDate: b.openingDate ? b.openingDate.slice(0, 10) : '',
  }
}

function toPayload(form: FormState) {
  const num = (s: string) => (s.trim() === '' ? null : Number(s))
  return {
    code: form.code.trim(),
    name: form.name.trim(),
    type: form.type,
    description: form.description,
    isActive: form.isActive,
    phone: form.phone,
    secondaryPhone: form.secondaryPhone,
    fax: form.fax,
    email: form.email,
    website: form.website,
    country: form.country,
    city: form.city,
    district: form.district,
    neighborhood: form.neighborhood,
    addressLine: form.addressLine,
    postalCode: form.postalCode,
    latitude: num(form.latitude),
    longitude: num(form.longitude),
    managerName: form.managerName,
    managerTitle: form.managerTitle,
    managerPhone: form.managerPhone,
    managerEmail: form.managerEmail,
    taxOffice: form.taxOffice,
    taxNumber: form.taxNumber,
    openingDate: form.openingDate.trim() === '' ? null : form.openingDate,
  }
}

export function BranchesPage() {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(OrgPermissions.branchesRead)
  const canWrite = hasPermission(OrgPermissions.branchesWrite)

  const branchesQuery = useQuery({
    queryKey: ['org', 'branches'],
    queryFn: () => api.org.branches.list(),
    enabled: canRead,
  })

  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<BranchDto | null>(null)
  const [form, setForm] = React.useState<FormState>(EMPTY)
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  function openCreate() {
    setEditing(null)
    setForm(EMPTY)
    setOpen(true)
  }
  function openEdit(b: BranchDto) {
    setEditing(b)
    setForm(fromDto(b))
    setOpen(true)
  }

  const invalidate = () => qc.invalidateQueries({ queryKey: ['org', 'branches'] })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = toPayload(form)
      if (editing) await api.org.branches.update(editing.id, payload)
      else await api.org.branches.create(payload)
    },
    onSuccess: () => {
      toast.success(editing ? 'Şube güncellendi' : 'Şube oluşturuldu')
      setOpen(false)
      void invalidate()
    },
    onError: (e) =>
      toast.error('İşlem başarısız', { description: toApiError(e).message }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.org.branches.remove(id),
    onSuccess: () => {
      toast.success('Şube silindi')
      void invalidate()
    },
    onError: (e) =>
      toast.error('Silme başarısız', { description: toApiError(e).message }),
  })

  const branches = branchesQuery.data ?? []

  return (
    <PermissionRequired permission={OrgPermissions.branchesRead}>
      <PageWrapper>
        <PageHeader
          title="Şubeler"
          description="Organizasyonun lokasyonlarını yönetin (merkez, şube, depo, mağaza…)."
          actions={
            canWrite ? (
              <Button onClick={openCreate}>
                <Plus />
                Yeni şube
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
                <TableHead>Şehir</TableHead>
                <TableHead>Yetkili</TableHead>
                <TableHead>Durum</TableHead>
                {canWrite ? (
                  <TableHead className="w-24 text-right">İşlem</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {branches.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono text-xs">
                    <Link
                      to="/org/branches/$id"
                      params={{ id: b.id }}
                      className="font-medium text-primary hover:underline"
                    >
                      {b.code}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{branchTypeLabel(b.type)}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {b.city || '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {b.managerName || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={b.isActive ? 'success' : 'outline'}>
                      {b.isActive ? 'Aktif' : 'Pasif'}
                    </Badge>
                  </TableCell>
                  {canWrite ? (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(b)}
                        aria-label="Düzenle"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          if (confirm(`"${b.name}" şubesi silinsin mi?`))
                            deleteMutation.mutate(b.id)
                        }}
                        aria-label="Sil"
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
              {!branchesQuery.isLoading && branches.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground"
                  >
                    Şube yok.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editing ? 'Şubeyi düzenle' : 'Yeni şube'}</DialogTitle>
              <DialogDescription>
                Şubenin kimlik, iletişim, adres, yetkili ve vergi bilgilerini girin.
              </DialogDescription>
            </DialogHeader>

            <div className="grid max-h-[65vh] gap-5 overflow-y-auto px-1 py-2">
              <Section title="Genel">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Kod">
                    <Input
                      value={form.code}
                      disabled={!!editing}
                      onChange={(e) => set('code', e.target.value)}
                      placeholder="IST-01"
                      className="font-mono"
                    />
                  </Field>
                  <Field label="Ad">
                    <Input
                      value={form.name}
                      onChange={(e) => set('name', e.target.value)}
                      placeholder="İstanbul Merkez"
                    />
                  </Field>
                  <Field label="Tür">
                    <Select
                      value={form.type}
                      onValueChange={(v) => set('type', v as BranchType)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BRANCH_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {BRANCH_TYPE_LABELS[t]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Açılış tarihi">
                    <Input
                      type="date"
                      value={form.openingDate}
                      onChange={(e) => set('openingDate', e.target.value)}
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
                <label className="flex items-center gap-2 pt-1 text-sm">
                  <Switch
                    checked={form.isActive}
                    onCheckedChange={(v) => set('isActive', v)}
                  />
                  Aktif
                </label>
              </Section>

              <Section title="İletişim">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Telefon">
                    <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} />
                  </Field>
                  <Field label="İkinci telefon">
                    <Input
                      value={form.secondaryPhone}
                      onChange={(e) => set('secondaryPhone', e.target.value)}
                    />
                  </Field>
                  <Field label="Faks">
                    <Input value={form.fax} onChange={(e) => set('fax', e.target.value)} />
                  </Field>
                  <Field label="E-posta">
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => set('email', e.target.value)}
                    />
                  </Field>
                  <Field label="Web sitesi" className="col-span-2">
                    <Input
                      value={form.website}
                      onChange={(e) => set('website', e.target.value)}
                      placeholder="https://…"
                    />
                  </Field>
                </div>
              </Section>

              <Section title="Adres">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Ülke">
                    <Input value={form.country} onChange={(e) => set('country', e.target.value)} />
                  </Field>
                  <Field label="İl">
                    <Input value={form.city} onChange={(e) => set('city', e.target.value)} />
                  </Field>
                  <Field label="İlçe">
                    <Input value={form.district} onChange={(e) => set('district', e.target.value)} />
                  </Field>
                  <Field label="Mahalle">
                    <Input
                      value={form.neighborhood}
                      onChange={(e) => set('neighborhood', e.target.value)}
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
                  <Field label="Enlem (lat)">
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={form.latitude}
                      onChange={(e) => set('latitude', e.target.value)}
                      placeholder="41.0082"
                    />
                  </Field>
                  <Field label="Boylam (lng)">
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={form.longitude}
                      onChange={(e) => set('longitude', e.target.value)}
                      placeholder="28.9784"
                    />
                  </Field>
                </div>
              </Section>

              <Section title="Yetkili / Şube müdürü">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Ad soyad">
                    <Input
                      value={form.managerName}
                      onChange={(e) => set('managerName', e.target.value)}
                    />
                  </Field>
                  <Field label="Unvanı">
                    <Input
                      value={form.managerTitle}
                      onChange={(e) => set('managerTitle', e.target.value)}
                    />
                  </Field>
                  <Field label="Telefon">
                    <Input
                      value={form.managerPhone}
                      onChange={(e) => set('managerPhone', e.target.value)}
                    />
                  </Field>
                  <Field label="E-posta">
                    <Input
                      type="email"
                      value={form.managerEmail}
                      onChange={(e) => set('managerEmail', e.target.value)}
                    />
                  </Field>
                </div>
              </Section>

              <Section title="Yasal / Vergi">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Vergi dairesi">
                    <Input
                      value={form.taxOffice}
                      onChange={(e) => set('taxOffice', e.target.value)}
                    />
                  </Field>
                  <Field label="Vergi / TC no">
                    <Input
                      value={form.taxNumber}
                      onChange={(e) => set('taxNumber', e.target.value)}
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
