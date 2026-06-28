// POS register picker — tap a terminal to start selling on it.

import * as React from 'react'

import { PosPermissions } from '@turbohesap/shared'

import {
  Badge,
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
import { useAsync } from '../../lib/use-async'
import { useNav } from '../../navigation/nav-context'

export function PosRegistersScreen() {
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(PosPermissions.registersRead) || hasPermission(PosPermissions.sell)

  const registers = useAsync(() => api.pos.registers.list(), [], { enabled: canRead })
  const list = (registers.data ?? []).filter((r) => r.isActive)

  return (
    <PermissionRequired permission={PosPermissions.sell} title="POS">
      <Screen
        header={{ title: 'Kasa Seç', large: !nav.canGoBack, onBack: nav.canGoBack ? nav.goBack : undefined }}
        onRefresh={registers.refetch}
        refreshing={registers.refreshing}
      >
        {registers.loading ? (
          <SkeletonRows count={5} />
        ) : registers.error ? (
          <EmptyState icon="alert-triangle" tone="destructive" title="Yüklenemedi" description={registers.error} onAction={registers.refetch} />
        ) : list.length === 0 ? (
          <EmptyState icon="monitor" title="Kasa yok" description="Web yönetiminden kasa ekleyin." />
        ) : (
          <>
            <Text variant="overline" tone="muted">
              {list.length} kasa
            </Text>
            <ListCard>
              {list.map((r) => (
                <ListRow
                  key={r.id}
                  icon="monitor"
                  title={r.name}
                  subtitle={`${r.code}${r.branch ? ` · ${r.branch.name}` : ''}${r.salesChannel ? ` · ${r.salesChannel.name}` : ''}`}
                  trailing={
                    <Badge
                      label={r.openSessionId ? 'Vardiya açık' : 'Kapalı'}
                      tone={r.openSessionId ? 'success' : 'muted'}
                    />
                  }
                  onPress={() => nav.navigate('pos.sell', { registerId: r.id }, r.name)}
                />
              ))}
            </ListCard>
          </>
        )}
      </Screen>
    </PermissionRequired>
  )
}
