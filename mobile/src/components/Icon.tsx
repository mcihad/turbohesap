// Icon — thin wrapper over Feather (bundled with @expo/vector-icons). Feather is
// the same icon family lucide (the web app's icons) is forked from, so names line
// up. Defaults: size 20 (DESIGN.md app-bar action size), colour = foreground.

import { Feather } from '@expo/vector-icons'
import * as React from 'react'

import { useTheme } from '../theme/theme-context'

export type IconName = keyof typeof Feather.glyphMap

export function Icon({
  name,
  size = 20,
  color,
}: {
  name: IconName
  size?: number
  color?: string
}) {
  const theme = useTheme()
  return <Feather name={name} size={size} color={color ?? theme.colors.foreground} />
}
