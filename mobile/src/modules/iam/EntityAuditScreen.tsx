// EntityAuditScreen — the audit history of ONE entity (the mobile counterpart of
// the web EntityAuditTrail / PageHeader `audit` button). Params: entityType,
// entityId, title. Fetches /iam/audit-logs/entity/:type/:id (full diffs) and
// renders an expandable timeline. Gated by iam.audit.read.

import * as React from 'react'
import { Pressable, View } from 'react-native'

import {
  type AuditAction,
  type AuditLogChange,
  type AuditLogDto,
  IamPermissions,
} from '@turbohesap/shared'

import {
  Badge,
  type BadgeTone,
  Card,
  EmptyState,
  Icon,
  Screen,
  SkeletonRows,
  Text,
} from '../../components'
import { withAlpha } from '../../components/Badge'
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

function show(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

export function EntityAuditScreen() {
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(IamPermissions.auditRead)
  const entityType = String(nav.current.params?.entityType ?? '')
  const entityId = String(nav.current.params?.entityId ?? '')
  const title = nav.current.params?.title ? String(nav.current.params.title) : undefined

  const logs = useAsync(
    () => api.iam.auditLogs.forEntity(entityType, entityId),
    [entityType, entityId],
    { enabled: canRead && !!entityId },
  )

  if (!canRead) {
    return (
      <Screen header={{ title: 'Denetim geçmişi', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Denetim kayıtlarını görüntüleme izniniz yok." />
      </Screen>
    )
  }

  const items = logs.data ?? []

  return (
    <Screen
      header={{ title: 'Denetim geçmişi', subtitle: title, onBack: nav.goBack }}
      onRefresh={logs.refetch}
      refreshing={logs.refreshing}
    >
      {logs.loading ? (
        <SkeletonRows count={5} />
      ) : logs.error ? (
        <EmptyState icon="alert-triangle" tone="destructive" title="Yüklenemedi" description={logs.error} actionLabel="Tekrar dene" onAction={logs.refetch} />
      ) : items.length === 0 ? (
        <EmptyState icon="clock" title="Geçmiş yok" description="Bu kayıt için denetim geçmişi bulunmuyor." />
      ) : (
        items.map((log) => <AuditEntry key={log.id} log={log} />)
      )}
    </Screen>
  )
}

function AuditEntry({ log }: { log: AuditLogDto }) {
  const t = useTheme()
  const [open, setOpen] = React.useState(false)
  const meta = ACTION_META[log.action]

  return (
    <Card padded={false}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[3], padding: t.spacing[4] }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: t.radius.full,
            backgroundColor: withAlpha(
              meta.tone === 'success' ? t.colors.success : meta.tone === 'destructive' ? t.colors.destructive : t.colors.info,
              0.14,
            ),
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon
            name={meta.icon}
            size={16}
            color={meta.tone === 'success' ? t.colors.success : meta.tone === 'destructive' ? t.colors.destructive : t.colors.info}
          />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="label" weight="semibold">
            {meta.label}
          </Text>
          <Text variant="caption" tone="muted">
            {(log.userName ?? 'sistem') + ' · ' + formatRelative(log.createdAt)}
          </Text>
        </View>
        {log.changeCount > 0 ? <Badge label={`${log.changeCount} alan`} tone="muted" /> : null}
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} color={t.colors.mutedForeground} />
      </Pressable>

      {open && log.changes.length > 0 ? (
        <View style={{ paddingHorizontal: t.spacing[4], paddingBottom: t.spacing[4], gap: t.spacing[3] }}>
          {log.changes.map((c, i) => (
            <ChangeRow key={`${c.field}-${i}`} change={c} action={log.action} />
          ))}
        </View>
      ) : null}
    </Card>
  )
}

function ChangeRow({ change, action }: { change: AuditLogChange; action: AuditAction }) {
  const t = useTheme()
  return (
    <View style={{ gap: t.spacing[1.5], borderTopWidth: 1, borderTopColor: t.colors.border, paddingTop: t.spacing[3] }}>
      <Text variant="label" weight="medium">
        {change.field}
      </Text>
      {action !== 'Insert' ? <Chip value={show(change.oldValue)} tone="old" /> : null}
      {action !== 'Delete' ? <Chip value={show(change.newValue)} tone="new" /> : null}
    </View>
  )
}

function Chip({ value, tone }: { value: string; tone: 'old' | 'new' }) {
  const t = useTheme()
  const color = tone === 'old' ? t.colors.destructive : t.colors.success
  return (
    <View
      style={{
        backgroundColor: withAlpha(color, 0.12),
        borderRadius: t.radius.sm,
        paddingHorizontal: t.spacing[2.5],
        paddingVertical: t.spacing[1.5],
      }}
    >
      <Text variant="mono" style={{ color }}>
        {value}
      </Text>
    </View>
  )
}
