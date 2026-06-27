// AuditDetailScreen — a single audit entry with its full field-level diff
// (/api/iam/audit-logs/:id). Each change shows old → new. Gated by iam.audit.read.

import * as React from 'react'
import { View } from 'react-native'

import { type AuditAction, IamPermissions } from '@turbohesap/shared'

import {
  Badge,
  type BadgeTone,
  Card,
  EmptyState,
  Field,
  FieldGrid,
  Screen,
  Section,
  Skeleton,
  Text,
} from '../../components'
import { withAlpha } from '../../components/Badge'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { formatDateTime } from '../../lib/datetime'
import { useAsync } from '../../lib/use-async'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'

const ACTION_META: Record<AuditAction, { tone: BadgeTone; label: string }> = {
  Insert: { tone: 'success', label: 'Eklendi' },
  Update: { tone: 'info', label: 'Güncellendi' },
  Delete: { tone: 'destructive', label: 'Silindi' },
}

function show(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

export function AuditDetailScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const id = String(nav.current.params?.id ?? '')
  const log = useAsync(() => api.iam.auditLogs.get(id), [id], {
    enabled: hasPermission(IamPermissions.auditRead) && !!id,
  })
  const l = log.data

  if (!hasPermission(IamPermissions.auditRead)) {
    return (
      <Screen header={{ title: 'Denetim kaydı', onBack: nav.goBack }}>
        <EmptyState icon="shield-off" title="Yetkiniz yok" description="Bu sayfayı görüntüleme izniniz yok." />
      </Screen>
    )
  }

  return (
    <Screen
      header={{ title: l ? l.entityType : 'Denetim kaydı', subtitle: l ? ACTION_META[l.action].label : undefined, onBack: nav.goBack }}
      onRefresh={log.refetch}
      refreshing={log.refreshing}
    >
      {log.loading ? (
        <Card style={{ gap: t.spacing[3] }}>
          <Skeleton width="50%" height={16} />
          <Skeleton width="70%" height={14} />
        </Card>
      ) : log.error || !l ? (
        <EmptyState icon="alert-triangle" tone="destructive" title="Yüklenemedi" description={log.error ?? 'Kayıt bulunamadı.'} actionLabel="Tekrar dene" onAction={log.refetch} />
      ) : (
        <>
          <Card style={{ gap: t.spacing[4] }}>
            <View style={{ flexDirection: 'row' }}>
              <Badge label={ACTION_META[l.action].label} tone={ACTION_META[l.action].tone} />
            </View>
            <FieldGrid>
              <Field label="Varlık" value={l.entityType} />
              <Field label="Kayıt no" value={l.entityId ? `#${l.entityId.slice(0, 8)}` : '—'} mono />
              <Field label="Modül" value={l.module ?? '—'} />
              <Field label="Kullanıcı" value={l.userName ?? 'sistem'} />
              <Field label="IP" value={l.ipAddress ?? '—'} />
              <Field label="Zaman" value={formatDateTime(l.createdAt)} />
            </FieldGrid>
          </Card>

          <Section title={`Değişiklikler (${l.changeCount})`}>
            {l.changes.length === 0 ? (
              <Card>
                <Text variant="label" tone="muted">
                  Alan değişikliği kaydedilmemiş.
                </Text>
              </Card>
            ) : (
              l.changes.map((c, i) => (
                <Card key={`${c.field}-${i}`} style={{ gap: t.spacing[2] }}>
                  <Text variant="label" weight="semibold">
                    {c.field}
                  </Text>
                  {l.action !== 'Insert' ? (
                    <Diff value={show(c.oldValue)} tone="old" />
                  ) : null}
                  {l.action !== 'Delete' ? (
                    <Diff value={show(c.newValue)} tone="new" />
                  ) : null}
                </Card>
              ))
            )}
          </Section>
        </>
      )}
    </Screen>
  )
}

function Diff({ value, tone }: { value: string; tone: 'old' | 'new' }) {
  const t = useTheme()
  const color = tone === 'old' ? t.colors.destructive : t.colors.success
  return (
    <View
      style={{
        backgroundColor: withAlpha(tone === 'old' ? t.colors.destructive : t.colors.success, 0.12),
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
