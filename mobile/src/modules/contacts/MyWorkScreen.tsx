// Bugün / Benim İşlerim — kullanıcının günlük çalışma listesi: geciken ve bugünkü
// etkinlikler (hızlı "Tamamla" ile) ve açık fırsatlarım. Etkinlikler
// activities.list({}) ile, fırsatlar opportunities.list({mine:true}) ile çekilir.

import * as React from 'react'
import { View } from 'react-native'
import { ContactsPermissions, type ActivityDto } from '@turbohesap/shared'
import {
  Badge,
  Button,
  EmptyState,
  ListCard,
  ListRow,
  PermissionRequired,
  Screen,
  Section,
  Skeleton,
  Text,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { formatDate } from '../../lib/datetime'
import { useAsync } from '../../lib/use-async'
import { useSubmit } from '../../lib/use-submit'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { formatMoney } from './format'

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

export function MyWorkScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const { submit, busy } = useSubmit()

  const canActRead = hasPermission(ContactsPermissions.activitiesRead)
  const canActWrite = hasPermission(ContactsPermissions.activitiesWrite)
  const canOpps = hasPermission(ContactsPermissions.opportunitiesRead)

  const activities = useAsync(() => api.contacts.activities.list({}), [], { enabled: canActRead })
  const opps = useAsync(() => api.contacts.opportunities.list({ mine: true }), [], { enabled: canOpps })

  const due = (activities.data ?? []).filter(
    (a) => a.dueDate && a.status !== 'completed' && a.status !== 'cancelled',
  )
  const overdue = due.filter((a) => a.dueDate && isPast(a.dueDate))
  const today = due.filter((a) => a.dueDate && isToday(a.dueDate))
  const openOpps = (opps.data ?? []).filter((o) => !o.isClosed)

  const complete = (id: string) =>
    submit(() => api.contacts.activities.update(id, { status: 'completed' }).then(() => activities.refetch()), {
      errorTitle: 'İşlem başarısız',
    })

  const activityRow = (a: ActivityDto, overdueRow: boolean) => (
    <ListRow
      key={a.id}
      icon="calendar"
      title={a.subject}
      subtitle={a.dueDate ? formatDate(a.dueDate) : undefined}
      trailing={
        canActWrite ? (
          <Button title="Tamamla" icon="check-circle" variant="ghost" size="sm" disabled={busy} onPress={() => complete(a.id)} />
        ) : overdueRow ? (
          <Badge label="Gecikti" tone="destructive" />
        ) : undefined
      }
    />
  )

  return (
    <PermissionRequired permission={ContactsPermissions.activitiesRead} title="Bugün" onBack={nav.canGoBack ? nav.goBack : undefined}>
      <Screen
        header={{ title: 'Bugün', large: !nav.canGoBack, onBack: nav.canGoBack ? nav.goBack : undefined }}
        onRefresh={() => {
          activities.refetch()
          opps.refetch()
        }}
        refreshing={activities.refreshing || opps.refreshing}
      >
        <Section title={`Geciken etkinlikler (${overdue.length})`}>
          {activities.loading ? (
            <Skeleton width="100%" height={60} />
          ) : overdue.length === 0 ? (
            <EmptyState icon="check-circle" title="Geciken yok" description="Geciken etkinlik bulunmuyor." />
          ) : (
            <ListCard>{overdue.map((a) => activityRow(a, true))}</ListCard>
          )}
        </Section>

        <Section title={`Bugünkü etkinlikler (${today.length})`}>
          {activities.loading ? (
            <Skeleton width="100%" height={60} />
          ) : today.length === 0 ? (
            <EmptyState icon="calendar" title="Plan yok" description="Bugün planlı etkinlik yok." />
          ) : (
            <ListCard>{today.map((a) => activityRow(a, false))}</ListCard>
          )}
        </Section>

        {canOpps ? (
          <Section title={`Açık fırsatlarım (${openOpps.length})`}>
            {opps.loading ? (
              <Skeleton width="100%" height={60} />
            ) : openOpps.length === 0 ? (
              <EmptyState icon="target" title="Fırsat yok" description="Açık fırsatın yok." />
            ) : (
              <ListCard>
                {openOpps.map((o) => (
                  <ListRow
                    key={o.id}
                    icon="target"
                    title={o.name}
                    subtitle={o.contact?.name ?? 'Cari yok'}
                    trailing={
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <Text style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                          {formatMoney(o.expectedRevenue, o.currencyCode)}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[1.5] }}>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: o.stageColor }} />
                          <Text variant="caption" tone="muted">
                            {o.stageName}
                          </Text>
                        </View>
                      </View>
                    }
                    onPress={() => nav.navigate('contacts.opportunities.detail', { id: o.id }, o.name)}
                  />
                ))}
              </ListCard>
            )}
          </Section>
        ) : null}
      </Screen>
    </PermissionRequired>
  )
}
