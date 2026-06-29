import { Link, useNavigate, useParams } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  FEEDBACK_PRIORITIES,
  FEEDBACK_PRIORITY_LABELS,
  FEEDBACK_STATUS_LABELS,
  FEEDBACK_STATUSES,
  FEEDBACK_TYPE_LABELS,
  FeedbackPermissions,
  toApiError,
  type FeedbackPriority,
  type FeedbackStatus,
} from '@turbohesap/shared'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { PermissionRequired } from '@/lib/auth/permission-gate'
import { formatDateTime } from '@/lib/datetime'
import { PageHeader, PageWrapper } from '@/components/layout/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PRIORITY_TONE, STATUS_TONE } from '../labels'

const ROUTE = '/_authed/feedback/$id'

export function FeedbackDetailPage() {
  const { id } = useParams({ from: ROUTE })
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canManage = hasPermission(FeedbackPermissions.manage)

  const query = useQuery({
    queryKey: ['feedback', 'detail', id],
    queryFn: () => api.feedback.get(id),
    enabled: hasPermission(FeedbackPermissions.read),
  })
  const item = query.data

  const update = useMutation({
    mutationFn: (input: { status?: FeedbackStatus; priority?: FeedbackPriority }) =>
      api.feedback.update(id, input),
    onSuccess: (data) => {
      qc.setQueryData(['feedback', 'detail', id], data)
      void qc.invalidateQueries({ queryKey: ['feedback', 'list'] })
      toast.success('Güncellendi')
    },
    onError: (e) => toast.error('Güncellenemedi', { description: toApiError(e).message }),
  })

  const remove = useMutation({
    mutationFn: () => api.feedback.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['feedback'] })
      toast.success('Geri bildirim silindi')
      void navigate({ to: '/feedback/items' })
    },
    onError: (e) => toast.error('Silinemedi', { description: toApiError(e).message }),
  })

  return (
    <PermissionRequired permission={FeedbackPermissions.read}>
      <PageWrapper>
        {query.isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : !item ? (
          <div className="py-20 text-center text-muted-foreground">
            Geri bildirim bulunamadı.
          </div>
        ) : (
          <>
            <PageHeader
              title={item.title?.trim() || FEEDBACK_TYPE_LABELS[item.type]}
              description={`${item.createdByName} · ${formatDateTime(item.createdAt)}`}
              actions={
                <div className="flex items-center gap-2">
                  {canManage ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (confirm('Bu geri bildirim silinsin mi?')) remove.mutate()
                      }}
                      disabled={remove.isPending}
                    >
                      <Trash2 className="text-destructive" />
                      Sil
                    </Button>
                  ) : null}
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/feedback/items">
                      <ArrowLeft />
                      Liste
                    </Link>
                  </Button>
                </div>
              }
            />

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2">
                <Card>
                  <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
                    <CardTitle className="text-sm">Not</CardTitle>
                    <Badge variant="outline">{FEEDBACK_TYPE_LABELS[item.type]}</Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{item.message}</p>
                  </CardContent>
                </Card>

                {item.screenshotUrl ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Ekran görüntüsü</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <a href={item.screenshotUrl} target="_blank" rel="noreferrer">
                        <img
                          src={item.screenshotUrl}
                          alt="Ekran görüntüsü"
                          className="w-full rounded-lg border"
                        />
                      </a>
                    </CardContent>
                  </Card>
                ) : null}
              </div>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Durum</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Durum</Label>
                      {canManage ? (
                        <Select
                          value={item.status}
                          onValueChange={(v) =>
                            update.mutate({ status: v as FeedbackStatus })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FEEDBACK_STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {FEEDBACK_STATUS_LABELS[s]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div>
                          <Badge variant={STATUS_TONE[item.status]}>
                            {FEEDBACK_STATUS_LABELS[item.status]}
                          </Badge>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label>Öncelik</Label>
                      {canManage ? (
                        <Select
                          value={item.priority}
                          onValueChange={(v) =>
                            update.mutate({ priority: v as FeedbackPriority })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FEEDBACK_PRIORITIES.map((p) => (
                              <SelectItem key={p} value={p}>
                                {FEEDBACK_PRIORITY_LABELS[p]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div>
                          <Badge variant={PRIORITY_TONE[item.priority]}>
                            {FEEDBACK_PRIORITY_LABELS[item.priority]}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Bilgiler</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <Meta label="Gönderen" value={item.createdByName} />
                    <Meta label="Oluşturma" value={formatDateTime(item.createdAt)} />
                    <Meta label="Güncelleme" value={formatDateTime(item.updatedAt)} />
                    {item.pageUrl ? (
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">Sayfa</p>
                        <a
                          href={item.pageUrl}
                          className="break-all text-xs text-primary hover:underline"
                        >
                          {item.pageUrl}
                        </a>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </PageWrapper>
    </PermissionRequired>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  )
}
