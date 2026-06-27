// Badge — compact status pill (DESIGN.md §14.2). Tones map to the semantic
// palette; subtle (tinted) by default, `solid` for stronger emphasis.

import * as React from 'react'
import { View } from 'react-native'

import { useTheme } from '../theme/theme-context'
import { Text } from './Text'

export type BadgeTone = 'default' | 'primary' | 'success' | 'warning' | 'info' | 'destructive' | 'muted'

export function Badge({
  label,
  tone = 'default',
  solid = false,
}: {
  label: string
  tone?: BadgeTone
  solid?: boolean
}) {
  const t = useTheme()
  const map: Record<BadgeTone, { fg: string; bg: string }> = {
    default: { fg: t.colors.foreground, bg: t.colors.secondary },
    primary: { fg: t.colors.primary, bg: t.colors.primarySoft },
    success: { fg: t.colors.success, bg: withAlpha(t.colors.success, 0.14) },
    warning: { fg: t.colors.warning, bg: withAlpha(t.colors.warning, 0.16) },
    info: { fg: t.colors.info, bg: withAlpha(t.colors.info, 0.14) },
    destructive: { fg: t.colors.destructive, bg: withAlpha(t.colors.destructive, 0.14) },
    muted: { fg: t.colors.mutedForeground, bg: t.colors.muted },
  }
  const c = map[tone]
  const bg = solid ? c.fg : c.bg
  const fg = solid ? onColor(tone, t.colors) : c.fg
  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: t.radius.sm,
        paddingHorizontal: t.spacing[2],
        paddingVertical: t.spacing[0.5],
        alignSelf: 'flex-start',
      }}
    >
      <Text variant="caption" weight="medium" style={{ color: fg }}>
        {label}
      </Text>
    </View>
  )
}

function onColor(tone: BadgeTone, colors: { primaryForeground: string; destructiveForeground: string; successForeground: string; warningForeground: string; infoForeground: string; background: string }): string {
  switch (tone) {
    case 'primary': return colors.primaryForeground
    case 'destructive': return colors.destructiveForeground
    case 'success': return colors.successForeground
    case 'warning': return colors.warningForeground
    case 'info': return colors.infoForeground
    default: return colors.background
  }
}

/** Apply an alpha to a hex colour (#RRGGBB) — for tinted badge fills. */
export function withAlpha(hex: string, alpha: number): string {
  if (!hex.startsWith('#') || hex.length !== 7) return hex
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
