// Avatar — initials in a tinted circle. Used in the profile header, user list
// rows and the app bar.

import * as React from 'react'
import { View } from 'react-native'

import { useTheme } from '../theme/theme-context'
import { Text } from './Text'

export function Avatar({
  initials,
  size = 40,
  tone = 'primary',
}: {
  initials: string
  size?: number
  tone?: 'primary' | 'muted'
}) {
  const t = useTheme()
  const bg = tone === 'primary' ? t.colors.primarySoft : t.colors.muted
  const fg = tone === 'primary' ? t.colors.primary : t.colors.mutedForeground
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: t.radius.full,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text weight="semibold" style={{ color: fg, fontSize: size * 0.4 }}>
        {initials}
      </Text>
    </View>
  )
}
