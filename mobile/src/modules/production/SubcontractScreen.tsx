// Fason (subcontracting) sevk listesi — fason sevk belgeleri, durum çipleriyle
// süzülür. Bir satıra dokununca detay ekranına gidilir; başlıktaki "package"
// aksiyonu fasoncudaki stok görünümünü açar. Mirrors OrdersListScreen.

import * as React from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import {
  ProductionPermissions,
  type SubcontractDispatchStatus,
} from '@turbohesap/shared'
import {
  Badge,
  EmptyState,
  HeaderAction,
  ListCard,
  ListRow,
  PermissionRequired,
  Screen,
  SkeletonRows,
  Text,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { formatDate } from '../../lib/datetime'
import { useAsync } from '../../lib/use-async'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { SUBCONTRACT_DISPATCH_STATUS_LABELS, SUBCONTRACT_STATUS_TONES } from './format'

type StatusFilter = 'all' | SubcontractDispatchStatus

export function SubcontractScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(ProductionPermissions.read)
  const canManage = hasPermission(ProductionPermissions.subcontractManage)
  const [filter, setFilter] = React.useState<StatusFilter>('all')

  const dispatches = useAsync(() => api.production.subcontract.list(), [], { enabled: canRead })
  const list = dispatches.data ?? []

  const statusFilters = React.useMemo<StatusFilter[]>(() => {
    const present: SubcontractDispatchStatus[] = []
    for (const d of list) if (!present.includes(d.status)) present.push(d.status)
    return ['all', ...present]
  }, [list])

  const filtered = React.useMemo(
    () => (filter === 'all' ? list : list.filter((d) => d.status === filter)),
    [list, filter],
  )

  return (
    <PermissionRequired
      permission={ProductionPermissions.read}
      title="Fason"
      onBack={nav.canGoBack ? nav.goBack : undefined}
    >
      <Screen
        header={{
          title: 'Fason',
          large: !nav.canGoBack,
          onBack: nav.canGoBack ? nav.goBack : undefined,
          right: (
            <>
              <HeaderAction
                icon="package"
                onPress={() => nav.navigate('production.subcontract.stock', {}, 'Fasoncudaki Stok')}
              />
              {canManage ? (
                <HeaderAction
                  icon="plus"
                  onPress={() => nav.navigate('production.subcontract.entry', {}, 'Yeni fason sevk')}
                />
              ) : null}
            </>
          ),
        }}
        onRefresh={dispatches.refetch}
        refreshing={dispatches.refreshing}
      >
        {statusFilters.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: t.spacing[2], paddingHorizontal: t.spacing[0.5] }}
          >
            {statusFilters.map((s) => {
              const active = s === filter
              return (
                <Pressable
                  key={s}
                  onPress={() => setFilter(s)}
                  style={{
                    paddingHorizontal: t.spacing[3],
                    paddingVertical: t.spacing[1.5],
                    borderRadius: t.radius.full,
                    borderWidth: 1,
                    borderColor: active ? t.colors.primary : t.colors.border,
                    backgroundColor: active ? t.colors.primary : 'transparent',
                  }}
                >
                  <Text
                    variant="caption"
                    weight="semibold"
                    style={{ color: active ? t.colors.primaryForeground : t.colors.mutedForeground }}
                  >
                    {s === 'all' ? 'Tümü' : SUBCONTRACT_DISPATCH_STATUS_LABELS[s]}
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>
        ) : null}

        {dispatches.loading ? (
          <SkeletonRows count={6} />
        ) : dispatches.error ? (
          <EmptyState
            icon="alert-triangle"
            tone="destructive"
            title="Yüklenemedi"
            description={dispatches.error}
            actionLabel="Tekrar dene"
            onAction={dispatches.refetch}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="send"
            title="Fason sevk bulunamadı"
            description={filter === 'all' ? 'Henüz fason sevk oluşturulmamış.' : 'Bu durumda belge yok.'}
            actionLabel={canManage && filter === 'all' ? 'Yeni fason sevk' : undefined}
            onAction={canManage && filter === 'all' ? () => nav.navigate('production.subcontract.entry', {}, 'Yeni fason sevk') : undefined}
          />
        ) : (
          <>
            <Text variant="overline" tone="muted" style={{ paddingHorizontal: t.spacing[1] }}>
              {filtered.length} Belge
            </Text>
            <ListCard>
              {filtered.map((d) => (
                <ListRow
                  key={d.id}
                  icon="send"
                  title={d.dispatchNo || 'Taslak'}
                  subtitle={`${d.contactName} · ${d.manufacturingOrderNo} · ${formatDate(d.dispatchDate)}`}
                  trailing={
                    <Badge
                      label={SUBCONTRACT_DISPATCH_STATUS_LABELS[d.status]}
                      tone={SUBCONTRACT_STATUS_TONES[d.status]}
                    />
                  }
                  onPress={() => nav.navigate('production.subcontract.detail', { id: d.id }, d.dispatchNo || 'Fason')}
                />
              ))}
            </ListCard>
          </>
        )}
      </Screen>
    </PermissionRequired>
  )
}
