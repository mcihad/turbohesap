// SegmentedControl — a compact pill switch (the mobile take on the web's
// ButtonGroup, DESIGN.md §14.20). Single selection; used for the theme mode
// picker on the profile screen.

import * as React from 'react'
import { Pressable, View } from 'react-native'

import { useTheme } from '../theme/theme-context'
import { Icon, type IconName } from './Icon'
import { Text } from './Text'

export interface SegmentOption<T extends string> {
  value: T
  label: string
  icon?: IconName
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
}) {
  const t = useTheme()
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: t.colors.muted,
        borderRadius: t.radius.lg,
        padding: t.spacing[0.5],
        gap: t.spacing[0.5],
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              {
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: t.spacing[1.5],
                paddingVertical: t.spacing[2],
                borderRadius: t.radius.md,
                backgroundColor: active ? t.colors.card : 'transparent',
              },
              active ? t.elevation('sm') : null,
            ]}
          >
            {opt.icon ? (
              <Icon
                name={opt.icon}
                size={16}
                color={active ? t.colors.foreground : t.colors.mutedForeground}
              />
            ) : null}
            <Text
              variant="label"
              weight={active ? 'semibold' : 'medium'}
              tone={active ? 'default' : 'muted'}
            >
              {opt.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
