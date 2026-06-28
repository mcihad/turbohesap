// ModuleDashboardScreen — the landing (Panel) tab inside a module: a hero +
// quick-link cards to the module's resources (tapping switches to that tab). Its
// app bar has a module-switcher icon (left) like the web sidebar brand button.

import * as React from 'react'
import { Pressable, View } from 'react-native'

import { Card, EmptyState, Icon, Screen, Section, Text } from '../components'
import { filterItems } from '../lib/auth/access'
import { useAuth } from '../lib/auth/auth-context'
import { getModule } from '../modules/registry'
import { useTheme } from '../theme/theme-context'
import { useModuleNav } from './module-nav-context'
import { MODULE_DASHBOARDS } from './module-stats'
import { ModuleSwitcherButton } from './ModuleSwitcher'
import { useNav } from './nav-context'

export function ModuleDashboardScreen() {
  const t = useTheme()
  const nav = useNav()
  const { activeModuleKey } = useModuleNav()
  const { hasPermission } = useAuth()

  const mod = activeModuleKey ? getModule(activeModuleKey) : undefined
  if (!mod) {
    return (
      <Screen header={{ title: 'Modül' }}>
        <EmptyState icon="grid" title="Modül bulunamadı" />
      </Screen>
    )
  }
  const items = filterItems(mod.items, hasPermission)
  const Body = MODULE_DASHBOARDS[mod.key]

  return (
    <Screen
      header={{
        title: mod.label,
        large: true,
        right: <ModuleSwitcherButton />,
      }}
    >
      {/* No hero/title here — the app bar already shows the module name. */}
      {Body ? <Body /> : null}

      <Section title="Bölümler">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[3] }}>
          {items.map((item) => (
            <Pressable
              key={item.key}
              onPress={() => nav.switchTab(item.key)}
              style={{ width: '47.5%', flexGrow: 1 }}
            >
              {({ pressed }) => (
                <Card
                  style={{
                    height: 124,
                    justifyContent: 'space-between',
                    backgroundColor: pressed ? t.colors.surface : t.colors.card,
                    opacity: pressed ? 0.9 : 1,
                  }}
                >
                  <View style={{ width: 42, height: 42, borderRadius: t.radius.lg, backgroundColor: t.colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name={item.icon} size={20} color={t.colors.primary} />
                  </View>
                  <View style={{ gap: 2 }}>
                    <Text variant="label" weight="semibold" numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text variant="caption" tone="muted" numberOfLines={2} style={{ minHeight: 32 }}>
                      {item.description ?? ' '}
                    </Text>
                  </View>
                </Card>
              )}
            </Pressable>
          ))}
        </View>
      </Section>
    </Screen>
  )
}
