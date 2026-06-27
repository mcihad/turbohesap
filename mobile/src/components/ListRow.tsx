// ListRow — the standard tappable row (DESIGN.md §14.16 list pattern). A leading
// element (icon chip / avatar), a title + optional subtitle, an optional trailing
// node (badge/value), and a chevron when the row navigates.

import * as React from 'react'
import { Pressable, View } from 'react-native'

import { useTheme } from '../theme/theme-context'
import { Icon, type IconName } from './Icon'
import { Text } from './Text'

interface ListRowProps {
  title: string
  subtitle?: string
  /** Leading icon rendered in a tinted square chip. */
  icon?: IconName
  iconTone?: 'primary' | 'muted'
  /** Custom leading element (e.g. <Avatar/>); overrides `icon`. */
  leading?: React.ReactNode
  trailing?: React.ReactNode
  onPress?: () => void
  /** Show a chevron affordance (defaults to true when `onPress` is set). */
  chevron?: boolean
}

export function ListRow({
  title,
  subtitle,
  icon,
  iconTone = 'primary',
  leading,
  trailing,
  onPress,
  chevron,
}: ListRowProps) {
  const t = useTheme()
  const showChevron = chevron ?? !!onPress
  const chipBg = iconTone === 'primary' ? t.colors.primarySoft : t.colors.muted
  const chipFg = iconTone === 'primary' ? t.colors.primary : t.colors.mutedForeground

  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.spacing[3],
        paddingVertical: t.spacing[3],
        paddingHorizontal: t.spacing[4],
      }}
    >
      {leading ??
        (icon ? (
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: t.radius.lg,
              backgroundColor: chipBg,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name={icon} size={20} color={chipFg} />
          </View>
        ) : null)}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="label" weight="semibold" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
      {showChevron ? (
        <Icon name="chevron-right" size={18} color={t.colors.mutedForeground} />
      ) : null}
    </View>
  )

  if (!onPress) return content
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: t.colors.muted }}
      style={({ pressed }) => ({ backgroundColor: pressed ? t.colors.muted : 'transparent' })}
    >
      {content}
    </Pressable>
  )
}

/** Hairline divider for between rows inside a Card. */
export function Divider({ inset = 0 }: { inset?: number }) {
  const t = useTheme()
  return <View style={{ height: 1, backgroundColor: t.colors.border, marginLeft: inset }} />
}
