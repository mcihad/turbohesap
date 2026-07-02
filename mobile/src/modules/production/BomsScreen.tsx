// Reçeteler (BOM) listesi — ürün ağaçları with type filter chips. Mirrors the
// orders list shell (chips + ListCard rows). Tapping a row drills into detail; "+"
// opens the entry form.

import * as React from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { ProductionPermissions, type BomType } from '@turbohesap/shared'
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
import { useAsync } from '../../lib/use-async'
import { useNav } from '../../navigation/nav-context'
import { useTheme } from '../../theme/theme-context'
import { BOM_TYPE_LABELS, BOM_TYPE_TONES } from './format'

type TypeFilter = 'all' | BomType

export function BomsScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(ProductionPermissions.read)
  const canWrite = hasPermission(ProductionPermissions.write)
  const [filter, setFilter] = React.useState<TypeFilter>('all')

  const boms = useAsync(() => api.production.boms.list(), [], { enabled: canRead })
  const list = boms.data ?? []

  const typeFilters = React.useMemo<TypeFilter[]>(() => {
    const present: BomType[] = []
    for (const b of list) if (!present.includes(b.type)) present.push(b.type)
    return ['all', ...present]
  }, [list])

  const filtered = React.useMemo(
    () => (filter === 'all' ? list : list.filter((b) => b.type === filter)),
    [list, filter],
  )

  return (
    <PermissionRequired
      permission={ProductionPermissions.read}
      title="Reçeteler"
      onBack={nav.canGoBack ? nav.goBack : undefined}
    >
      <Screen
        header={{
          title: 'Reçeteler',
          large: !nav.canGoBack,
          onBack: nav.canGoBack ? nav.goBack : undefined,
          right: canWrite ? (
            <HeaderAction icon="plus" onPress={() => nav.navigate('production.bom.entry', {}, 'Yeni reçete')} />
          ) : undefined,
        }}
        onRefresh={boms.refetch}
        refreshing={boms.refreshing}
      >
        {typeFilters.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: t.spacing[2], paddingHorizontal: t.spacing[0.5] }}
          >
            {typeFilters.map((s) => {
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
                    {s === 'all' ? 'Tümü' : BOM_TYPE_LABELS[s]}
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>
        ) : null}

        {boms.loading ? (
          <SkeletonRows count={6} />
        ) : boms.error ? (
          <EmptyState
            icon="alert-triangle"
            tone="destructive"
            title="Yüklenemedi"
            description={boms.error}
            actionLabel="Tekrar dene"
            onAction={boms.refetch}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="git-merge"
            title="Reçete bulunamadı"
            description={filter === 'all' ? 'Henüz reçete oluşturulmamış.' : 'Bu türde reçete yok.'}
            actionLabel={canWrite && filter === 'all' ? 'Yeni reçete' : undefined}
            onAction={canWrite && filter === 'all' ? () => nav.navigate('production.bom.entry', {}, 'Yeni reçete') : undefined}
          />
        ) : (
          <>
            <Text variant="overline" tone="muted" style={{ paddingHorizontal: t.spacing[1] }}>
              {filtered.length} Reçete
            </Text>
            <ListCard>
              {filtered.map((b) => (
                <ListRow
                  key={b.id}
                  icon="git-merge"
                  title={b.name || b.code}
                  subtitle={`${b.productName} · v${b.version} · ${BOM_TYPE_LABELS[b.type]}`}
                  trailing={
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Badge label={BOM_TYPE_LABELS[b.type]} tone={BOM_TYPE_TONES[b.type]} />
                      {!b.isActive ? <Badge label="Pasif" tone="muted" /> : null}
                    </View>
                  }
                  onPress={() => nav.navigate('production.bom.detail', { id: b.id }, b.name || b.code)}
                />
              ))}
            </ListCard>
          </>
        )}
      </Screen>
    </PermissionRequired>
  )
}
