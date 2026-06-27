// AuditLogsScreen — recent audit entries (/api/iam/audit-logs, paged). Each row
// shows the action (tinted), the entity, who/when and the owning module. Gated
// by iam.audit.read. Read-only.

import * as React from 'react'
import { View } from 'react-native'

import { type AuditAction, IamPermissions } from '@turbohesap/shared'

import {
  Badge,
  type BadgeTone,
  EmptyState,
  ListCard,
  ListRow,
  PermissionRequired,
  Screen,
  SkeletonRows,
  Text,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { formatRelative } from '../../lib/datetime'
import { useAsync } from '../../lib/use-async'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'

const ACTION_META: Record<AuditAction, { tone: BadgeTone; label: string; icon: 'plus' | 'edit-2' | 'trash-2' }> = {
  Insert: { tone: 'success', label: 'Eklendi', icon: 'plus' },
  Update: { tone: 'info', label: 'Güncellendi', icon: 'edit-2' },
  Delete: { tone: 'destructive', label: 'Silindi', icon: 'trash-2' },
}

export function AuditLogsScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(IamPermissions.auditRead)
  const logs = useAsync(() => api.iam.auditLogs.list({ pageSize: 50 }), [], { enabled: canRead })

  const items = logs.data?.items ?? []

  return (
    <PermissionRequired permission={IamPermissions.auditRead} title="Denetim Kayıtları" onBack={nav.canGoBack ? nav.goBack : undefined}>
      <Screen header={{ title: 'Denetim Kayıtları', onBack: nav.canGoBack ? nav.goBack : undefined }} onRefresh={logs.refetch} refreshing={logs.refreshing}>
        {logs.loading ? (
          <SkeletonRows count={7} />
        ) : logs.error ? (
          <EmptyState icon="alert-triangle" tone="destructive" title="Yüklenemedi" description={logs.error} actionLabel="Tekrar dene" onAction={logs.refetch} />
        ) : items.length === 0 ? (
          <EmptyState icon="file-text" title="Kayıt yok" description="Henüz denetim kaydı bulunmuyor." />
        ) : (
          <>
            <Text variant="overline" tone="muted" style={{ paddingHorizontal: t.spacing[1] }}>
              Son {items.length} / {logs.data?.total ?? items.length}
            </Text>
            <ListCard>
              {items.map((log) => {
                const meta = ACTION_META[log.action]
                return (
                  <ListRow
                    key={log.id}
                    icon={meta.icon}
                    iconTone="muted"
                    title={`${log.entityType}${log.entityId ? ` #${log.entityId.slice(0, 8)}` : ''}`}
                    subtitle={`${log.userName ?? 'sistem'} · ${formatRelative(log.createdAt)}`}
                    trailing={
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <Badge label={meta.label} tone={meta.tone} />
                      </View>
                    }
                    onPress={() => nav.navigate('iam.audit.detail', { id: log.id }, log.entityType)}
                  />
                )
              })}
            </ListCard>
          </>
        )}
      </Screen>
    </PermissionRequired>
  )
}
