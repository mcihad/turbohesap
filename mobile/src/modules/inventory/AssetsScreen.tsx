// AssetsScreen — Demirbaş listesi. Tab/nav target for "Demirbaşlar". Gated by
// inventory.assets.read. Search box + a horizontal status-filter chip rail; each
// row shows kod · ad · durum + kimde (current holder) and a vehicle icon for
// vehicles. Tap → asset detail.

import * as React from 'react'
import { Pressable, ScrollView, View } from 'react-native'

import {
  ASSET_STATUS_LABELS,
  ASSET_STATUSES,
  InventoryPermissions,
  type AssetStatus,
} from '@turbohesap/shared'

import {
  Badge,
  EmptyState,
  Icon,
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
import { assetStatusTone } from './asset-labels'

export function AssetsScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(InventoryPermissions.assetsRead)

  const [search, setSearch] = React.useState('')
  const [status, setStatus] = React.useState<AssetStatus | 'all'>('all')

  const assets = useAsync(() => api.inventory.assets.list(), [], { enabled: canRead })
  const list = assets.data ?? []

  const q = search.trim().toLocaleLowerCase('tr')
  const rows = React.useMemo(
    () =>
      list.filter((a) => {
        if (status !== 'all' && a.status !== status) return false
        if (q) {
          const hay = `${a.name} ${a.code} ${a.plate ?? ''} ${a.serialNo ?? ''} ${a.currentEmployeeName ?? ''}`.toLocaleLowerCase('tr')
          if (!hay.includes(q)) return false
        }
        return true
      }),
    [list, status, q],
  )

  const anyFilter = !!q || status !== 'all'

  return (
    <PermissionRequired
      permission={InventoryPermissions.assetsRead}
      title="Demirbaşlar"
      onBack={nav.canGoBack ? nav.goBack : undefined}
    >
      <Screen
        header={{
          title: 'Demirbaşlar',
          large: !nav.canGoBack,
          onBack: nav.canGoBack ? nav.goBack : undefined,
        }}
        onRefresh={assets.refetch}
        refreshing={assets.refreshing}
      >
        <Input
          icon="search"
          placeholder="Demirbaş adı, kod, plaka, seri no…"
          value={search}
          onChangeText={setSearch}
        />

        {/* Status filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: t.spacing[2], paddingVertical: t.spacing[1] }}
        >
          <FilterChip label="Tümü" active={status === 'all'} onPress={() => setStatus('all')} />
          {ASSET_STATUSES.map((s) => (
            <FilterChip
              key={s}
              label={ASSET_STATUS_LABELS[s]}
              active={status === s}
              onPress={() => setStatus(s)}
            />
          ))}
        </ScrollView>

        {assets.loading ? (
          <SkeletonRows count={6} />
        ) : assets.error ? (
          <EmptyState
            icon="alert-triangle"
            tone="destructive"
            title="Yüklenemedi"
            description={assets.error}
            actionLabel="Tekrar dene"
            onAction={assets.refetch}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="truck"
            title="Demirbaş yok"
            description={anyFilter ? 'Filtreyle eşleşen demirbaş bulunamadı.' : 'Henüz demirbaş eklenmemiş.'}
          />
        ) : (
          <>
            <Text variant="overline" tone="muted" style={{ paddingHorizontal: t.spacing[1] }}>
              {rows.length} demirbaş
            </Text>
            <ListCard>
              {rows.map((a) => (
                <ListRow
                  key={a.id}
                  icon={a.isVehicle ? 'truck' : 'box'}
                  title={a.name}
                  subtitle={`${a.code}${a.currentEmployeeName ? ` · ${a.currentEmployeeName}` : ''}${a.plate ? ` · ${a.plate}` : ''}`}
                  trailing={<Badge label={ASSET_STATUS_LABELS[a.status]} tone={assetStatusTone(a.status)} />}
                  onPress={() => nav.navigate('inventory.assetDetail', { id: a.id }, a.name)}
                />
              ))}
            </ListCard>
          </>
        )}
      </Screen>
    </PermissionRequired>
  )
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const t = useTheme()
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          paddingHorizontal: t.spacing[3.5],
          height: 34,
          justifyContent: 'center',
          borderRadius: t.radius.full,
          borderWidth: 1,
          borderColor: active ? t.colors.primary : t.colors.inputBorder,
          backgroundColor: active ? t.colors.primarySoft : t.colors.card,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Text variant="label" weight={active ? 'semibold' : 'medium'} style={{ color: active ? t.colors.primary : t.colors.mutedForeground }}>
        {label}
      </Text>
    </Pressable>
  )
}
