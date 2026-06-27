// HomeScreen — the module launcher (the app root after sign-in). A search box, a
// grid/list toggle, and the permission-filtered modules as tiles. Tapping a
// module enters it (its resources become the bottom tabs). A Profil tile + a
// header avatar reach the profile.

import * as React from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Avatar, HeaderAction, Icon, Input, Text } from '../components'
import { useAuth } from '../lib/auth/auth-context'
import { displayName, initials } from '../lib/tokens'
import { useThemeControls } from '../theme/theme-context'
import { useModuleNav, PROFILE_KEY } from './module-nav-context'
import { GridTile, ListTile, LayoutToggle, descOf, type Layout, type ModuleTile } from './module-tiles'

export function HomeScreen() {
  const insets = useSafeAreaInsets()
  const { modules, enterModule } = useModuleNav()
  const { user } = useAuth()
  const { theme, toggle } = useThemeControls()
  const t = theme
  const [query, setQuery] = React.useState('')
  const [layout, setLayout] = React.useState<Layout>('grid')

  const tiles: ModuleTile[] = React.useMemo(() => {
    const mods: ModuleTile[] = modules.map((m) => ({ key: m.key, label: m.label, description: descOf(m.key), icon: m.icon }))
    mods.push({ key: PROFILE_KEY, label: 'Profil', description: 'Hesap, roller ve görünüm', icon: 'user' })
    const q = query.trim().toLowerCase()
    if (!q) return mods
    return mods.filter((m) => m.label.toLowerCase().includes(q) || m.description?.toLowerCase().includes(q))
  }, [modules, query])

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background, paddingTop: insets.top }}>
      {/* App bar */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.spacing[3],
          paddingHorizontal: t.spacing[4],
          paddingTop: t.spacing[2],
          paddingBottom: t.spacing[3],
        }}
      >
        <View
          style={[
            { width: 40, height: 40, borderRadius: t.radius.lg, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center' },
            t.elevation('sm'),
          ]}
        >
          <Icon name="box" size={22} color={t.colors.primaryForeground} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="h2">TurboHesap</Text>
          {user ? (
            <Text variant="caption" tone="muted">
              Merhaba, {displayName(user).split(' ')[0]}
            </Text>
          ) : null}
        </View>
        <HeaderAction icon={t.scheme === 'dark' ? 'sun' : 'moon'} onPress={toggle} />
        <Pressable onPress={() => enterModule(PROFILE_KEY)} hitSlop={6}>
          {user ? <Avatar initials={initials(user)} size={36} /> : null}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: t.spacing[4], gap: t.spacing[4], paddingBottom: insets.bottom + t.spacing[8] }}>
        {/* Search + layout toggle */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[2] }}>
          <View style={{ flex: 1 }}>
            <Input icon="search" placeholder="Modül ara" value={query} onChangeText={setQuery} />
          </View>
          <LayoutToggle value={layout} onChange={setLayout} />
        </View>

        {tiles.length === 0 ? (
          <Text variant="label" tone="muted" style={{ textAlign: 'center', paddingVertical: t.spacing[8] }}>
            Eşleşen modül yok.
          </Text>
        ) : layout === 'grid' ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[3] }}>
            {tiles.map((tile) => (
              <GridTile key={tile.key} tile={tile} onPress={() => enterModule(tile.key)} />
            ))}
          </View>
        ) : (
          <View style={{ gap: t.spacing[2.5] }}>
            {tiles.map((tile) => (
              <ListTile key={tile.key} tile={tile} onPress={() => enterModule(tile.key)} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

// Re-export so AppShell can import from one place.
export { PROFILE_KEY }
