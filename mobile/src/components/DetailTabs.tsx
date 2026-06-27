// DetailTabs — a horizontally scrollable pill tab bar for detail screens with
// several sections (the mobile take on the web's <Tabs>). Scrolls with the page
// like the web TabsList; the active pill is filled with the primary colour.

import * as React from 'react'
import { Pressable, ScrollView, View } from 'react-native'

import { useTheme } from '../theme/theme-context'
import { Icon, type IconName } from './Icon'
import { Text } from './Text'

export interface DetailTab {
  value: string
  label: string
  icon?: IconName
}

export function DetailTabs({
  tabs,
  value,
  onChange,
}: {
  tabs: DetailTab[]
  value: string
  onChange: (value: string) => void
}) {
  const t = useTheme()
  return (
    <View style={{ marginHorizontal: -t.spacing[4] }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          gap: t.spacing[2],
          paddingHorizontal: t.spacing[4],
          paddingVertical: t.spacing[0.5],
        }}
      >
        {tabs.map((tab) => {
          const active = tab.value === value
          return (
            <Pressable
              key={tab.value}
              onPress={() => onChange(tab.value)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: t.spacing[1.5],
                paddingHorizontal: t.spacing[3.5],
                paddingVertical: t.spacing[2],
                borderRadius: t.radius.full,
                backgroundColor: active ? t.colors.primary : t.colors.muted,
              }}
            >
              {tab.icon ? (
                <Icon
                  name={tab.icon}
                  size={15}
                  color={active ? t.colors.primaryForeground : t.colors.mutedForeground}
                />
              ) : null}
              <Text variant="label" weight={active ? 'semibold' : 'medium'} tone={active ? 'onPrimary' : 'muted'}>
                {tab.label}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}
