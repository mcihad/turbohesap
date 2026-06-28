// POS dashboard — the module's Panel/home. Instead of jumping straight into
// register selection, it surfaces the whole module: live counts (registers +
// open sessions) and big quick-action tiles to every POS destination (Satış,
// Kasalar, Masalar/Katlar, Ürün Seçenekleri). Each tile is permission-gated.

import * as React from 'react'
import { Pressable, View } from 'react-native'

import { InventoryPermissions, PosPermissions } from '@turbohesap/shared'

import {
  HeaderAction,
  Icon,
  type IconName,
  Screen,
  Section,
  StatCard,
  Text,
} from '../../components'
import { api } from '../../lib/api'
import { useAuth } from '../../lib/auth/auth-context'
import { useAsync } from '../../lib/use-async'
import { ModuleSwitcherButton } from '../../navigation/ModuleSwitcher'
import { useNav } from '../../navigation/nav-context'
import { useTheme, useThemeControls } from '../../theme/theme-context'

interface ActionTile {
  key: string
  title: string
  description: string
  icon: IconName
  screen: string
  permission: string
}

export function PosDashboardScreen() {
  const t = useTheme()
  const nav = useNav()
  const { hasPermission } = useAuth()
  const { theme, toggle } = useThemeControls()

  const canRead = hasPermission(PosPermissions.registersRead) || hasPermission(PosPermissions.sell)
  const registers = useAsync(() => api.pos.registers.list(), [], { enabled: canRead })
  const openSessions = useAsync(() => api.pos.sessions.list({ status: 'open' }), [], { enabled: canRead })

  const registerCount = (registers.data ?? []).filter((r) => r.isActive).length
  const openCount = (openSessions.data ?? []).length

  const tiles: ActionTile[] = [
    {
      key: 'sell',
      title: 'Satış',
      description: 'Kasa seç ve satışa başla',
      icon: 'shopping-cart',
      screen: 'pos.registers',
      permission: PosPermissions.sell,
    },
    {
      key: 'registers',
      title: 'Kasalar',
      description: 'Kasalar ve vardiya durumu',
      icon: 'monitor',
      screen: 'pos.registers',
      permission: PosPermissions.registersRead,
    },
    {
      key: 'floors',
      title: 'Masalar / Katlar',
      description: 'Kat ve masa düzenini yönet',
      icon: 'grid',
      screen: 'pos.floors',
      permission: PosPermissions.tablesManage,
    },
    {
      key: 'modifiers',
      title: 'Ürün Seçenekleri',
      description: 'Modifiye gruplarını yönet',
      icon: 'sliders',
      screen: 'pos.modifiers',
      permission: InventoryPermissions.modifiersRead,
    },
  ]

  // registersRead implies a "sell" user can also see the registers tile.
  const visibleTiles = tiles.filter(
    (tile) =>
      hasPermission(tile.permission) ||
      (tile.permission === PosPermissions.registersRead && hasPermission(PosPermissions.sell)),
  )

  return (
    <Screen
      header={{
        title: 'POS',
        large: true,
        right: (
          <>
            <HeaderAction icon={theme.scheme === 'dark' ? 'sun' : 'moon'} onPress={toggle} />
            <ModuleSwitcherButton />
          </>
        ),
      }}
      onRefresh={() => {
        registers.refetch()
        openSessions.refetch()
      }}
      refreshing={registers.refreshing || openSessions.refreshing}
    >
      {canRead ? (
        <View style={{ flexDirection: 'row', gap: t.spacing[3] }}>
          <StatCard icon="monitor" label="Aktif kasa" value={String(registerCount)} tone="primary" />
          <StatCard
            icon="clock"
            label="Açık vardiya"
            value={String(openCount)}
            tone={openCount > 0 ? 'success' : 'warning'}
          />
        </View>
      ) : null}

      <Section title="Hızlı işlemler">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[3] }}>
          {visibleTiles.map((tile) => (
            <Pressable
              key={tile.key}
              onPress={() => nav.navigate(tile.screen, undefined, tile.title)}
              style={({ pressed }) => ({
                width: '47.5%',
                flexGrow: 1,
                padding: t.spacing[4],
                borderRadius: t.radius.xl,
                borderWidth: 1,
                borderColor: t.colors.border,
                backgroundColor: pressed ? t.colors.muted : t.colors.card,
                gap: t.spacing[3],
                minHeight: 132,
                justifyContent: 'space-between',
              })}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: t.radius.lg,
                  backgroundColor: t.colors.primarySoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name={tile.icon} size={22} color={t.colors.primary} />
              </View>
              <View style={{ gap: 2 }}>
                <Text variant="title" weight="semibold">
                  {tile.title}
                </Text>
                <Text variant="caption" tone="muted" numberOfLines={2}>
                  {tile.description}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </Section>
    </Screen>
  )
}
