// Input — labelled text field (DESIGN.md §14.10). Optional leading icon and a
// password reveal toggle. Focus state lifts the border to the ring colour.

import * as React from 'react'
import { Pressable, TextInput, View, type TextInputProps } from 'react-native'

import { useTheme } from '../theme/theme-context'
import { Icon, type IconName } from './Icon'
import { Text } from './Text'

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string
  icon?: IconName
  /** Render a password field with a show/hide toggle. */
  password?: boolean
  error?: string
}

export function Input({ label, icon, password = false, error, ...props }: InputProps) {
  const t = useTheme()
  const [focused, setFocused] = React.useState(false)
  const [reveal, setReveal] = React.useState(false)

  const borderColor = error
    ? t.colors.destructive
    : focused
      ? t.colors.ring
      : t.colors.inputBorder

  return (
    <View style={{ gap: t.spacing[1.5] }}>
      {label ? (
        <Text variant="label" tone="muted" weight="medium">
          {label}
        </Text>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.spacing[2],
          height: 48,
          paddingHorizontal: t.spacing[3.5],
          borderRadius: t.radius.md,
          borderWidth: 1,
          borderColor,
          backgroundColor: t.colors.card,
        }}
      >
        {icon ? <Icon name={icon} size={18} color={t.colors.mutedForeground} /> : null}
        <TextInput
          {...props}
          secureTextEntry={password && !reveal}
          onFocus={(e) => {
            setFocused(true)
            props.onFocus?.(e)
          }}
          onBlur={(e) => {
            setFocused(false)
            props.onBlur?.(e)
          }}
          placeholderTextColor={t.colors.mutedForeground}
          style={{
            flex: 1,
            color: t.colors.foreground,
            fontSize: t.type.size.base,
            paddingVertical: 0,
          }}
        />
        {password ? (
          <Pressable onPress={() => setReveal((v) => !v)} hitSlop={8}>
            <Icon name={reveal ? 'eye-off' : 'eye'} size={18} color={t.colors.mutedForeground} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text variant="caption" tone="destructive">
          {error}
        </Text>
      ) : null}
    </View>
  )
}
