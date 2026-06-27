// TabBar — the bottom navigation INSIDE a module: Panel + the module's
// resources. At most 5 slots; if there are more, the 5th is a "Diğer" (…) button
// that opens a sheet with the overflow tabs. Sits above the home indicator.

import * as React from 'react'
import { Modal, Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Icon, type IconName } from '../components/Icon'
import { Text } from '../components/Text'
import { useTheme } from '../theme/theme-context'

export interface TabDescriptor {
  key: string
  label: string
  icon: IconName
}

const MAX_VISIBLE = 5

export function TabBar({
  tabs,
  activeTab,
  onSelect,
}: {
  tabs: TabDescriptor[]
  activeTab: string
  onSelect: (key: string) => void
}) {
  const t = useTheme()
  const insets = useSafeAreaInsets()
  const [moreOpen, setMoreOpen] = React.useState(false)

  const overflow = tabs.length > MAX_VISIBLE
  const visible = overflow ? tabs.slice(0, MAX_VISIBLE - 1) : tabs
  const rest = overflow ? tabs.slice(MAX_VISIBLE - 1) : []
  const restActive = rest.some((tab) => tab.key === activeTab)

  return (
    <>
      <View
        style={{
          flexDirection: 'row',
          borderTopWidth: 1,
          borderTopColor: t.colors.border,
          backgroundColor: t.colors.card,
          paddingBottom: insets.bottom > 0 ? insets.bottom : t.spacing[2],
          paddingTop: t.spacing[2],
        }}
      >
        {visible.map((tab) => (
          <TabButton key={tab.key} tab={tab} active={tab.key === activeTab} onPress={() => onSelect(tab.key)} />
        ))}
        {overflow ? (
          <TabButton
            tab={{ key: '__more__', label: 'Diğer', icon: 'more-horizontal' }}
            active={restActive}
            onPress={() => setMoreOpen(true)}
          />
        ) : null}
      </View>

      <Modal visible={moreOpen} transparent animationType="fade" onRequestClose={() => setMoreOpen(false)}>
        <Pressable onPress={() => setMoreOpen(false)} style={{ flex: 1, backgroundColor: t.colors.overlay, justifyContent: 'flex-end' }}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: t.colors.card,
              borderTopLeftRadius: t.radius['2xl'],
              borderTopRightRadius: t.radius['2xl'],
              paddingTop: t.spacing[3],
              paddingBottom: insets.bottom + t.spacing[4],
              maxHeight: '70%',
            }}
          >
            <View style={{ alignItems: 'center', paddingBottom: t.spacing[2] }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.colors.border }} />
            </View>
            <Text variant="overline" tone="muted" style={{ paddingHorizontal: t.spacing[5], paddingBottom: t.spacing[2] }}>
              Diğer bölümler
            </Text>
            <ScrollView>
              {rest.map((tab) => {
                const active = tab.key === activeTab
                return (
                  <Pressable
                    key={tab.key}
                    onPress={() => { onSelect(tab.key); setMoreOpen(false) }}
                    android_ripple={{ color: t.colors.muted }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[3], paddingHorizontal: t.spacing[5], paddingVertical: t.spacing[3.5] }}
                  >
                    <View style={{ width: 38, height: 38, borderRadius: t.radius.lg, backgroundColor: active ? t.colors.primarySoft : t.colors.muted, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name={tab.icon} size={20} color={active ? t.colors.primary : t.colors.mutedForeground} />
                    </View>
                    <Text variant="label" weight={active ? 'semibold' : 'medium'} tone={active ? 'primary' : 'default'} style={{ flex: 1 }}>
                      {tab.label}
                    </Text>
                    {active ? <Icon name="check" size={18} color={t.colors.primary} /> : null}
                  </Pressable>
                )
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  )
}

function TabButton({ tab, active, onPress }: { tab: TabDescriptor; active: boolean; onPress: () => void }) {
  const t = useTheme()
  const color = active ? t.colors.primary : t.colors.mutedForeground
  return (
    <Pressable onPress={onPress} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: t.spacing[1] }}>
      <Icon name={tab.icon} size={22} color={color} />
      <Text variant="caption" weight={active ? 'semibold' : 'medium'} style={{ color, fontSize: 11 }} numberOfLines={1}>
        {tab.label}
      </Text>
    </Pressable>
  )
}
