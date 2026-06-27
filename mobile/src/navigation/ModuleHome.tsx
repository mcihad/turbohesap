// ModuleHome — the root screen of a module tab (other than Genel, which has a
// custom dashboard). Renders the module's permission-filtered nav items as a
// list, mirroring the web sidebar. Tapping an item drills into its screen.

import * as React from 'react'

import { HeaderAction, ListCard, ListRow, Screen, Section } from '../components'
import { filterItems } from '../lib/auth/access'
import { useAuth } from '../lib/auth/auth-context'
import { getModule } from '../modules/registry'
import { useThemeControls } from '../theme/theme-context'
import { useNav } from './nav-context'

export function ModuleHome({ moduleKey }: { moduleKey: string }) {
  const { hasPermission } = useAuth()
  const nav = useNav()
  const { theme, toggle } = useThemeControls()
  const mod = getModule(moduleKey)

  if (!mod) {
    return <Screen header={{ title: 'Modül bulunamadı' }}>{null}</Screen>
  }

  const items = filterItems(mod.items, hasPermission)

  return (
    <Screen
      header={{
        title: mod.label,
        large: true,
        right: <HeaderAction icon={theme.scheme === 'dark' ? 'sun' : 'moon'} onPress={toggle} />,
      }}
    >
      <Section>
        <ListCard>
          {items.map((item) => (
            <ListRow
              key={item.key}
              icon={item.icon}
              title={item.title}
              subtitle={item.description}
              onPress={() => nav.navigate(item.key, undefined, item.title)}
            />
          ))}
        </ListCard>
      </Section>
    </Screen>
  )
}
