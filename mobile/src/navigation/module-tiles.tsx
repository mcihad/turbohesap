// Shared module tiles — the grid/list cells used by the home launcher and the
// module-switcher sheet, so both render modules identically. A tile can be marked
// `selected` (the active module in the switcher) to highlight it.

import * as React from 'react'
import { Pressable, View } from 'react-native'

import { Card, Icon, Text } from '../components'
import type { IconName } from '../components/Icon'
import { useTheme } from '../theme/theme-context'

export type Layout = 'grid' | 'list'

export interface ModuleTile {
  key: string
  label: string
  description?: string
  icon: IconName
  selected?: boolean
}

export function GridTile({ tile, onPress }: { tile: ModuleTile; onPress: () => void }) {
  const t = useTheme()
  const boxBg = tile.selected ? t.colors.primary : t.colors.primarySoft
  const iconColor = tile.selected ? t.colors.primaryForeground : t.colors.primary
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ width: '47.5%', flexGrow: 1, opacity: pressed ? 0.85 : 1 })}>
      <Card
        style={{
          height: 138,
          justifyContent: 'space-between',
          // Always a concrete border — passing `undefined` here overrides the
          // Card's default and, with overflow:hidden + borderRadius, blanks the
          // whole tile on Android.
          borderWidth: tile.selected ? 1.5 : 1,
          borderColor: tile.selected ? t.colors.primary : t.colors.border,
        }}
      >
        <View style={{ width: 44, height: 44, borderRadius: t.radius.lg, backgroundColor: boxBg, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={tile.icon} size={22} color={iconColor} />
        </View>
        <View style={{ gap: 2 }}>
          <Text variant="title" numberOfLines={1}>
            {tile.label}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={2} style={{ minHeight: 32 }}>
            {tile.description ?? ' '}
          </Text>
        </View>
      </Card>
    </Pressable>
  )
}

export function ListTile({ tile, onPress }: { tile: ModuleTile; onPress: () => void }) {
  const t = useTheme()
  const boxBg = tile.selected ? t.colors.primary : t.colors.primarySoft
  const iconColor = tile.selected ? t.colors.primaryForeground : t.colors.primary
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      <Card
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.spacing[3],
          borderWidth: tile.selected ? 1.5 : 1,
          borderColor: tile.selected ? t.colors.primary : t.colors.border,
        }}
      >
        <View style={{ width: 44, height: 44, borderRadius: t.radius.lg, backgroundColor: boxBg, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={tile.icon} size={22} color={iconColor} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="title" numberOfLines={1}>
            {tile.label}
          </Text>
          {tile.description ? (
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {tile.description}
            </Text>
          ) : null}
        </View>
        <Icon name={tile.selected ? 'check' : 'chevron-right'} size={20} color={tile.selected ? t.colors.primary : t.colors.mutedForeground} />
      </Card>
    </Pressable>
  )
}

export function LayoutToggle({ value, onChange }: { value: Layout; onChange: (v: Layout) => void }) {
  const t = useTheme()
  return (
    <View style={{ flexDirection: 'row', backgroundColor: t.colors.muted, borderRadius: t.radius.md, padding: 2 }}>
      {(['grid', 'list'] as const).map((opt) => {
        const active = opt === value
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            style={[
              { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: t.radius.sm },
              active ? { backgroundColor: t.colors.card, ...t.elevation('sm') } : null,
            ]}
          >
            <Icon name={opt === 'grid' ? 'grid' : 'list'} size={18} color={active ? t.colors.foreground : t.colors.mutedForeground} />
          </Pressable>
        )
      })}
    </View>
  )
}

// Short descriptions per module key (the MobileModule has no description field).
export function descOf(key: string): string | undefined {
  const map: Record<string, string> = {
    genel: 'Genel bakış ve panolar',
    sales: 'Satış kanalları',
    org: 'Şubeler ve organizasyon',
    inventory: 'Ürünler, stok ve kategoriler',
    pos: 'Satış noktası, kasa ve masalar',
    finance: 'Kasa, banka ve işlemler',
    contacts: 'Cariler, gruplar ve fırsatlar',
    invoices: 'Satış ve alış faturaları',
    lookups: 'Tanım listeleri',
    iam: 'Kullanıcı, rol ve izinler',
  }
  return map[key]
}
