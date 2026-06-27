// ErrorLogsScreen — captured errors (/api/iam/error-logs, paged). Each row shows
// the message, type, triage status and occurrence count. Gated by
// iam.errors.read.

import * as React from 'react'
import { View } from 'react-native'

import { type ErrorLogStatus, IamPermissions } from '@turbohesap/shared'

import {
  Badge,
  type BadgeTone,
  EmptyState,
  ListCard,
  ListRow,
  LoadMoreFooter,
  PermissionRequired,
  Screen,
  SkeletonRows,
  Text,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { formatRelative } from '../../lib/datetime'
import { usePaginated } from '../../lib/use-paginated'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'

const STATUS_META: Record<ErrorLogStatus, { tone: BadgeTone; label: string }> = {
  new: { tone: 'destructive', label: 'Yeni' },
  investigating: { tone: 'warning', label: 'İnceleniyor' },
  resolved: { tone: 'success', label: 'Çözüldü' },
  ignored: { tone: 'muted', label: 'Yok sayıldı' },
}

export function ErrorLogsScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(IamPermissions.errorsRead)
  const logs = usePaginated(
    (page) => api.iam.errorLogs.list({ page, pageSize: 30 }),
    [],
    { enabled: canRead },
  )

  const items = logs.items

  return (
    <PermissionRequired permission={IamPermissions.errorsRead} title="Hata Kayıtları" onBack={nav.canGoBack ? nav.goBack : undefined}>
      <Screen
        header={{ title: 'Hata Kayıtları', onBack: nav.canGoBack ? nav.goBack : undefined }}
        onRefresh={logs.refresh}
        refreshing={logs.refreshing}
        onEndReached={logs.loadMore}
      >
        {logs.loading ? (
          <SkeletonRows count={7} />
        ) : logs.error && items.length === 0 ? (
          <EmptyState icon="alert-triangle" tone="destructive" title="Yüklenemedi" description={logs.error} actionLabel="Tekrar dene" onAction={logs.refresh} />
        ) : items.length === 0 ? (
          <EmptyState icon="check-circle" title="Hata yok" description="Kayıtlı hata bulunmuyor. 🎉" />
        ) : (
          <>
            <Text variant="overline" tone="muted" style={{ paddingHorizontal: t.spacing[1] }}>
              {items.length} / {logs.total} kayıt
            </Text>
            <ListCard>
              {items.map((log) => {
                const meta = STATUS_META[log.status]
                return (
                  <ListRow
                    key={log.id}
                    icon={log.origin === 'server' ? 'server' : 'monitor'}
                    iconTone="muted"
                    title={log.message}
                    subtitle={`${log.exceptionType} · ${formatRelative(log.lastSeenAt)}`}
                    trailing={
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <Badge label={meta.label} tone={meta.tone} />
                        {log.occurrenceCount > 1 ? (
                          <Text variant="caption" tone="muted">
                            ×{log.occurrenceCount}
                          </Text>
                        ) : null}
                      </View>
                    }
                    onPress={() => nav.navigate('iam.errors.detail', { id: log.id }, log.exceptionType)}
                  />
                )
              })}
            </ListCard>
            <LoadMoreFooter loadingMore={logs.loadingMore} hasMore={logs.hasMore} total={logs.total} />
          </>
        )}
      </Screen>
    </PermissionRequired>
  )
}
