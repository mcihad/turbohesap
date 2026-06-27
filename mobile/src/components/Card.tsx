// Card — raised surface primitive (DESIGN.md §14.3). `rounded-xl border bg-card`
// with a soft shadow. Use `padded={false}` for media/list cards that manage
// their own insets.

import * as React from 'react'
import { View, type ViewProps } from 'react-native'

import { useTheme } from '../theme/theme-context'

interface CardProps extends ViewProps {
  padded?: boolean
  /** Elevation level (default 'sm', like the web resting card). */
  elevation?: 'none' | 'sm' | 'md'
}

export function Card({ padded = true, elevation = 'sm', style, ...props }: CardProps) {
  const t = useTheme()
  return (
    <View
      {...props}
      style={[
        {
          backgroundColor: t.colors.card,
          borderRadius: t.radius.xl,
          borderWidth: 1,
          borderColor: t.colors.border,
          padding: padded ? t.spacing[4] : 0,
          overflow: 'hidden',
        },
        t.elevation(elevation),
        style,
      ]}
    />
  )
}
