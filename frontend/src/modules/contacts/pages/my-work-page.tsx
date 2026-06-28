// Bugün / Benim İşlerim — kullanıcının günlük çalışma listesi: bugün ve geciken
// etkinlikler (hızlı tamamla butonuyla) ve açık fırsatlarım. Etkinlikler
// activities.list({}) ile çekilir; fırsatlar opportunities.list({mine:true}).

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Target,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  ContactsPermissions,
  toApiError,
  type ActivityDto,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { formatDate } from '@/lib/datetime'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { PageWrapper, PageHeader } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatMoney } from '../format'

const ACTIVITY_TYPE_LABEL: Record<string, string> = {
  note: 'Not',
  call: 'Arama',
  meeting: 'Toplantı',
  email: 'E-posta',
  task: 'Görev',
}

function isPast(iso: string): boolean {
  const d = new Date(iso)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  return d.getTime() < today.getTime()
}

function isToday(iso: string): boolean {
  const d = new Date(iso)
  const today = new Date()
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  )
}

export function MyWorkPage() {
  const qc = useQueryClient()
  const { hasPermission } = useAuth()
  const canActivities = hasPermission(ContactsPermissions.activitiesRead)
  const canWriteActivities = hasPermission(ContactsPermissions.activitiesWrite)
  const canOpps = hasPermission(ContactsPermissions.opportunitiesRead)

  const activitiesQuery = useQuery({
    queryKey: ['contacts', 'activities'],
    queryFn: () => api.contacts.activities.list({}),
    enabled: canActivities,
  })

  const oppsQuery = useQuery({
    queryKey: ['contacts', 'opportunities', { mine: true }],
    queryFn: () => api.contacts.opportunities.list({ mine: true }),
    enabled: canOpps,
  })

  const completeMutation = useMutation({
    mutationFn: (id: string) => api.contacts.activities.update(id, { status: 'completed' }),
    onSuccess: () => {
      toast.success('Etkinlik tamamlandı')
      void qc.invalidateQueries({ queryKey: ['contacts', 'activities'] })
    },
    onError: (e) => {
      toast.error('İşlem başarısız', { description: toApiError(e).message })
    },
  })

  const due = (activitiesQuery.data ?? []).filter(
    (a) => a.dueDate && a.status !== 'completed' && a.status !== 'cancelled',
  )
  const overdue = due.filter((a) => a.dueDate && isPast(a.dueDate))
  const today = due.filter((a) => a.dueDate && isToday(a.dueDate))

  const openOpps = (oppsQuery.data ?? []).filter((o) => !o.isClosed)

  const renderActivityRow = (a: ActivityDto, overdueRow: boolean) => (
    <li
      key={a.id}
      className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{a.subject}</p>
        <p className="flex items-center gap-2 truncate text-xs text-muted-foreground">
          <Badge variant="outline" className="px-1.5 py-0 text-2xs">
            {ACTIVITY_TYPE_LABEL[a.activityType] ?? a.activityType}
          </Badge>
          {a.dueDate ? (
            <span className={overdueRow ? 'text-destructive' : undefined}>
              {formatDate(a.dueDate)}
            </span>
          ) : null}
        </p>
      </div>
      {canWriteActivities ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => completeMutation.mutate(a.id)}
          disabled={completeMutation.isPending}
        >
          <CheckCircle2 className="size-4 text-success" />
          Tamamla
        </Button>
      ) : null}
    </li>
  )

  const activitiesLoading = activitiesQuery.isLoading

  return (
    <PermissionRequired permission={ContactsPermissions.activitiesRead}>
      <PageWrapper>
        <PageHeader
          title="Bugün / Benim İşlerim"
          description="Bugünkü ve geciken etkinliklerim, açık fırsatlarım"
        />

        <div className="grid gap-3 lg:grid-cols-2">
          {/* Geciken etkinlikler */}
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <AlertTriangle className="size-4 text-destructive" />
                Geciken etkinlikler
              </CardTitle>
              <Badge variant={overdue.length ? 'destructive' : 'secondary'}>{overdue.length}</Badge>
            </CardHeader>
            <CardContent>
              {activitiesLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : overdue.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Geciken etkinlik yok</p>
              ) : (
                <ul className="space-y-2">{overdue.map((a) => renderActivityRow(a, true))}</ul>
              )}
            </CardContent>
          </Card>

          {/* Bugünkü etkinlikler */}
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Calendar className="size-4 text-info" />
                Bugünkü etkinlikler
              </CardTitle>
              <Badge variant="secondary">{today.length}</Badge>
            </CardHeader>
            <CardContent>
              {activitiesLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : today.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Bugün planlı etkinlik yok
                </p>
              ) : (
                <ul className="space-y-2">{today.map((a) => renderActivityRow(a, false))}</ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Açık fırsatlarım */}
        {canOpps ? (
          <Card className="mt-3">
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Target className="size-4 text-primary" />
                Açık fırsatlarım
              </CardTitle>
              <Badge variant="secondary">{openOpps.length}</Badge>
            </CardHeader>
            <CardContent>
              {oppsQuery.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : openOpps.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Açık fırsatın yok</p>
              ) : (
                <ul className="space-y-2">
                  {openOpps.map((o) => (
                    <li key={o.id}>
                      <Link
                        to="/contacts/opportunities/$id"
                        params={{ id: o.id }}
                        className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2 transition-colors hover:bg-accent"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{o.name}</p>
                          <p className="flex items-center gap-2 truncate text-xs text-muted-foreground">
                            {o.contact ? <span>{o.contact.name}</span> : null}
                            <Badge
                              variant="outline"
                              className="px-1.5 py-0 text-2xs"
                              style={{ borderColor: o.stageColor, color: o.stageColor }}
                            >
                              {o.stageName}
                            </Badge>
                          </p>
                        </div>
                        <span className="shrink-0 font-mono text-sm font-semibold tabular-nums">
                          {formatMoney(o.expectedRevenue, o.currencyCode)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ) : null}
      </PageWrapper>
    </PermissionRequired>
  )
}
