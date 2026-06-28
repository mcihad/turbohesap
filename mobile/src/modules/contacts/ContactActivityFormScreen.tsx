import * as React from 'react'
import { ActivityIndicator, View } from 'react-native'
import {
  ACTIVITY_PRIORITIES,
  ACTIVITY_STATUSES,
  ACTIVITY_TYPES,
  ContactsPermissions,
  type ActivityPriority,
  type ActivityStatus,
  type ActivityType,
  type CreateActivityRequest,
} from '@turbohesap/shared'
import {
  Button,
  EmptyState,
  FormDatePicker,
  FormSelect,
  FormTextArea,
  Input,
  Screen,
  Section,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { confirmDestructive, useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'

const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  note: 'Not',
  call: 'Arama',
  meeting: 'Toplantı',
  email: 'E-posta',
  task: 'Görev',
}

const ACTIVITY_STATUS_LABELS: Record<ActivityStatus, string> = {
  open: 'Açık',
  in_progress: 'Devam ediyor',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
}

const ACTIVITY_PRIORITY_LABELS: Record<ActivityPriority, string> = {
  low: 'Düşük',
  normal: 'Normal',
  high: 'Yüksek',
}

const TYPE_OPTIONS = ACTIVITY_TYPES.map((v) => ({ value: v, label: ACTIVITY_TYPE_LABELS[v] }))
const STATUS_OPTIONS = ACTIVITY_STATUSES.map((v) => ({ value: v, label: ACTIVITY_STATUS_LABELS[v] }))
const PRIORITY_OPTIONS = ACTIVITY_PRIORITIES.map((v) => ({ value: v, label: ACTIVITY_PRIORITY_LABELS[v] }))

interface FormState {
  activityType: ActivityType
  subject: string
  description: string
  status: ActivityStatus
  priority: ActivityPriority
  dueDate: string
}

const EMPTY: FormState = {
  activityType: 'note',
  subject: '',
  description: '',
  status: 'open',
  priority: 'normal',
  dueDate: '',
}

export function ContactActivityFormScreen() {
  const nav = useNav()
  const { hasPermission } = useAuth()
  const contactId = nav.current.params?.contactId ? String(nav.current.params.contactId) : null
  const opportunityId = nav.current.params?.opportunityId ? String(nav.current.params.opportunityId) : null
  const id = nav.current.params?.id ? String(nav.current.params.id) : null
  const editing = !!id
  const { submit, busy } = useSubmit()

  const existing = useAsync(() => api.contacts.activities.get(id as string), [id], {
    enabled: editing,
  })

  const [form, setForm] = React.useState<FormState>(EMPTY)
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  React.useEffect(() => {
    if (existing.data) {
      const d = existing.data
      setForm({
        activityType: d.activityType,
        subject: d.subject,
        description: d.description ?? '',
        status: d.status,
        priority: d.priority,
        dueDate: d.dueDate ?? '',
      })
    }
  }, [existing.data])

  const handleSave = () => {
    if (!form.subject.trim()) {
      alert('Konu girilmelidir')
      return
    }

    submit(async () => {
      const fields = {
        activityType: form.activityType,
        subject: form.subject.trim(),
        description: form.description.trim() || null,
        status: form.status,
        priority: form.priority,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
      }

      if (editing) {
        await api.contacts.activities.update(id as string, fields)
      } else {
        await api.contacts.activities.create({
          contactId,
          opportunityId,
          ...fields,
        } as CreateActivityRequest)
      }
      nav.goBack()
    })
  }

  const handleDelete = () => {
    if (!id) return
    confirmDestructive('Etkinliği sil', 'Bu etkinlik silinsin mi?', () =>
      submit(() => api.contacts.activities.remove(id), { onSuccess: nav.goBack }),
    )
  }

  if (!hasPermission(ContactsPermissions.activitiesWrite)) {
    return (
      <Screen header={{ title: editing ? 'Etkinlik düzenle' : 'Yeni etkinlik', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu sayfada düzenleme yapma yetkiniz yok." />
      </Screen>
    )
  }

  return (
    <Screen
      header={{
        title: editing ? 'Etkinlik düzenle' : 'Yeni etkinlik',
        onBack: nav.goBack,
      }}
      footer={
        !(editing && existing.loading) ? (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Button title="Vazgeç" variant="outline" fullWidth onPress={nav.goBack} disabled={busy} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Kaydet" fullWidth loading={busy} onPress={handleSave} />
            </View>
          </View>
        ) : undefined
      }
    >
      {editing && existing.loading ? (
        <View style={{ flex: 1, padding: 32, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <>
          <Section title="Etkinlik Bilgileri">
            <FormSelect
              label="Tür"
              value={form.activityType}
              onChange={(v) => set('activityType', v)}
              options={TYPE_OPTIONS}
            />
            <Input label="Konu" placeholder="Örn: Teklif görüşmesi" value={form.subject} onChangeText={(v) => set('subject', v)} />
            <FormTextArea label="Açıklama" placeholder="Etkinlik detayları..." value={form.description} onChangeText={(v) => set('description', v)} />
          </Section>

          <Section title="Durum">
            <FormSelect
              label="Durum"
              value={form.status}
              onChange={(v) => set('status', v)}
              options={STATUS_OPTIONS}
            />
            <FormSelect
              label="Öncelik"
              value={form.priority}
              onChange={(v) => set('priority', v)}
              options={PRIORITY_OPTIONS}
            />
            <FormDatePicker label="Son Tarih" value={form.dueDate} onChange={(v) => set('dueDate', v)} mode="date" />
          </Section>

          {editing ? (
            <Button
              title="Etkinliği sil"
              variant="outline"
              icon="trash-2"
              fullWidth
              loading={busy}
              onPress={handleDelete}
            />
          ) : null}
        </>
      )}
    </Screen>
  )
}
