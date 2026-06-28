import * as React from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ChevronDown, FileText, Pencil, Plus, Send, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  ContactsPermissions,
  FilesPermissions,
  InvoicesPermissions,
  toApiError,
  type ActivityDto,
  type ActivityStatus,
  type ActivityType,
  type ContactAddressDto,
  type ContactDocumentType,
  type ContactPersonDto,
  type ContactRole,
  type ContactTransactionDto,
  type OpportunityDto,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { useRegisterBreadcrumbLabel } from '@/lib/layout/breadcrumb-store'
import { formatDate, formatDateTime } from '@/lib/datetime'
import { PageHeader, PageWrapper } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DataGrid, type ColumnDef } from '@/components/data-grid'
import { FileManager } from '@/modules/files/components/file-manager'
import { ContactDialog } from '../components/contact-dialog'
import { ContactPersonDialog } from '../components/contact-person-dialog'
import { ContactAddressDialog } from '../components/contact-address-dialog'
import { ContactTransactionDialog } from '../components/contact-transaction-dialog'
import { SendMessageDialog } from '../components/send-message-dialog'
import { balanceSideLabel, balanceTone, formatMoney } from '../format'

const ROUTE = '/_authed/contacts/contacts/$id'

const ROLE_LABEL: Record<ContactRole, string> = {
  customer: 'Müşteri', supplier: 'Tedarikçi', both: 'Müşteri+Tedarikçi', lead: 'Aday',
}

const DOC_TYPE_LABEL: Record<ContactDocumentType, string> = {
  invoice: 'Fatura', payment: 'Ödeme', receipt: 'Tahsilat',
  opening: 'Açılış', adjustment: 'Düzeltme', return: 'İade',
}
const DOC_TYPE_TONE: Record<ContactDocumentType, 'default' | 'secondary' | 'success' | 'warning' | 'info' | 'destructive' | 'outline'> = {
  invoice: 'info', payment: 'warning', receipt: 'success',
  opening: 'secondary', adjustment: 'outline', return: 'destructive',
}

const ACTIVITY_TYPE_LABEL: Record<ActivityType, string> = {
  note: 'Not', call: 'Arama', meeting: 'Toplantı', email: 'E-posta', task: 'Görev',
}
const ACTIVITY_STATUS_LABEL: Record<ActivityStatus, string> = {
  open: 'Açık', in_progress: 'Devam ediyor', completed: 'Tamamlandı', cancelled: 'İptal',
}
const ACTIVITY_STATUS_TONE: Record<ActivityStatus, 'default' | 'secondary' | 'success' | 'warning' | 'info' | 'outline'> = {
  open: 'warning', in_progress: 'info', completed: 'success', cancelled: 'outline',
}

export function ContactDetailPage() {
  const { id } = useParams({ from: ROUTE })
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { hasPermission } = useAuth()

  const canInvoice = hasPermission(InvoicesPermissions.write)
  const canRead = hasPermission(ContactsPermissions.contactsRead)
  const canWrite = hasPermission(ContactsPermissions.contactsWrite)
  const canTxRead = hasPermission(ContactsPermissions.transactionsRead)
  const canTxWrite = hasPermission(ContactsPermissions.transactionsWrite)
  const canActivitiesRead = hasPermission(ContactsPermissions.activitiesRead)
  const canOppRead = hasPermission(ContactsPermissions.opportunitiesRead)
  const canFiles = hasPermission(FilesPermissions.write)

  const query = useQuery({
    queryKey: ['contacts', 'contacts', id],
    queryFn: () => api.contacts.contacts.get(id),
    enabled: canRead && !!id,
  })
  const txQuery = useQuery({
    queryKey: ['contacts', 'transactions', { contactId: id }],
    queryFn: () => api.contacts.transactions.list({ contactId: id }),
    enabled: canTxRead && !!id,
  })
  const personsQuery = useQuery({
    queryKey: ['contacts', 'persons', id],
    queryFn: () => api.contacts.persons.list(id),
    enabled: canRead && !!id,
  })
  const addressesQuery = useQuery({
    queryKey: ['contacts', 'addresses', id],
    queryFn: () => api.contacts.addresses.list(id),
    enabled: canRead && !!id,
  })
  const activitiesQuery = useQuery({
    queryKey: ['contacts', 'activities', { contactId: id }],
    queryFn: () => api.contacts.activities.list({ contactId: id }),
    enabled: canActivitiesRead && !!id,
  })
  const opportunitiesQuery = useQuery({
    queryKey: ['contacts', 'opportunities', { contactId: id }],
    queryFn: () => api.contacts.opportunities.list({ contactId: id }),
    enabled: canOppRead && !!id,
  })

  const [editOpen, setEditOpen] = React.useState(false)
  const [personOpen, setPersonOpen] = React.useState(false)
  const [editingPerson, setEditingPerson] = React.useState<ContactPersonDto | null>(null)
  const [addressOpen, setAddressOpen] = React.useState(false)
  const [editingAddress, setEditingAddress] = React.useState<ContactAddressDto | null>(null)
  const [txOpen, setTxOpen] = React.useState(false)
  const [editingTx, setEditingTx] = React.useState<ContactTransactionDto | null>(null)
  const [sendOpen, setSendOpen] = React.useState(false)

  const contact = query.data

  const invalidateContact = () => qc.invalidateQueries({ queryKey: ['contacts', 'contacts', id] })
  const invalidateTx = () => {
    void qc.invalidateQueries({ queryKey: ['contacts', 'transactions', { contactId: id }] })
    void invalidateContact()
  }
  const invalidatePersons = () => qc.invalidateQueries({ queryKey: ['contacts', 'persons', id] })
  const invalidateAddresses = () => qc.invalidateQueries({ queryKey: ['contacts', 'addresses', id] })

  const txDelete = useMutation({
    mutationFn: (txId: string) => api.contacts.transactions.remove(txId),
    onSuccess: () => { toast.success('Hareket silindi'); invalidateTx() },
    onError: (e) => toast.error('Silinemedi', { description: toApiError(e).message }),
  })
  const personDelete = useMutation({
    mutationFn: (pid: string) => api.contacts.persons.remove(pid),
    onSuccess: () => { toast.success('Kişi silindi'); void invalidatePersons() },
    onError: (e) => toast.error('Silinemedi', { description: toApiError(e).message }),
  })
  const addressDelete = useMutation({
    mutationFn: (aid: string) => api.contacts.addresses.remove(aid),
    onSuccess: () => { toast.success('Adres silindi'); void invalidateAddresses() },
    onError: (e) => toast.error('Silinemedi', { description: toApiError(e).message }),
  })

  const txColumns: ColumnDef<ContactTransactionDto>[] = [
    { id: 'date', accessorKey: 'date', header: 'Tarih', size: 110, cell: ({ row }) => <span>{formatDate(row.original.date)}</span> },
    {
      id: 'documentType', accessorKey: 'documentType', header: 'Belge', size: 110,
      cell: ({ row }) => <Badge variant={DOC_TYPE_TONE[row.original.documentType]}>{DOC_TYPE_LABEL[row.original.documentType]}</Badge>,
    },
    { id: 'documentNo', accessorKey: 'documentNo', header: 'Belge No', size: 120, cell: ({ row }) => <span className="font-mono text-xs">{row.original.documentNo || '—'}</span> },
    { id: 'description', accessorKey: 'description', header: 'Açıklama', size: 240, cell: ({ row }) => <span className="text-muted-foreground text-xs">{row.original.description || '—'}</span> },
    { id: 'debit', accessorKey: 'debit', header: 'Borç', size: 120, cell: ({ row }) => <span className="tabular-nums">{row.original.debit > 0 ? formatMoney(row.original.debit, row.original.currencyCode) : '—'}</span> },
    { id: 'credit', accessorKey: 'credit', header: 'Alacak', size: 120, cell: ({ row }) => <span className="tabular-nums">{row.original.credit > 0 ? formatMoney(row.original.credit, row.original.currencyCode) : '—'}</span> },
    { id: 'runningBalance', accessorKey: 'runningBalance', header: 'Bakiye', size: 130, cell: ({ row }) => <span className="tabular-nums font-semibold">{formatMoney(row.original.runningBalance, row.original.currencyCode)}</span> },
    ...(canTxWrite
      ? [{
          id: 'actions', header: '', size: 90, enableSorting: false, enableHiding: false, enableColumnFilter: false,
          cell: ({ row }) => (
            <div className="flex justify-end gap-1">
              <Button variant="ghost" size="icon-sm" onClick={() => { setEditingTx(row.original); setTxOpen(true) }} aria-label="Düzenle"><Pencil className="size-4" /></Button>
              <Button variant="ghost" size="icon-sm" onClick={() => { if (confirm('Bu hareket silinsin mi?')) txDelete.mutate(row.original.id) }} aria-label="Sil"><Trash2 className="size-4 text-destructive" /></Button>
            </div>
          ),
        } as ColumnDef<ContactTransactionDto>]
      : []),
  ]

  const personColumns: ColumnDef<ContactPersonDto>[] = [
    { id: 'name', header: 'Ad Soyad', size: 200, accessorFn: (p) => `${p.firstName} ${p.lastName}`.trim(), cell: ({ row }) => <span className="font-medium">{`${row.original.firstName} ${row.original.lastName}`.trim()}</span> },
    { id: 'title', accessorKey: 'title', header: 'Görevi', size: 160, cell: ({ row }) => <span className="text-muted-foreground">{row.original.title || '—'}</span> },
    { id: 'email', accessorKey: 'email', header: 'E-posta', size: 200, cell: ({ row }) => <span className="text-muted-foreground">{row.original.email || '—'}</span> },
    { id: 'phone', accessorFn: (p) => p.phone ?? p.mobile ?? '', header: 'Telefon', size: 140, cell: ({ row }) => <span className="text-muted-foreground">{row.original.phone || row.original.mobile || '—'}</span> },
    { id: 'isPrimary', accessorKey: 'isPrimary', header: 'Birincil', size: 100, cell: ({ row }) => row.original.isPrimary ? <Badge variant="success">Birincil</Badge> : <span className="text-muted-foreground">—</span> },
    ...(canWrite
      ? [{
          id: 'actions', header: '', size: 90, enableSorting: false, enableHiding: false, enableColumnFilter: false,
          cell: ({ row }) => (
            <div className="flex justify-end gap-1">
              <Button variant="ghost" size="icon-sm" onClick={() => { setEditingPerson(row.original); setPersonOpen(true) }} aria-label="Düzenle"><Pencil className="size-4" /></Button>
              <Button variant="ghost" size="icon-sm" onClick={() => { if (confirm('Bu kişi silinsin mi?')) personDelete.mutate(row.original.id) }} aria-label="Sil"><Trash2 className="size-4 text-destructive" /></Button>
            </div>
          ),
        } as ColumnDef<ContactPersonDto>]
      : []),
  ]

  const addressColumns: ColumnDef<ContactAddressDto>[] = [
    { id: 'addressType', accessorKey: 'addressType', header: 'Tür', size: 100, cell: ({ row }) => <Badge variant="outline">{ADDRESS_TYPE_LABEL[row.original.addressType]}</Badge> },
    { id: 'title', accessorKey: 'title', header: 'Başlık', size: 140, cell: ({ row }) => <span>{row.original.title || '—'}</span> },
    { id: 'line1', accessorKey: 'line1', header: 'Adres', size: 260, cell: ({ row }) => <span className="text-muted-foreground">{row.original.line1}</span> },
    { id: 'district', accessorKey: 'district', header: 'İlçe', size: 120, cell: ({ row }) => <span className="text-muted-foreground">{row.original.district || '—'}</span> },
    { id: 'city', accessorKey: 'city', header: 'İl', size: 120 },
    { id: 'postalCode', accessorKey: 'postalCode', header: 'Posta Kodu', size: 110, cell: ({ row }) => <span className="font-mono text-xs">{row.original.postalCode || '—'}</span> },
    ...(canWrite
      ? [{
          id: 'actions', header: '', size: 90, enableSorting: false, enableHiding: false, enableColumnFilter: false,
          cell: ({ row }) => (
            <div className="flex justify-end gap-1">
              <Button variant="ghost" size="icon-sm" onClick={() => { setEditingAddress(row.original); setAddressOpen(true) }} aria-label="Düzenle"><Pencil className="size-4" /></Button>
              <Button variant="ghost" size="icon-sm" onClick={() => { if (confirm('Bu adres silinsin mi?')) addressDelete.mutate(row.original.id) }} aria-label="Sil"><Trash2 className="size-4 text-destructive" /></Button>
            </div>
          ),
        } as ColumnDef<ContactAddressDto>]
      : []),
  ]

  const activityColumns: ColumnDef<ActivityDto>[] = [
    { id: 'activityType', accessorKey: 'activityType', header: 'Tür', size: 120, cell: ({ row }) => <Badge variant="outline">{ACTIVITY_TYPE_LABEL[row.original.activityType]}</Badge> },
    { id: 'subject', accessorKey: 'subject', header: 'Konu', size: 280, cell: ({ row }) => <span className="font-medium">{row.original.subject}</span> },
    { id: 'status', accessorKey: 'status', header: 'Durum', size: 140, cell: ({ row }) => <Badge variant={ACTIVITY_STATUS_TONE[row.original.status]}>{ACTIVITY_STATUS_LABEL[row.original.status]}</Badge> },
    { id: 'dueDate', accessorKey: 'dueDate', header: 'Son Tarih', size: 120, cell: ({ row }) => <span className="text-muted-foreground">{row.original.dueDate ? formatDate(row.original.dueDate) : '—'}</span> },
  ]

  const opportunityColumns: ColumnDef<OpportunityDto>[] = [
    { id: 'name', accessorKey: 'name', header: 'Fırsat', size: 240, cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { id: 'stage', accessorFn: (o) => o.stageName, header: 'Aşama', size: 150, cell: ({ row }) => (
      <Badge variant="outline" className="gap-1.5">
        <span className="inline-block size-2 shrink-0 rounded-full" style={{ backgroundColor: row.original.stageColor }} />
        {row.original.stageName}
      </Badge>
    ) },
    { id: 'amount', accessorKey: 'amount', header: 'Tutar', size: 140, cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.amount, row.original.currencyCode)}</span> },
    { id: 'probability', accessorKey: 'probability', header: 'Olasılık', size: 100, cell: ({ row }) => <span className="tabular-nums">%{row.original.probability}</span> },
    { id: 'expectedRevenue', accessorKey: 'expectedRevenue', header: 'Tahmini Ciro', size: 150, cell: ({ row }) => <span className="tabular-nums font-medium">{formatMoney(row.original.expectedRevenue, row.original.currencyCode)}</span> },
  ]

  return (
    <PermissionRequired permission={ContactsPermissions.contactsRead}>
      <PageWrapper>
        {query.isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : !contact ? (
          <NotFound />
        ) : (
          <>
            <Breadcrumb id={contact.id} name={contact.name} />
            <PageHeader
              title={contact.name}
              description={[contact.code, ROLE_LABEL[contact.role], contact.group?.name].filter(Boolean).join(' · ') || undefined}
              audit={{ entityType: 'Contact', entityId: contact.id, title: 'Cari denetim kaydı' }}
              actions={
                <div className="flex flex-wrap gap-2">
                  {canInvoice ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm">
                          <FileText />
                          Fatura
                          <ChevronDown className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => navigate({ to: '/invoices/invoices/new', search: { type: 'sales', contactId: contact.id } })}
                        >
                          <FileText className="size-4" />
                          Satış Faturası Ekle
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => navigate({ to: '/invoices/invoices/new', search: { type: 'purchase', contactId: contact.id } })}
                        >
                          <FileText className="size-4" />
                          Alış Faturası Ekle
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                  {canWrite ? (
                    <Button variant="outline" size="sm" onClick={() => setSendOpen(true)}>
                      <Send />
                      Mesaj gönder
                    </Button>
                  ) : null}
                  {canWrite ? (
                    <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                      <Pencil />
                      Düzenle
                    </Button>
                  ) : null}
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/contacts/contacts">
                      <ArrowLeft />
                      Cariler
                    </Link>
                  </Button>
                </div>
              }
            />

            <div className="space-y-5">
            <Card className="border-primary/15 bg-gradient-to-br from-primary/[0.07] to-transparent">
              <CardContent className="flex flex-wrap items-end justify-between gap-6 pt-6">
                <div className="space-y-1">
                  <div className="text-2xs tracking-wide text-muted-foreground uppercase">Güncel Bakiye</div>
                  <div className={`text-3xl font-semibold tabular-nums ${balanceTone(contact.balanceSide)}`}>
                    {formatMoney(contact.balance, contact.currencyCode)}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">{balanceSideLabel(contact.balanceSide)}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-8 gap-y-2">
                  <Field label="Risk Limiti" value={contact.creditLimit > 0 ? formatMoney(contact.creditLimit, contact.currencyCode) : 'Limitsiz'} />
                  <Field label="Vade" value={`${contact.paymentTermDays} gün`} />
                  <Field label="Para Birimi" value={contact.currencyCode} />
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="ekstre" className="space-y-4">
              <TabsList className="flex-wrap">
                <TabsTrigger value="genel">Genel</TabsTrigger>
                {canTxRead ? <TabsTrigger value="ekstre">Ekstre</TabsTrigger> : null}
                <TabsTrigger value="kisiler">Kişiler ({contact.personCount})</TabsTrigger>
                <TabsTrigger value="adresler">Adresler ({contact.addressCount})</TabsTrigger>
                {canActivitiesRead ? <TabsTrigger value="etkinlikler">Etkinlikler</TabsTrigger> : null}
                {canOppRead ? <TabsTrigger value="firsatlar">Fırsatlar</TabsTrigger> : null}
                <TabsTrigger value="ekler">Ekler</TabsTrigger>
              </TabsList>

              <TabsContent value="genel">
                <Card>
                  <CardHeader><CardTitle className="text-sm">Genel</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3">
                    <Field label="Kod" value={contact.code || '—'} mono />
                    <Field label="Tür" value={contact.contactType === 'company' ? 'Kurumsal' : 'Bireysel'} />
                    <Field label="Rol" value={ROLE_LABEL[contact.role]} />
                    <Field label="Vergi Dairesi" value={contact.taxOffice || '—'} />
                    <Field label="Vergi No / TCKN" value={contact.taxNumber || contact.nationalId || '—'} mono />
                    <Field label="E-posta" value={contact.email || '—'} />
                    <Field label="Telefon" value={contact.phone || '—'} />
                    <Field label="Cep" value={contact.mobile || '—'} />
                    <Field label="Web" value={contact.website || '—'} />
                    <Field label="IBAN" value={contact.iban || '—'} mono />
                    <Field label="Banka" value={contact.bankName || '—'} />
                    <Field label="Grup" value={contact.group?.name || '—'} />
                    <Field label="Oluşturma" value={formatDateTime(contact.createdAt)} />
                    <Field label="Güncelleme" value={formatDateTime(contact.updatedAt)} />
                    <Field label="Notlar" value={contact.notes || '—'} full />
                  </CardContent>
                </Card>
              </TabsContent>

              {canTxRead ? (
                <TabsContent value="ekstre">
                  <DataGrid
                    gridId="contacts.transactions"
                    data={txQuery.data ?? []}
                    columns={txColumns}
                    getRowId={(row) => row.id}
                    loading={txQuery.isLoading}
                    emptyText="Bu cariye ait hareket bulunamadı."
                    toolbar={canTxWrite ? <Button onClick={() => { setEditingTx(null); setTxOpen(true) }}><Plus />Hareket ekle</Button> : null}
                  />
                </TabsContent>
              ) : null}

              <TabsContent value="kisiler">
                <DataGrid
                  gridId="contacts.persons"
                  data={personsQuery.data ?? []}
                  columns={personColumns}
                  getRowId={(row) => row.id}
                  loading={personsQuery.isLoading}
                  emptyText="Kişi yok."
                  toolbar={canWrite ? <Button onClick={() => { setEditingPerson(null); setPersonOpen(true) }}><Plus />Kişi ekle</Button> : null}
                />
              </TabsContent>

              <TabsContent value="adresler">
                <DataGrid
                  gridId="contacts.addresses"
                  data={addressesQuery.data ?? []}
                  columns={addressColumns}
                  getRowId={(row) => row.id}
                  loading={addressesQuery.isLoading}
                  emptyText="Adres yok."
                  toolbar={canWrite ? <Button onClick={() => { setEditingAddress(null); setAddressOpen(true) }}><Plus />Adres ekle</Button> : null}
                />
              </TabsContent>

              {canActivitiesRead ? (
                <TabsContent value="etkinlikler">
                  <DataGrid
                    gridId="contacts.activities"
                    data={activitiesQuery.data ?? []}
                    columns={activityColumns}
                    getRowId={(row) => row.id}
                    loading={activitiesQuery.isLoading}
                    emptyText="Etkinlik yok."
                  />
                </TabsContent>
              ) : null}

              {canOppRead ? (
                <TabsContent value="firsatlar">
                  <DataGrid
                    gridId="contacts.contact.opportunities"
                    data={opportunitiesQuery.data ?? []}
                    columns={opportunityColumns}
                    getRowId={(row) => row.id}
                    loading={opportunitiesQuery.isLoading}
                    emptyText="Fırsat yok."
                  />
                </TabsContent>
              ) : null}

              <TabsContent value="ekler">
                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Görseller</CardTitle></CardHeader>
                    <CardContent>
                      <FileManager entityType="Contact" entityId={contact.id} kind="image" canWrite={canFiles} />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Dosyalar</CardTitle></CardHeader>
                    <CardContent>
                      <FileManager entityType="Contact" entityId={contact.id} kind="file" canWrite={canFiles} />
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
            </div>

            <ContactDialog open={editOpen} onOpenChange={setEditOpen} editing={contact} onSaved={invalidateContact} />
            <ContactPersonDialog open={personOpen} onOpenChange={setPersonOpen} contactId={contact.id} editing={editingPerson} onSaved={invalidatePersons} />
            <ContactAddressDialog open={addressOpen} onOpenChange={setAddressOpen} contactId={contact.id} editing={editingAddress} onSaved={invalidateAddresses} />
            <ContactTransactionDialog open={txOpen} onOpenChange={setTxOpen} contactId={contact.id} editing={editingTx} onSaved={invalidateTx} />
            <SendMessageDialog open={sendOpen} onOpenChange={setSendOpen} contactId={contact.id} defaults={{ channel: 'email', to: contact.email ?? '' }} />
          </>
        )}
      </PageWrapper>
    </PermissionRequired>
  )
}

const ADDRESS_TYPE_LABEL: Record<ContactAddressDto['addressType'], string> = {
  billing: 'Fatura', shipping: 'Sevkiyat', office: 'Ofis', other: 'Diğer',
}

function Field({
  label,
  value,
  mono,
  full,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
  full?: boolean
}) {
  return (
    <div className={`space-y-0.5 ${full ? 'col-span-2 md:col-span-3' : ''}`}>
      <dt className="text-2xs tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className={`text-sm ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  )
}

function Breadcrumb({ id, name }: { id: string; name: string }) {
  useRegisterBreadcrumbLabel(`/contacts/contacts/${id}`, name)
  return null
}

function NotFound() {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground">
      <p>Cari bulunamadı.</p>
      <Button variant="outline" asChild>
        <Link to="/contacts/contacts">
          <ArrowLeft />
          Carilere dön
        </Link>
      </Button>
    </div>
  )
}
