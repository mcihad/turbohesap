import * as React from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Ban,
  ChevronDown,
  CircleDollarSign,
  ExternalLink,
  FileSignature,
  Landmark,
  Pencil,
  RotateCcw,
  Signature,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  DocumentsPermissions,
  FinancePermissions,
  toApiError,
  type FinancialInstrumentDto,
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
import { InstrumentFormDialog } from '../components/instrument-form-dialog'
import { InstrumentSettleDialog } from '../components/instrument-settle-dialog'
import {
  INSTRUMENT_STATUS_TONE,
  instrumentDirectionLabel,
  instrumentStatusLabel,
  instrumentTypeLabel,
} from '../instrument-labels'
import { formatMoney } from './cash-accounts-page'

const ROUTE = '/_authed/finance/instruments/$id'

export function InstrumentDetailPage() {
  const { id } = useParams({ from: ROUTE })
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { hasPermission } = useAuth()

  const canRead = hasPermission(FinancePermissions.instrumentsRead)
  const canWrite = hasPermission(FinancePermissions.instrumentsWrite)
  const canSettle = hasPermission(FinancePermissions.instrumentsSettle)
  const canStatus = hasPermission(FinancePermissions.instrumentsStatus)
  const canDelete = hasPermission(FinancePermissions.instrumentsDelete)
  const canReadDocument = hasPermission(DocumentsPermissions.documentsRead)

  const [editOpen, setEditOpen] = React.useState(false)
  const [settleAction, setSettleAction] = React.useState<'collect' | 'pay' | null>(null)

  const query = useQuery({
    queryKey: ['finance', 'instruments', id],
    queryFn: () => api.finance.instruments.get(id),
    enabled: canRead && !!id,
  })

  const instrument = query.data
  useRegisterBreadcrumbLabel(id, instrument?.instrumentNo || 'Çek/Senet Detayı')

  const documentQuery = useQuery({
    queryKey: ['documents', 'documents', instrument?.documentId],
    queryFn: () => api.documents.documents.get(instrument!.documentId as string),
    enabled: canReadDocument && !!instrument?.documentId,
  })

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['finance', 'instruments'] })
  }

  const statusMutation = useMutation({
    mutationFn: (action: 'depositForCollection' | 'bounce' | 'endorse' | 'pledge' | 'cancel' | 'reverse') =>
      api.finance.instruments[action](id),
    onSuccess: () => {
      toast.success('İşlem gerçekleştirildi')
      invalidate()
    },
    onError: (e) => toast.error('İşlem başarısız', { description: toApiError(e).message }),
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.finance.instruments.remove(id),
    onSuccess: () => {
      toast.success('Kayıt silindi')
      invalidate()
      navigate({ to: '/finance/instruments' })
    },
    onError: (e) => toast.error('Silme başarısız', { description: toApiError(e).message }),
  })

  const runStatusAction = (
    action: 'depositForCollection' | 'bounce' | 'endorse' | 'pledge' | 'cancel' | 'reverse',
    confirmText: string,
  ) => {
    if (confirm(confirmText)) statusMutation.mutate(action)
  }

  return (
    <PermissionRequired permission={FinancePermissions.instrumentsRead}>
      <PageWrapper>
        {query.isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : !instrument ? (
          <NotFound />
        ) : (
          <>
            <PageHeader
              title={instrument.instrumentNo || `${instrumentTypeLabel(instrument.instrumentType)} (numarasız)`}
              description={
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span>{instrumentTypeLabel(instrument.instrumentType)}</span>
                  <span>·</span>
                  <span>{instrumentDirectionLabel(instrument.direction)}</span>
                  <span>·</span>
                  <span>{instrument.contactName ?? '—'}</span>
                  <Badge variant={INSTRUMENT_STATUS_TONE[instrument.status]} className="h-5 px-1.5 py-0">
                    {instrumentStatusLabel(instrument.status)}
                  </Badge>
                </div>
              }
              audit={{
                entityType: 'FinancialInstrument',
                entityId: instrument.id,
                title: 'Çek/Senet Değişiklik Günlüğü',
              }}
              actions={
                <div className="flex flex-wrap gap-2">
                  <StatusActions
                    instrument={instrument}
                    canSettle={canSettle}
                    canStatus={canStatus}
                    pending={statusMutation.isPending}
                    onSettle={(action) => setSettleAction(action)}
                    onStatusAction={runStatusAction}
                  />
                  {canWrite && instrument.status === 'open' ? (
                    <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                      <Pencil /> Düzenle
                    </Button>
                  ) : null}
                  {canDelete && instrument.status === 'open' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={deleteMutation.isPending}
                      onClick={() => {
                        if (confirm('Bu çek/senet kaydı silinsin mi? Bu işlem geri alınamaz.')) {
                          deleteMutation.mutate()
                        }
                      }}
                    >
                      <Trash2 className="text-destructive" /> Sil
                    </Button>
                  ) : null}
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/finance/instruments">
                      <ArrowLeft /> Geri dön
                    </Link>
                  </Button>
                </div>
              }
            />

            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Çek/Senet Bilgileri</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3">
                  <Field label="Tür" value={instrumentTypeLabel(instrument.instrumentType)} />
                  <Field label="Yön" value={instrumentDirectionLabel(instrument.direction)} />
                  <Field
                    label="Durum"
                    value={
                      <Badge variant={INSTRUMENT_STATUS_TONE[instrument.status]}>
                        {instrumentStatusLabel(instrument.status)}
                      </Badge>
                    }
                  />
                  <Field label="Cari" value={instrument.contactName ?? '—'} />
                  <Field
                    label="Tutar"
                    value={formatMoney(instrument.amount, instrument.currencyCode)}
                  />
                  <Field label="Para Birimi" value={instrument.currencyCode} />
                  <Field label="Düzenleme Tarihi" value={formatDate(instrument.issueDate)} />
                  <Field label="Vade Tarihi" value={formatDate(instrument.dueDate)} />
                  <Field label="No" value={instrument.instrumentNo || '—'} />
                  {instrument.instrumentType === 'check' ? (
                    <>
                      <Field label="Banka" value={instrument.bankName || '—'} />
                      <Field label="Şube" value={instrument.bankBranch || '—'} />
                      <Field label="Hesap No" value={instrument.accountNo || '—'} />
                    </>
                  ) : null}
                  <Field
                    label={instrument.direction === 'received' ? 'Keşideci' : 'Lehtar'}
                    value={instrument.drawerName || '—'}
                  />
                  {instrument.notes ? <Field label="Notlar" value={instrument.notes} full /> : null}
                  <Field label="Oluşturulma" value={formatDateTime(instrument.createdAt)} />
                  <Field label="Son Güncelleme" value={formatDateTime(instrument.updatedAt)} />
                </CardContent>
              </Card>

              <Card className="h-fit">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Bağlı Evrak</CardTitle>
                </CardHeader>
                <CardContent>
                  {!instrument.documentId ? (
                    <p className="text-xs text-muted-foreground">Bağlı evrak bulunmuyor.</p>
                  ) : (
                    <Link
                      to="/documents/documents/$id"
                      params={{ id: instrument.documentId }}
                      className="flex items-center gap-2 rounded-lg border p-3 text-sm hover:bg-accent"
                    >
                      <FileSignature className="size-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate font-medium">
                        {documentQuery.data?.title ?? 'Evrağı görüntüle'}
                      </span>
                      <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
                    </Link>
                  )}
                </CardContent>
              </Card>
            </div>

            <InstrumentFormDialog
              open={editOpen}
              onOpenChange={setEditOpen}
              editing={instrument}
              onSuccess={invalidate}
            />

            <InstrumentSettleDialog
              open={settleAction !== null}
              onOpenChange={(o) => {
                if (!o) setSettleAction(null)
              }}
              instrument={instrument}
              action={settleAction ?? 'collect'}
              onSuccess={invalidate}
            />
          </>
        )}
      </PageWrapper>
    </PermissionRequired>
  )
}

interface SecondaryAction {
  key: string
  label: string
  icon: React.ReactNode
  destructive?: boolean
  onClick: () => void
}

/**
 * Status actions — which are valid depends on both `direction` (the status
 * machine branches by direction) and the current `status`. See
 * `financial-instrument.dto.ts` for the full state machine.
 *
 * The single most important action (tahsil et/öde, or geri al) stays a
 * visible button; the rest (tahsile ver, karşılıksız, ciro, teminat, iptal)
 * are folded into one "İşlemler" dropdown — mirrors
 * `contacts/pages/contact-detail-page.tsx`'s action-dropdown pattern, since a
 * çek/senet can have up to 5 status-only actions available at once.
 */
function StatusActions({
  instrument,
  canSettle,
  canStatus,
  pending,
  onSettle,
  onStatusAction,
}: {
  instrument: FinancialInstrumentDto
  canSettle: boolean
  canStatus: boolean
  pending: boolean
  onSettle: (action: 'collect' | 'pay') => void
  onStatusAction: (
    action: 'depositForCollection' | 'bounce' | 'endorse' | 'pledge' | 'cancel' | 'reverse',
    confirmText: string,
  ) => void
}) {
  const { status, direction } = instrument
  const primary: React.ReactNode[] = []
  const secondary: SecondaryAction[] = []

  if (direction === 'received') {
    if (status === 'open' || status === 'in_collection') {
      if (status === 'open' && canStatus) {
        secondary.push({
          key: 'deposit',
          label: 'Tahsile Ver',
          icon: <Landmark className="size-4" />,
          onClick: () => onStatusAction('depositForCollection', 'Bu çek tahsile verilsin mi (bankaya/factoringe)?'),
        })
      }
      if (canSettle) {
        primary.push(
          <Button key="collect" size="sm" onClick={() => onSettle('collect')}>
            <CircleDollarSign /> Tahsil Et
          </Button>,
        )
      }
      if (canStatus) {
        secondary.push({
          key: 'bounce',
          label: 'Karşılıksız',
          icon: <Ban className="size-4 text-destructive" />,
          destructive: true,
          onClick: () => onStatusAction('bounce', 'Bu çek/senet karşılıksız olarak işaretlensin mi?'),
        })
      }
      if (status === 'open' && canStatus) {
        secondary.push(
          {
            key: 'endorse',
            label: 'Ciro Et',
            icon: <Signature className="size-4" />,
            onClick: () => onStatusAction('endorse', 'Bu çek/senet ciro edilsin mi?'),
          },
          {
            key: 'pledge',
            label: 'Teminata Ver',
            icon: <ShieldCheck className="size-4" />,
            onClick: () => onStatusAction('pledge', 'Bu çek/senet teminata verilsin mi?'),
          },
        )
      }
    }
    if (status === 'collected' && canSettle) {
      primary.push(
        <Button
          key="reverse"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => onStatusAction('reverse', 'Bu işlem tahsilat kaydını geri alacak, emin misiniz?')}
        >
          <RotateCcw /> Tahsilatı Geri Al
        </Button>,
      )
    }
  }

  if (direction === 'issued') {
    if (status === 'open') {
      if (canSettle) {
        primary.push(
          <Button key="pay" size="sm" onClick={() => onSettle('pay')}>
            <CircleDollarSign /> Öde
          </Button>,
        )
      }
      if (canStatus) {
        secondary.push({
          key: 'bounce',
          label: 'Karşılıksız',
          icon: <Ban className="size-4 text-destructive" />,
          destructive: true,
          onClick: () => onStatusAction('bounce', 'Bu çek/senet karşılıksız olarak işaretlensin mi?'),
        })
      }
    }
    if (status === 'paid' && canSettle) {
      primary.push(
        <Button
          key="reverse"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => onStatusAction('reverse', 'Bu işlem ödeme kaydını geri alacak, emin misiniz?')}
        >
          <RotateCcw /> Ödemeyi Geri Al
        </Button>,
      )
    }
  }

  if (status === 'open' && canStatus) {
    secondary.push({
      key: 'cancel',
      label: 'İptal',
      icon: <Ban className="size-4" />,
      destructive: true,
      onClick: () => onStatusAction('cancel', 'Bu çek/senet iptal edilsin mi?'),
    })
  }

  return (
    <>
      {primary}
      {secondary.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={pending}>
              İşlemler
              <ChevronDown className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {secondary.map((a) => (
              <DropdownMenuItem key={a.key} variant={a.destructive ? 'destructive' : 'default'} onClick={a.onClick}>
                {a.icon}
                {a.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </>
  )
}

function Field({
  label,
  value,
  full,
}: {
  label: string
  value: React.ReactNode
  full?: boolean
}) {
  return (
    <div className={`space-y-0.5 ${full ? 'col-span-2 md:col-span-3' : ''}`}>
      <dt className="text-2xs tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  )
}

function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground">
      <p>Çek/Senet kaydı bulunamadı.</p>
      <Button variant="outline" onClick={() => navigate({ to: '/finance/instruments' })}>
        <ArrowLeft />
        Çek/Senet listesine dön
      </Button>
    </div>
  )
}
