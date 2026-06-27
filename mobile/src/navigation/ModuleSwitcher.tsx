// ModuleSwitcher — the bottom-sheet modal opened from a module screen's app-bar
// button. Shows the accessible modules (+ Home + Profile) as a grid (or list,
// togglable) just like the home launcher, highlighting the active one.
// `ModuleSwitcherButton` is the self-contained trigger placed in the app bar.

import * as React from 'react'
import { Modal, Pressable, ScrollView, View } from 'react-native'

import { Icon, Text } from '../components'
import { useTheme } from '../theme/theme-context'
import { PROFILE_KEY, useModuleNav } from './module-nav-context'
import { GridTile, ListTile, LayoutToggle, descOf, type Layout, type ModuleTile } from './module-tiles'

const HOME_KEY = '__home__'

export function ModuleSwitcher({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTheme()
  const { modules, activeModuleKey, enterModule } = useModuleNav()
  const [layout, setLayout] = React.useState<Layout>('grid')

  const tiles: ModuleTile[] = [
    { key: HOME_KEY, label: 'Ana sayfa', description: 'Tüm modüller', icon: 'home', selected: activeModuleKey === null },
    ...modules.map((m) => ({
      key: m.key,
      label: m.label,
      description: descOf(m.key),
      icon: m.icon,
      selected: activeModuleKey === m.key,
    })),
    { key: PROFILE_KEY, label: 'Profil', description: 'Hesap ve görünüm', icon: 'user' as const, selected: activeModuleKey === PROFILE_KEY },
  ]

  const go = (key: string) => {
    enterModule(key === HOME_KEY ? null : key)
    onClose()
  }

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'flex-end' }}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: t.colors.background,
            borderTopLeftRadius: t.radius['2xl'],
            borderTopRightRadius: t.radius['2xl'],
            paddingTop: t.spacing[3],
            paddingBottom: t.spacing[8],
            maxHeight: '82%',
          }}
        >
          <View style={{ alignItems: 'center', paddingBottom: t.spacing[2] }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.colors.border }} />
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: t.spacing[5],
              paddingBottom: t.spacing[3],
            }}
          >
            <Text variant="overline" tone="muted">
              Modüller
            </Text>
            <LayoutToggle value={layout} onChange={setLayout} />
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: t.spacing[5], paddingBottom: t.spacing[4] }}>
            {layout === 'grid' ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[3] }}>
                {tiles.map((tile) => (
                  <GridTile key={tile.key} tile={tile} onPress={() => go(tile.key)} />
                ))}
              </View>
            ) : (
              <View style={{ gap: t.spacing[2.5] }}>
                {tiles.map((tile) => (
                  <ListTile key={tile.key} tile={tile} onPress={() => go(tile.key)} />
                ))}
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

// Self-contained app-bar trigger: a primary square button that opens the sheet.
// Drop it in a screen header's `right` slot.
export function ModuleSwitcherButton() {
  const t = useTheme()
  const [open, setOpen] = React.useState(false)
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={6}
        accessibilityLabel="Modüller"
        style={[
          { width: 38, height: 38, borderRadius: t.radius.md, backgroundColor: t.colors.primary, alignItems: 'center', justifyContent: 'center' },
          t.elevation('sm'),
        ]}
      >
        <Icon name="grid" size={20} color={t.colors.primaryForeground} />
      </Pressable>
      <ModuleSwitcher open={open} onClose={() => setOpen(false)} />
    </>
  )
}
