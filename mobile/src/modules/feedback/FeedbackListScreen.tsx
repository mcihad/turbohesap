// FeedbackListScreen — the feedback triage list (/api/feedback). Gated by
// feedback.read; a status filter + text search; rows drill into the detail.

import * as React from 'react'
import { Pressable, ScrollView, View } from 'react-native'

import { FEEDBACK_STATUSES, FeedbackPermissions, type FeedbackStatus } from '@turbohesap/shared'

import {
  Badge,
  EmptyState,
  Input,
  ListCard,
  ListRow,
  PermissionRequired,
  Screen,
  SkeletonRows,
  Text,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { formatDateTime } from '../../lib/datetime'
import { useAsync } from '../../lib/use-async'
import { ModuleSwitcherButton } from '../../navigation/ModuleSwitcher'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import {
  feedbackPriorityLabel,
  feedbackPriorityTone,
  feedbackStatusLabel,
  feedbackStatusTone,
  feedbackTypeIcon,
  feedbackTypeLabel,
} from './labels'

type StatusFilter = 'all' | FeedbackStatus

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  ...FEEDBACK_STATUSES.map((s) => ({ value: s, label: feedbackStatusLabel(s) })),
]

// A horizontally-scrolling chip row — the 5 status labels are too long to fit a
// flex-1 SegmentedControl on a phone (they wrap to a second line).
function StatusChips({
  value,
  onChange,
}: {
  value: StatusFilter
  onChange: (v: StatusFilter) => void
}) {
  const t = useTheme()
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: t.spacing[2], paddingVertical: t.spacing[0.5] }}
    >
      {STATUS_FILTERS.map((opt) => {
        const active = opt.value === value
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={{
              paddingHorizontal: t.spacing[4],
              paddingVertical: t.spacing[2],
              borderRadius: t.radius.full,
              borderWidth: 1,
              borderColor: active ? t.colors.primary : t.colors.border,
              backgroundColor: active ? t.colors.primary : t.colors.card,
            }}
          >
            <Text
              variant="label"
              weight={active ? 'semibold' : 'medium'}
              numberOfLines={1}
              style={{ color: active ? t.colors.primaryForeground : t.colors.mutedForeground }}
            >
              {opt.label}
            </Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

export function FeedbackListScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(FeedbackPermissions.read)
  const [status, setStatus] = React.useState<StatusFilter>('all')
  const [query, setQuery] = React.useState('')

  const feedback = useAsync(
    () => api.feedback.list(status === 'all' ? undefined : { status }),
    [status],
    { enabled: canRead },
  )

  const filtered = React.useMemo(() => {
    const list = feedback.data ?? []
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter((f) =>
      [f.title, f.message, f.createdByName].some((v) => v?.toLowerCase().includes(q)),
    )
  }, [feedback.data, query])

  return (
    <PermissionRequired permission={FeedbackPermissions.read} title="Geri Bildirim" onBack={nav.canGoBack ? nav.goBack : undefined}>
      <Screen
        header={{
          title: 'Geri Bildirim',
          large: !nav.canGoBack,
          onBack: nav.canGoBack ? nav.goBack : undefined,
          right: nav.canGoBack ? undefined : <ModuleSwitcherButton />,
        }}
        onRefresh={feedback.refetch}
        refreshing={feedback.refreshing}
      >
        <StatusChips value={status} onChange={setStatus} />
        <Input icon="search" placeholder="Başlık, not veya gönderene göre ara" value={query} onChangeText={setQuery} />

        {feedback.loading ? (
          <SkeletonRows count={6} />
        ) : feedback.error ? (
          <EmptyState icon="alert-triangle" tone="destructive" title="Yüklenemedi" description={feedback.error} actionLabel="Tekrar dene" onAction={feedback.refetch} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="message-circle"
            title="Geri bildirim yok"
            description={query || status !== 'all' ? 'Eşleşen kayıt bulunamadı.' : 'Henüz geri bildirim gönderilmemiş.'}
          />
        ) : (
          <>
            <Text variant="overline" tone="muted" style={{ paddingHorizontal: t.spacing[1] }}>
              {filtered.length} kayıt
            </Text>
            <ListCard>
              {filtered.map((f) => (
                <ListRow
                  key={f.id}
                  icon={feedbackTypeIcon(f.type)}
                  title={f.title?.trim() || f.message}
                  subtitle={`${feedbackTypeLabel(f.type)} · ${f.createdByName} · ${formatDateTime(f.createdAt)}`}
                  trailing={
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Badge label={feedbackStatusLabel(f.status)} tone={feedbackStatusTone(f.status)} />
                      {f.priority === 'high' ? (
                        <Badge label={feedbackPriorityLabel(f.priority)} tone={feedbackPriorityTone(f.priority)} />
                      ) : null}
                    </View>
                  }
                  onPress={() => nav.navigate('feedback.detail', { id: f.id }, f.title?.trim() || 'Geri bildirim')}
                />
              ))}
            </ListCard>
          </>
        )}
      </Screen>
    </PermissionRequired>
  )
}
