// Text — the one typography primitive. Every label/heading/paragraph goes
// through it so sizes, weights and colours stay token-driven (DESIGN.md §3.1).
// Pick a `variant` (semantic role) and optionally override `tone` (colour).

import * as React from 'react'
import { Text as RNText, type TextProps as RNTextProps } from 'react-native'

import { useTheme } from '../theme/theme-context'

export type TextVariant =
  | 'display' // big numbers / hero
  | 'h1'
  | 'h2'
  | 'title'
  | 'body'
  | 'label'
  | 'caption'
  | 'overline' // uppercase meta
  | 'mono'

export type TextTone =
  | 'default'
  | 'muted'
  | 'primary'
  | 'destructive'
  | 'success'
  | 'warning'
  | 'onPrimary'

interface TextProps extends RNTextProps {
  variant?: TextVariant
  tone?: TextTone
  weight?: 'normal' | 'medium' | 'semibold' | 'bold'
}

export function Text({
  variant = 'body',
  tone = 'default',
  weight,
  style,
  ...props
}: TextProps) {
  const t = useTheme()

  const variants: Record<TextVariant, object> = {
    display: { fontSize: t.type.size['3xl'], lineHeight: t.type.size['3xl'] * 1.15, fontWeight: '700', letterSpacing: -0.5 },
    h1: { fontSize: t.type.size['2xl'], lineHeight: t.type.size['2xl'] * t.type.leading.tight, fontWeight: '700', letterSpacing: -0.3 },
    h2: { fontSize: t.type.size.xl, lineHeight: t.type.size.xl * t.type.leading.tight, fontWeight: '600', letterSpacing: -0.2 },
    title: { fontSize: t.type.size.lg, lineHeight: t.type.size.lg * 1.3, fontWeight: '600' },
    body: { fontSize: t.type.size.base, lineHeight: t.type.size.base * t.type.leading.normal, fontWeight: '400' },
    label: { fontSize: t.type.size.sm, lineHeight: t.type.size.sm * 1.4, fontWeight: '500' },
    caption: { fontSize: t.type.size.xs, lineHeight: t.type.size.xs * 1.4, fontWeight: '400' },
    overline: { fontSize: t.type.size['2xs'], lineHeight: t.type.size['2xs'] * 1.3, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' },
    mono: { fontSize: t.type.size.xs, lineHeight: t.type.size.xs * 1.4, fontFamily: monoFamily() },
  }

  const tones: Record<TextTone, string> = {
    default: t.colors.foreground,
    muted: t.colors.mutedForeground,
    primary: t.colors.primary,
    destructive: t.colors.destructive,
    success: t.colors.success,
    warning: t.colors.warning,
    onPrimary: t.colors.primaryForeground,
  }

  return (
    <RNText
      {...props}
      style={[
        variants[variant],
        { color: tones[tone] },
        weight ? { fontWeight: t.type.weight[weight] } : null,
        style,
      ]}
    />
  )
}

function monoFamily(): string {
  // Platform default monospace — kept here so callers don't repeat it.
  return 'monospace'
}
