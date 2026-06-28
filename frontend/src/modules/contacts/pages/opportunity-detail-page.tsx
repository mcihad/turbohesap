import * as React from 'react'
import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Banknote,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  Flame,
  Mail,
  Pencil,
  Percent,
  Phone,
  Plus,
  Send,
  StickyNote,
  Target,
  Trash2,
  TrendingUp,
  Users,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  ContactsPermissions,
  toApiError,
  type ActivityDto,
  type ActivityStatus,
  type ActivityType,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { useRegisterBreadcrumbLabel } from '@/lib/layout/breadcrumb-store'
import { formatDate, formatDateTime, formatRelative } from '@/lib/datetime'
import { cn } from '@/lib/utils'
import { PageHeader, PageWrapper } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { StatGrid, StatTile } from '@/components/layout/stat-tile'
import { formatMoney } from '../format'
import { OpportunityDialog } from '../components/opportunity-dialog'
import { ActivityDialog } from '../components/activity-dialog'
import { CloseOpportunityDialog } from '../components/close-opportunity-dialog'
import { SendMessageDialog } from '../components/send-message-dialog'
import { AiInsights } from '../components/ai-insights'

const ROUTE = '/_authed/contacts/opportunities/$id'

const TYPE_LABELS: Record<ActivityType, string> = {
  note: 'Not',
  call: 'Arama',
  meeting: 'Toplantı',
  email: 'E-posta',
  task: 'Görev',
}

const STATUS_LABELS: Record<ActivityStatus, string> = {
  open: 'Açık',
  in_progress: 'Devam',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
}

const TYPE_ICON: Record<ActivityType, LucideIcon> = {
  note: StickyNote,
  call: Phone,
  meeting: Users,
  email: Mail,
  task: CheckCircle2,
}

type ActTone = 'primary' | 'success' | 'info' | 'muted'

const STATUS_TONE: Record<ActivityStatus, ActTone> = {
  open: 'primary',
  in_progress: 'info',
  completed: 'success',
  cancelled: 'muted',
}

const TONE_CHIP: Record<ActTone, string> = {
  primary: 'bg-primary/15 text-primary',
  success: 'bg-success/15 text-success',
  info: 'bg-info/15 text-info',
  muted: 'bg-muted text-muted-foreground',
}

const STATUS_BADGE: Record<ActivityStatus, 'outline' | 'info' | 'success' | 'secondary'> = {
  open: 'outline',
  in_progress: 'info',
  completed: 'success',
  cancelled: 'secondary',
}

export function OpportunityDetailPage() {
  const { id } = useParams({ from: ROUTE })
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(ContactsPermissions.opportunitiesRead)
  const canWrite = hasPermission(ContactsPermissions.opportunitiesWrite)
  const canActivitiesWrite = hasPermission(ContactsPermissions.activitiesWrite)
  const canContactsWrite = hasPermission(ContactsPermissions.contactsWrite)

  const query = useQuery({
    queryKey: ['contacts', 'opportunities', id],
    queryFn: () => api.contacts.opportunities.get(id),
    enabled: canRead && !!id,
  })

  const activitiesQuery = useQuery({
    queryKey: ['contacts', 'activities', { opportunityId: id }],
    queryFn: () => api.contacts.activities.list({ opportunityId: id }),
    enabled: canRead && !!id,
  })

  const [editOpen, setEditOpen] = React.useState(false)
  const [closeOpen, setCloseOpen] = React.useState(false)
  const [sendOpen, setSendOpen] = React.useState(false)
  const [activityOpen, setActivityOpen] = React.useState(false)
  const [editingActivity, setEditingActivity] = React.useState<ActivityDto | null>(null)

  const opportunity = query.data

  const invalidate = () => qc.invalidateQueries({ queryKey: ['contacts', 'opportunities', id] })
  const invalidateActivities = () =>
    qc.invalidateQueries({ queryKey: ['contacts', 'activities', { opportunityId: id }] })

  const stageMutation = useMutation({
    mutationFn: (stageId: string) => api.contacts.opportunities.move(id, { stageId }),
    onSuccess: (saved) => {
      toast.success(`Aşama güncellendi: ${saved.stageName}`)
      void invalidate()
      void qc.invalidateQueries({ queryKey: ['contacts', 'opportunities'] })
    },
    onError: (e) => toast.error('Aşama değiştirilemedi', { description: toApiError(e).message }),
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.contacts.opportunities.remove(id),
    onSuccess: () => {
      toast.success('Fırsat silindi')
      void qc.invalidateQueries({ queryKey: ['contacts', 'opportunities'] })
      navigate({ to: '/contacts/opportunities' })
    },
    onError: (e) => toast.error('Silinemedi', { description: toApiError(e).message }),
  })

  const activities = activitiesQuery.data ?? []

  const openNewActivity = () => {
    setEditingActivity(null)
    setActivityOpen(true)
  }
  const openEditActivity = (a: ActivityDto) => {
    setEditingActivity(a)
    setActivityOpen(true)
  }

  return (
    <PermissionRequired permission={ContactsPermissions.opportunitiesRead}>
      <PageWrapper>
        {query.isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : !opportunity ? (
          <NotFound />
        ) : (
          <>
            <Breadcrumb id={opportunity.id} name={opportunity.name} />
            <PageHeader
              title={opportunity.name}
              description={
                [opportunity.contact?.name, opportunity.stageName]
                  .filter(Boolean)
                  .join(' · ') || undefined
              }
              audit={{
                entityType: 'Opportunity',
                entityId: opportunity.id,
                title: 'Fırsat denetim kaydı',
              }}
              actions={
                <div className="flex flex-wrap gap-2">
                  {canWrite ? (
                    <>
                      {!opportunity.isClosed ? (
                        <Button size="sm" onClick={() => setCloseOpen(true)}>
                          <CheckCircle2 />
                          Kapat
                        </Button>
                      ) : null}
                      <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                        <Pencil />
                        Düzenle
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm(`"${opportunity.name}" fırsatı silinsin mi?`)) {
                            deleteMutation.mutate()
                          }
                        }}
                      >
                        <Trash2 className="text-destructive" />
                        Sil
                      </Button>
                    </>
                  ) : null}
                  {canContactsWrite ? (
                    <Button variant="outline" size="sm" onClick={() => setSendOpen(true)}>
                      <Send />
                      Mesaj gönder
                    </Button>
                  ) : null}
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/contacts/opportunities">
                      <ArrowLeft />
                      Fırsatlar
                    </Link>
                  </Button>
                </div>
              }
            />

            <div className="space-y-5">
              <StatGrid>
                <StatTile
                  icon={Banknote}
                  tone="primary"
                  label="Fırsat tutarı"
                  value={formatMoney(opportunity.amount, opportunity.currencyCode)}
                />
                <StatTile
                  icon={TrendingUp}
                  tone="success"
                  label="Tahmini ciro"
                  hint="Olasılıkla ağırlıklandırılmış"
                  value={formatMoney(opportunity.expectedRevenue, opportunity.currencyCode)}
                />
                <StatTile
                  icon={Percent}
                  tone="info"
                  label="Kazanma olasılığı"
                  value={`%${opportunity.probability}`}
                />
                <StatTile
                  icon={Target}
                  tone="warning"
                  label="Tahmini kapanış"
                  value={
                    opportunity.expectedCloseDate ? formatDate(opportunity.expectedCloseDate) : '—'
                  }
                />
              </StatGrid>

              <StagePipeline
                pipelineId={opportunity.pipelineId}
                currentStageId={opportunity.stageId}
                disabled={!canWrite || stageMutation.isPending}
                onSelect={(stageId) => {
                  if (stageId !== opportunity.stageId) stageMutation.mutate(stageId)
                }}
              />

              <div className="grid items-start gap-5 lg:grid-cols-5">
                {/* SOL: Genel bilgiler + AI içgörüleri */}
                <div className="space-y-5 lg:col-span-3">
                <Card>
                  <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
                    <CardTitle className="text-sm">Genel bilgiler</CardTitle>
                    <div className="flex items-center gap-1.5">
                      {opportunity.isRotting ? (
                        <Badge variant="destructive">
                          <Flame className="size-3" />
                          Bekliyor
                        </Badge>
                      ) : null}
                      {opportunity.isWon ? (
                        <Badge variant="success">
                          <CheckCircle2 className="size-3" />
                          Kazanıldı
                        </Badge>
                      ) : null}
                      {opportunity.isClosed && !opportunity.isWon ? (
                        <Badge variant="destructive">
                          <XCircle className="size-3" />
                          Kapandı
                        </Badge>
                      ) : null}
                      {!opportunity.isClosed ? <Badge variant="outline">Açık</Badge> : null}
                    </div>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-x-6 gap-y-4">
                    <Field
                      label="Cari"
                      value={
                        opportunity.contact ? (
                          <Link
                            to="/contacts/contacts/$id"
                            params={{ id: opportunity.contact.id }}
                            className="text-primary hover:underline"
                          >
                            {opportunity.contact.name}
                          </Link>
                        ) : (
                          '—'
                        )
                      }
                    />
                    <Field label="Kaynak" value={opportunity.source || '—'} />
                    <Field label="Para birimi" value={opportunity.currencyCode} mono />
                    <Field
                      label="Aşama"
                      value={
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-block size-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: opportunity.stageColor }}
                          />
                          {opportunity.stageName}
                        </span>
                      }
                    />
                    <Field label="Sorumlu" value={opportunity.owner?.name || '—'} />
                    <Field label="Aşamada geçen süre" value={`${opportunity.daysInStage} gün`} />
                    {opportunity.winReason ? (
                      <Field label="Kazanma nedeni" value={opportunity.winReason} />
                    ) : null}
                    {opportunity.lossReason ? (
                      <Field label="Kaybetme nedeni" value={opportunity.lossReason} />
                    ) : null}
                    <Field label="Oluşturma" value={formatDateTime(opportunity.createdAt)} />
                    <Field label="Güncelleme" value={formatDateTime(opportunity.updatedAt)} />
                    {opportunity.notes ? (
                      <Field label="Notlar" value={opportunity.notes} full />
                    ) : null}
                  </CardContent>
                </Card>

                  <AiInsights opportunityId={opportunity.id} />
                </div>

                {/* SAĞ: Etkinlikler zaman çizelgesi */}
                <div className="lg:col-span-2">
                  <ActivityTimeline
                    activities={activities}
                    loading={activitiesQuery.isLoading}
                    canWrite={canActivitiesWrite}
                    onAdd={openNewActivity}
                    onEdit={openEditActivity}
                  />
                </div>
              </div>
            </div>

            <OpportunityDialog
              open={editOpen}
              onOpenChange={setEditOpen}
              editing={opportunity}
              onSaved={() => void invalidate()}
            />
            <CloseOpportunityDialog
              open={closeOpen}
              onOpenChange={setCloseOpen}
              opportunity={opportunity}
              onClosed={() => {
                void invalidate()
                void qc.invalidateQueries({ queryKey: ['contacts', 'opportunities'] })
              }}
            />
            <ActivityDialog
              open={activityOpen}
              onOpenChange={setActivityOpen}
              editing={editingActivity}
              opportunityId={opportunity.id}
              onSaved={() => void invalidateActivities()}
            />
            <SendMessageDialog
              open={sendOpen}
              onOpenChange={setSendOpen}
              contactId={opportunity.contact?.id}
              opportunityId={opportunity.id}
              defaults={{ channel: 'email', to: '' }}
            />
          </>
        )}
      </PageWrapper>
    </PermissionRequired>
  )
}

function StagePipeline({
  pipelineId,
  currentStageId,
  disabled,
  onSelect,
}: {
  pipelineId: string
  currentStageId: string
  disabled: boolean
  onSelect: (stageId: string) => void
}) {
  const pipelineQuery = useQuery({
    queryKey: ['contacts', 'pipelines', pipelineId],
    queryFn: () => api.contacts.pipelines.get(pipelineId),
    enabled: !!pipelineId,
  })

  if (pipelineQuery.isLoading) {
    return (
      <Card>
        <CardContent className="px-4 py-5">
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    )
  }

  const pipeline = pipelineQuery.data
  if (!pipeline) return null

  const stages = [...pipeline.stages].sort((a, b) => a.sortOrder - b.sortOrder)
  const currentIndex = stages.findIndex((s) => s.id === currentStageId)

  return (
    <Card>
      <CardContent className="px-4 py-5">
        <div className="flex items-start">
          {stages.map((stage, index) => {
            const isCurrent = index === currentIndex
            const isPast = currentIndex >= 0 && index < currentIndex
            const isFuture = !isCurrent && !isPast
            const filled = isCurrent || isPast
            const last = index === stages.length - 1
            return (
              <button
                key={stage.id}
                type="button"
                disabled={disabled}
                onClick={() => onSelect(stage.id)}
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'group relative flex flex-1 flex-col items-center gap-2 outline-none',
                  !disabled && 'cursor-pointer',
                  disabled && 'cursor-default',
                )}
              >
                {/* connector to the next node */}
                {!last ? (
                  <span
                    className={cn(
                      'absolute top-4 left-1/2 h-0.5 w-full -translate-y-1/2 transition-colors',
                      !isPast && 'bg-border',
                    )}
                    style={isPast ? { backgroundColor: stage.color } : undefined}
                  />
                ) : null}
                {/* node */}
                <span
                  className={cn(
                    'relative z-10 flex size-8 items-center justify-center rounded-full border-2 text-xs font-semibold tabular-nums transition-colors',
                    isFuture &&
                      'border-border bg-card text-muted-foreground group-hover:border-primary/40 group-hover:text-foreground',
                  )}
                  style={
                    filled
                      ? {
                          backgroundColor: stage.color,
                          borderColor: stage.color,
                          color: '#fff',
                          boxShadow: isCurrent ? `0 0 0 4px ${stage.color}33` : undefined,
                        }
                      : undefined
                  }
                >
                  {isPast ? <Check className="size-4" /> : index + 1}
                </span>
                {/* label */}
                <span className="flex flex-col items-center gap-0.5 px-1">
                  <span
                    className={cn(
                      'text-center text-xs leading-tight',
                      isCurrent
                        ? 'font-semibold text-foreground'
                        : isPast
                          ? 'font-medium text-foreground'
                          : 'text-muted-foreground',
                    )}
                  >
                    {stage.name}
                  </span>
                  <span className="text-2xs tabular-nums text-muted-foreground/70">
                    %{stage.probability}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

/** Etkinlikler — sürekli çizgili, düğümlü, şık dikey zaman çizelgesi (ekle/düzenle). */
function ActivityTimeline({
  activities,
  loading,
  canWrite,
  onAdd,
  onEdit,
}: {
  activities: ActivityDto[]
  loading: boolean
  canWrite: boolean
  onAdd: () => void
  onEdit: (a: ActivityDto) => void
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-sm">
          <CalendarClock className="size-4 text-muted-foreground" />
          Etkinlikler
          {activities.length > 0 ? (
            <span className="text-xs font-normal text-muted-foreground">({activities.length})</span>
          ) : null}
        </CardTitle>
        {canWrite ? (
          <Button variant="outline" size="sm" onClick={onAdd}>
            <Plus />
            Ekle
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="ml-1 space-y-6 border-l-2 border-border/70 pl-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <CalendarClock className="size-5" />
            </span>
            <p className="text-sm text-muted-foreground">Henüz etkinlik eklenmedi.</p>
            {canWrite ? (
              <Button variant="outline" size="sm" onClick={onAdd}>
                <Plus />
                İlk etkinliği ekle
              </Button>
            ) : null}
          </div>
        ) : (
          <ol className="relative ml-1 border-l-2 border-border/70 pl-6">
            {activities.map((a) => {
              const Icon = TYPE_ICON[a.activityType]
              const tone = STATUS_TONE[a.status]
              const at = a.dueDate ?? a.createdAt
              return (
                <li key={a.id} className="relative pb-6 last:pb-0">
                  {/* node centered on the rail */}
                  <span
                    className={cn(
                      'absolute top-0.5 -left-9 flex size-6 items-center justify-center rounded-full ring-4 ring-card',
                      TONE_CHIP[tone],
                    )}
                  >
                    <Icon className="size-3" />
                  </span>
                  <div
                    role={canWrite ? 'button' : undefined}
                    tabIndex={canWrite ? 0 : undefined}
                    onClick={() => canWrite && onEdit(a)}
                    onKeyDown={(e) => {
                      if (canWrite && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault()
                        onEdit(a)
                      }
                    }}
                    className={cn(
                      '-mx-2 rounded-lg px-2 py-1 transition-colors',
                      canWrite && 'cursor-pointer hover:bg-accent/40',
                    )}
                  >
                    <time className="text-2xs font-medium tracking-wide text-muted-foreground uppercase">
                      {formatRelative(at)}
                    </time>
                    <p className="mt-0.5 text-sm leading-snug font-medium">{a.subject}</p>
                    {a.description ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">{a.description}</p>
                    ) : null}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="gap-1 font-normal">
                        <Icon className="size-3" />
                        {TYPE_LABELS[a.activityType]}
                      </Badge>
                      <Badge variant={STATUS_BADGE[a.status]}>{STATUS_LABELS[a.status]}</Badge>
                      {a.dueDate ? (
                        <span className="flex items-center gap-1 text-2xs text-muted-foreground">
                          <Clock className="size-3" />
                          {formatDate(a.dueDate)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  )
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
    <div className={cn('space-y-0.5', full && 'col-span-full')}>
      <dt className="text-2xs tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className={cn('text-sm', mono && 'font-mono')}>{value}</dd>
    </div>
  )
}

function Breadcrumb({ id, name }: { id: string; name: string }) {
  useRegisterBreadcrumbLabel(`/contacts/opportunities/${id}`, name)
  return null
}

function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground">
      <p>Fırsat bulunamadı.</p>
      <Button variant="outline" onClick={() => navigate({ to: '/contacts/opportunities' })}>
        <ArrowLeft />
        Fırsatlara dön
      </Button>
    </div>
  )
}
