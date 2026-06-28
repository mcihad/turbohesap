// In-app notifications inbox — the mobile counterpart of the web notifications
// list. Lists per-user CRM alerts (assignment / activity due / mention / stage
// change), supports an unread/all filter, pull-to-refresh, marking all read and
// deep-linking into the linked entity on tap (marking that item read first).

import * as React from 'react'
import { Pressable, View } from 'react-native'
import { ContactsPermissions, type NotificationDto, type NotificationType } from '@turbohesap/shared'

import {
  EmptyState,
  HeaderAction,
  Icon,
  ListCard,
  PermissionRequired,
  Screen,
  SegmentedControl,
  SkeletonRows,
  Text,
  withAlpha,
  type BadgeTone,
  type IconName,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { formatRelative } from '../../lib/datetime'

type Filter = 'all' | 'unread'

const FILTER_OPTIONS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'unread', label: 'Okunmamış' },
]

const TYPE_META: Record<NotificationType, { icon: IconName; tone: BadgeTone }> = {
  assignment: { icon: 'user-plus', tone: 'primary' },
  activity_due: { icon: 'clock', tone: 'warning' },
  mention: { icon: 'at-sign', tone: 'info' },
  stage_change: { icon: 'trending-up', tone: 'success' },
}

export function NotificationsScreen() {
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(ContactsPermissions.notificationsRead)
  const [filter, setFilter] = React.useState<Filter>('all')

  const queryResult = useAsync(
    () => api.contacts.notifications.list(filter === 'unread' ? { unread: true } : {}),
    [filter],
    { enabled: canRead },
  )

  const list = queryResult.data ?? []
  const hasUnread = list.some((n) => !n.readAt)

  const markAllRead = async () => {
    try {
      await api.contacts.notifications.markAllRead()
    } finally {
      queryResult.refetch()
    }
  }

  const open = async (n: NotificationDto) => {
    if (!n.readAt) {
      try {
        await api.contacts.notifications.markRead(n.id)
      } catch {
        // best-effort; navigation/refresh still proceeds
      }
    }
    if (n.entityType === 'Opportunity' && n.entityId) {
      nav.navigate('contacts.opportunities.detail', { id: n.entityId }, n.title)
    } else {
      queryResult.refetch()
    }
  }

  return (
    <PermissionRequired permission={ContactsPermissions.notificationsRead} title="Bildirimler" onBack={nav.canGoBack ? nav.goBack : undefined}>
      <Screen
        header={{
          title: 'Bildirimler',
          large: !nav.canGoBack,
          onBack: nav.canGoBack ? nav.goBack : undefined,
          right: hasUnread ? <HeaderAction icon="check-circle" onPress={markAllRead} /> : undefined,
        }}
        onRefresh={queryResult.refetch}
        refreshing={queryResult.refreshing}
      >
        <SegmentedControl options={FILTER_OPTIONS} value={filter} onChange={setFilter} />

        {queryResult.loading ? (
          <SkeletonRows count={6} />
        ) : queryResult.error ? (
          <EmptyState icon="alert-triangle" tone="destructive" title="Yüklenemedi" description={queryResult.error} actionLabel="Tekrar dene" onAction={queryResult.refetch} />
        ) : list.length === 0 ? (
          <EmptyState
            icon="bell"
            title="Bildirim yok"
            description={filter === 'unread' ? 'Okunmamış bildiriminiz yok.' : 'Henüz bildiriminiz yok.'}
          />
        ) : (
          <ListCard>
            {list.map((n) => (
              <NotificationRow key={n.id} notification={n} onPress={() => open(n)} />
            ))}
          </ListCard>
        )}
      </Screen>
    </PermissionRequired>
  )
}

function NotificationRow({ notification, onPress }: { notification: NotificationDto; onPress: () => void }) {
  const t = useTheme()
  const meta = TYPE_META[notification.type] ?? { icon: 'bell' as IconName, tone: 'muted' as BadgeTone }
  const unread = !notification.readAt
  const toneColor =
    meta.tone === 'primary' ? t.colors.primary
      : meta.tone === 'warning' ? t.colors.warning
        : meta.tone === 'info' ? t.colors.info
          : meta.tone === 'success' ? t.colors.success
            : t.colors.mutedForeground

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: t.colors.muted }}
      style={({ pressed }) => ({
        backgroundColor: pressed
          ? t.colors.muted
          : unread
            ? withAlpha(t.colors.primary, 0.06)
            : 'transparent',
      })}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: t.spacing[3],
          paddingVertical: t.spacing[3],
          paddingHorizontal: t.spacing[4],
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: t.radius.lg,
            backgroundColor: withAlpha(toneColor, 0.14),
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={meta.icon} size={20} color={toneColor} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="label" weight={unread ? 'semibold' : 'medium'} numberOfLines={1}>
            {notification.title}
          </Text>
          {notification.body ? (
            <Text variant="caption" tone="muted" numberOfLines={2}>
              {notification.body}
            </Text>
          ) : null}
          <Text variant="caption" tone="muted">
            {formatRelative(notification.createdAt)}
          </Text>
        </View>
        {unread ? (
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.colors.primary, marginTop: t.spacing[1] }} />
        ) : null}
      </View>
    </Pressable>
  )
}
