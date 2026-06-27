// Button — mirrors the web button variants (DESIGN.md §14.1): default (primary),
// secondary, outline, ghost, destructive. Sizes default/sm/lg + icon. Pressable
// with a subtle press-dim; supports a leading icon and a loading spinner.

import * as React from 'react'
import { ActivityIndicator, Pressable, View, type ViewStyle } from 'react-native'

import { useTheme } from '../theme/theme-context'
import { Icon, type IconName } from './Icon'
import { Text, type TextTone } from './Text'

export type ButtonVariant = 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive'
export type ButtonSize = 'default' | 'sm' | 'lg'

interface ButtonProps {
  title: string
  onPress?: () => void
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: IconName
  loading?: boolean
  disabled?: boolean
  /** Stretch to fill the parent width. */
  fullWidth?: boolean
  style?: ViewStyle
}

export function Button({
  title,
  onPress,
  variant = 'default',
  size = 'default',
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}: ButtonProps) {
  const t = useTheme()
  const heights = { sm: 36, default: 44, lg: 52 }
  const padding = { sm: t.spacing[3], default: t.spacing[4], lg: t.spacing[5] }
  const fontTone: TextTone =
    variant === 'default'
      ? 'onPrimary'
      : variant === 'destructive'
        ? 'onPrimary'
        : variant === 'outline' || variant === 'ghost'
          ? 'default'
          : 'default'

  const surfaces: Record<ButtonVariant, ViewStyle> = {
    default: { backgroundColor: t.colors.primary },
    secondary: { backgroundColor: t.colors.secondary },
    outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: t.colors.inputBorder },
    ghost: { backgroundColor: 'transparent' },
    destructive: { backgroundColor: t.colors.destructive },
  }
  const iconColor =
    variant === 'default'
      ? t.colors.primaryForeground
      : variant === 'destructive'
        ? t.colors.destructiveForeground
        : t.colors.foreground

  const isDisabled = disabled || loading

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        {
          height: heights[size],
          paddingHorizontal: padding[size],
          borderRadius: t.radius.md,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: t.spacing[2],
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        },
        surfaces[variant],
        variant === 'default' ? t.elevation('sm') : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={iconColor} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing[2] }}>
          {icon ? <Icon name={icon} size={size === 'sm' ? 16 : 18} color={iconColor} /> : null}
          <Text
            variant={size === 'lg' ? 'title' : 'label'}
            tone={fontTone}
            weight="semibold"
          >
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  )
}
