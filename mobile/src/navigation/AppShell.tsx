// AppShell — the authenticated shell. Top-level it tracks the *active module*:
//   null         → the HomeScreen launcher (module grid/list + search)
//   PROFILE_KEY  → the profile
//   a module key → the module shell: a bottom TabBar of that module's
//                  Panel (dashboard) + resources, with per-tab stacks.
// This mirrors the web: launcher (app-launcher), per-module section, rail switch.

import * as React from 'react'
import { BackHandler, View } from 'react-native'

import { FeedbackHost } from '../components/feedback/FeedbackHost'
import { filterItems } from '../lib/auth/access'
import { useAuth } from '../lib/auth/auth-context'
import { getModule, visibleModules } from '../modules/registry'
import { ProfileScreen } from '../screens/ProfileScreen'
import { useTheme } from '../theme/theme-context'
import { HomeScreen } from './HomeScreen'
import { ModuleNavProvider, PROFILE_KEY } from './module-nav-context'
import { NavigationProvider, type TabInit, useNav } from './nav-context'
import { renderScreen } from './screens'
import { TabBar, type TabDescriptor } from './TabBar'

const PANEL_KEY = '__panel__'

export function AppShell() {
  const { hasPermission } = useAuth()
  const modules = React.useMemo(() => visibleModules(hasPermission), [hasPermission])
  const [activeModuleKey, setActiveModuleKey] = React.useState<string | null>(null)

  const moduleNav = React.useMemo(
    () => ({ activeModuleKey, modules, enterModule: setActiveModuleKey }),
    [activeModuleKey, modules],
  )

  let content: React.ReactNode
  if (activeModuleKey === null) {
    content = <HomeScreen />
  } else if (activeModuleKey === PROFILE_KEY) {
    content = <ProfileScreen />
  } else {
    content = <ModuleShell key={activeModuleKey} moduleKey={activeModuleKey} />
  }

  const pageKey =
    activeModuleKey === null ? 'home' : activeModuleKey === PROFILE_KEY ? 'profile' : activeModuleKey

  return (
    <ModuleNavProvider value={moduleNav}>
      <FeedbackHost pageKey={pageKey}>{content}</FeedbackHost>
    </ModuleNavProvider>
  )
}

function ModuleShell({ moduleKey }: { moduleKey: string }) {
  const { hasPermission } = useAuth()
  const mod = getModule(moduleKey)
  const items = mod ? filterItems(mod.items, hasPermission) : []

  const { tabInits, descriptors } = React.useMemo(() => {
    const dashKey = mod?.dashboardScreen ?? 'module.dashboard'
    const inits: TabInit[] = [
      { key: PANEL_KEY, home: { key: dashKey } },
      ...items.map((i) => ({ key: i.key, home: { key: i.key } })),
    ]
    const descs: TabDescriptor[] = [
      { key: PANEL_KEY, label: 'Panel', icon: 'grid' },
      ...items.map((i) => ({ key: i.key, label: i.title, icon: i.icon })),
    ]
    return { tabInits: inits, descriptors: descs }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleKey, items.map((i) => i.key).join('|')])

  return (
    <NavigationProvider tabs={tabInits} initialTab={PANEL_KEY}>
      <ShellInner descriptors={descriptors} />
    </NavigationProvider>
  )
}

function ShellInner({ descriptors }: { descriptors: TabDescriptor[] }) {
  const t = useTheme()
  const nav = useNav()

  // Android hardware back: pop the stack, else go to the Panel tab, else let the
  // OS handle it (AppShell's home is one level up via the switcher).
  React.useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (nav.canGoBack) {
        nav.goBack()
        return true
      }
      if (nav.activeTab !== PANEL_KEY) {
        nav.switchTab(PANEL_KEY)
        return true
      }
      return false
    })
    return () => sub.remove()
  }, [nav])

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.background }}>
      <View style={{ flex: 1 }} key={`${nav.activeTab}:${nav.current.key}:${String(nav.current.params?.id ?? '')}`}>
        {renderScreen(nav.current.key)}
      </View>
      <TabBar tabs={descriptors} activeTab={nav.activeTab} onSelect={nav.switchTab} />
    </View>
  )
}
