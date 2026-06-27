// Header — the screen top bar (the mobile analogue of the web app-bar +
// PageHeader, DESIGN.md §8/§11.2). A back affordance, a title (+ optional
// subtitle), and a right-side actions slot. Pinned above the scroll area.

import * as React from 'react'
import { Pressable, View } from 'react-native'

import { useTheme } from '../theme/theme-context'
import { Icon } from './Icon'
import { Text } from './Text'

export function Header({
  title,
  subtitle,
  onBack,
  leftAction,
  right,
  large = false,
}: {
  title: string
  subtitle?: string
  onBack?: () => void
  /** Custom left element shown when there's no back button (e.g. a module switcher). */
  leftAction?: React.ReactNode
  right?: React.ReactNode
  /** Large title style for top-level screens. */
  large?: boolean
}) {
  const t = useTheme()
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.spacing[2],
        paddingHorizontal: t.spacing[4],
        paddingTop: t.spacing[2],
        paddingBottom: t.spacing[3],
        borderBottomWidth: 1,
        borderBottomColor: t.colors.border,
        backgroundColor: t.colors.background,
      }}
    >
      {onBack ? (
        <Pressable
          onPress={onBack}
          hitSlop={8}
          style={{
            width: 38,
            height: 38,
            borderRadius: t.radius.md,
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: -t.spacing[1],
          }}
        >
          <Icon name="chevron-left" size={24} />
        </Pressable>
      ) : leftAction ? (
        <View style={{ marginLeft: -t.spacing[1] }}>{leftAction}</View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant={large ? 'h1' : 'title'} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[1] }}>{right}</View>
      ) : null}
    </View>
  )
}

/** A square ghost button for header actions (theme toggle, refresh, etc.). */
export function HeaderAction({
  icon,
  onPress,
}: {
  icon: import('./Icon').IconName
  onPress?: () => void
}) {
  const t = useTheme()
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 38,
        height: 38,
        borderRadius: t.radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? t.colors.muted : 'transparent',
      })}
    >
      <Icon name={icon} size={20} color={t.colors.mutedForeground} />
    </Pressable>
  )
}
