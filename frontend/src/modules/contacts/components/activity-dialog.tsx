import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  ACTIVITY_STATUSES,
  ACTIVITY_TYPES,
  toApiError,
  type ActivityDto,
  type ActivityPriority,
  type ActivityStatus,
  type ActivityType,
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
import { Textarea } from '@/components/ui/textarea'

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

const PRIORITIES: ActivityPriority[] = ['low', 'normal', 'high']
const PRIORITY_LABELS: Record<ActivityPriority, string> = {
  low: 'Düşük',
  normal: 'Normal',
  high: 'Yüksek',
}

interface FormState {
  activityType: ActivityType
  subject: string
  description: string
  status: ActivityStatus
  priority: ActivityPriority
  dueDate: string
}

function emptyForm(): FormState {
  return {
    activityType: 'note',
    subject: '',
    description: '',
    status: 'open',
    priority: 'normal',
    dueDate: '',
  }
}

export function ActivityDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
  contactId,
  opportunityId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: ActivityDto | null
  onSaved: (saved: ActivityDto) => void
  contactId?: string
  opportunityId?: string
}) {
  const [form, setForm] = React.useState<FormState>(emptyForm)

  React.useEffect(() => {
    if (!open) return
    setForm(
      editing
        ? {
            activityType: editing.activityType,
            subject: editing.subject,
            description: editing.description ?? '',
            status: editing.status,
            priority: editing.priority,
            dueDate: editing.dueDate ? editing.dueDate.slice(0, 16) : '',
          }
        : emptyForm(),
    )
  }, [open, editing])

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const save = useMutation({
    mutationFn: () => {
      const base = {
        activityType: form.activityType,
        subject: form.subject.trim(),
        description: form.description.trim() || null,
        status: form.status,
        priority: form.priority,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
      }
      return editing
        ? api.contacts.activities.update(editing.id, base)
        : api.contacts.activities.create({
            ...base,
            contactId: contactId ?? null,
            opportunityId: opportunityId ?? null,
          })
    },
    onSuccess: (saved) => {
      toast.success(editing ? 'Etkileşim güncellendi' : 'Etkileşim oluşturuldu')
      onOpenChange(false)
      onSaved(saved)
    },
    onError: (e) => toast.error('İşlem başarısız', { description: toApiError(e).message }),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto px-1 sm:max-w-xl">
        <div className="px-5">
          <DialogHeader>
            <DialogTitle>{editing ? 'Etkileşimi düzenle' : 'Yeni etkileşim'}</DialogTitle>
            <DialogDescription>Cari / fırsat etkileşim kaydı.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tür">
                <Select
                  value={form.activityType}
                  onValueChange={(v) => set('activityType', v as ActivityType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Öncelik">
                <Select
                  value={form.priority}
                  onValueChange={(v) => set('priority', v as ActivityPriority)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {PRIORITY_LABELS[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field label="Konu">
              <Input value={form.subject} onChange={(e) => set('subject', e.target.value)} autoFocus />
            </Field>

            <Field label="Açıklama">
              <Textarea
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                rows={3}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Durum">
                <Select value={form.status} onValueChange={(v) => set('status', v as ActivityStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Son tarih">
                <Input
                  type="datetime-local"
                  value={form.dueDate}
                  onChange={(e) => set('dueDate', e.target.value)}
                />
              </Field>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !form.subject.trim()}>
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
