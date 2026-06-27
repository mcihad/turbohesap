// ChannelsScreen — sales channels list (/api/sales/channels). Gated by
// sales.channels.read; a "+" header action (write-gated) opens the create form;
// rows drill into the detail.

import * as React from 'react'
import { View } from 'react-native'

import { SalesPermissions } from '@turbohesap/shared'

import {
  Badge,
  EmptyState,
  HeaderAction,
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
import { useAsync } from '../../lib/use-async'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { salesChannelTypeLabel } from './labels'

export function ChannelsScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(SalesPermissions.channelsRead)
  const canWrite = hasPermission(SalesPermissions.channelsWrite)
  const [query, setQuery] = React.useState('')
  const channels = useAsync(() => api.sales.channels.list(), [], { enabled: canRead })

  const filtered = React.useMemo(() => {
    const list = channels.data ?? []
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter((c) =>
      [c.code, c.name, c.contactName].some((f) => f?.toLowerCase().includes(q)),
    )
  }, [channels.data, query])

  return (
    <PermissionRequired permission={SalesPermissions.channelsRead} title="Satış Kanalları" onBack={nav.canGoBack ? nav.goBack : undefined}>
      <Screen
        header={{
          title: 'Satış Kanalları',
          large: !nav.canGoBack,
          onBack: nav.canGoBack ? nav.goBack : undefined,
          right: canWrite ? (
            <HeaderAction icon="plus" onPress={() => nav.navigate('sales.channels.form', {}, 'Yeni kanal')} />
          ) : undefined,
        }}
        onRefresh={channels.refetch}
        refreshing={channels.refreshing}
      >
        <Input icon="search" placeholder="Kod, ad veya yetkiliye göre ara" value={query} onChangeText={setQuery} />

        {channels.loading ? (
          <SkeletonRows count={6} />
        ) : channels.error ? (
          <EmptyState icon="alert-triangle" tone="destructive" title="Yüklenemedi" description={channels.error} actionLabel="Tekrar dene" onAction={channels.refetch} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="shopping-bag"
            title="Satış kanalı yok"
            description={query ? 'Eşleşen kanal bulunamadı.' : 'Henüz satış kanalı eklenmemiş.'}
            actionLabel={canWrite && !query ? 'Yeni kanal' : undefined}
            onAction={canWrite && !query ? () => nav.navigate('sales.channels.form', {}, 'Yeni kanal') : undefined}
          />
        ) : (
          <>
            <Text variant="overline" tone="muted" style={{ paddingHorizontal: t.spacing[1] }}>
              {filtered.length} kanal
            </Text>
            <ListCard>
              {filtered.map((c) => (
                <ListRow
                  key={c.id}
                  icon="shopping-bag"
                  title={c.name}
                  subtitle={`${c.code} · ${salesChannelTypeLabel(c.type)}`}
                  trailing={
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Badge label={c.isActive ? 'Aktif' : 'Pasif'} tone={c.isActive ? 'success' : 'muted'} />
                      {c.isDefault ? <Badge label="Varsayılan" tone="info" /> : null}
                    </View>
                  }
                  onPress={() => nav.navigate('sales.channels.detail', { id: c.id }, c.name)}
                />
              ))}
            </ListCard>
          </>
        )}
      </Screen>
    </PermissionRequired>
  )
}
