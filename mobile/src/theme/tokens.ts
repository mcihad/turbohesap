// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS — the single source of truth for the mobile app's look.
//
// This is the React Native counterpart of the web's `frontend/src/index.css`
// token system (see DESIGN.md). React Native cannot consume CSS custom
// properties or `oklch()`, so the web's OKLCH semantic palette is translated to
// hex/rgba here, and tokens are plain TS objects instead of CSS variables.
//
// Golden rule (same as web): never hardcode a color/space/radius in a screen —
// pull it from the active `Theme` (via `useTheme()`), or from `spacing` /
// `radius` / `type` below. See mobile_design.md for the full specification.
// ─────────────────────────────────────────────────────────────────────────────

/** Semantic color contract. Every surface/colour a component may need, paired
 *  with a `*Foreground` for content placed on it — mirrors the web tokens. */
export interface ColorTokens {
  background: string
  foreground: string
  card: string
  cardForeground: string
  /** Slightly raised surface (tiles, inputs at rest) distinct from `card`. */
  surface: string
  primary: string
  primaryForeground: string
  /** Soft primary tint used as a fill behind primary content. */
  primarySoft: string
  secondary: string
  secondaryForeground: string
  muted: string
  mutedForeground: string
  accent: string
  accentForeground: string
  destructive: string
  destructiveForeground: string
  success: string
  successForeground: string
  warning: string
  warningForeground: string
  info: string
  infoForeground: string
  border: string
  /** Stronger hairline for inputs/dividers that need more contrast. */
  inputBorder: string
  ring: string
  /** Backdrop behind modals/sheets. */
  overlay: string
}

// Light palette — translated from DESIGN.md §4 (violet preset, hue 295).
const light: ColorTokens = {
  background: '#FBFBFD',
  foreground: '#1E1E29',
  card: '#FFFFFF',
  cardForeground: '#1E1E29',
  surface: '#F5F5F8',
  primary: '#6D34D6',
  primaryForeground: '#FFFFFF',
  primarySoft: '#EFE9FC',
  secondary: '#F1F1F5',
  secondaryForeground: '#3A3A47',
  muted: '#F4F4F7',
  mutedForeground: '#6E6E7E',
  accent: '#EFE9FC',
  accentForeground: '#5A27C2',
  destructive: '#E0454A',
  destructiveForeground: '#FFFFFF',
  success: '#1A9E6B',
  successForeground: '#FFFFFF',
  warning: '#D9962B',
  warningForeground: '#3A2A05',
  info: '#2E74E6',
  infoForeground: '#FFFFFF',
  border: '#E8E8EF',
  inputBorder: '#DEDEE7',
  ring: '#6D34D6',
  overlay: 'rgba(20, 20, 30, 0.45)',
}

// Dark palette — translated from DESIGN.md §4 dark column.
const dark: ColorTokens = {
  background: '#15151C',
  foreground: '#ECECEF',
  card: '#1E1E27',
  cardForeground: '#ECECEF',
  surface: '#24242E',
  primary: '#9D6CF2',
  primaryForeground: '#16101F',
  primarySoft: '#2A2240',
  secondary: '#2A2A35',
  secondaryForeground: '#E6E6EC',
  muted: '#24242E',
  mutedForeground: '#9E9EAE',
  accent: '#2E2640',
  accentForeground: '#C9B6F5',
  destructive: '#F0565B',
  destructiveForeground: '#1A0A0B',
  success: '#34D399',
  successForeground: '#06140E',
  warning: '#FBBF40',
  warningForeground: '#1F1605',
  info: '#5B9BFF',
  infoForeground: '#06101F',
  border: 'rgba(255, 255, 255, 0.10)',
  inputBorder: 'rgba(255, 255, 255, 0.16)',
  ring: '#9D6CF2',
  overlay: 'rgba(0, 0, 0, 0.6)',
}

export const palettes = { light, dark }
export type ColorScheme = keyof typeof palettes

// ── Brand accent presets ────────────────────────────────────────────────────
// Only the brand colours change per preset; the neutral surfaces/borders stay
// scheme-driven so the app keeps a cohesive look. `swatch` is the dot shown in
// the picker.
export interface BrandColors {
  primary: string
  primaryForeground: string
  primarySoft: string
  accent: string
  accentForeground: string
  ring: string
}

export interface AccentPreset {
  id: string
  label: string
  swatch: string
  light: BrandColors
  dark: BrandColors
}

export const ACCENT_PRESETS: AccentPreset[] = [
  {
    id: 'violet',
    label: 'Mor',
    swatch: '#6D34D6',
    light: { primary: '#6D34D6', primaryForeground: '#FFFFFF', primarySoft: '#EFE9FC', accent: '#EFE9FC', accentForeground: '#5A27C2', ring: '#6D34D6' },
    dark: { primary: '#9D6CF2', primaryForeground: '#16101F', primarySoft: '#2A2240', accent: '#2E2640', accentForeground: '#C9B6F5', ring: '#9D6CF2' },
  },
  {
    id: 'blue',
    label: 'Mavi',
    swatch: '#2563EB',
    light: { primary: '#2563EB', primaryForeground: '#FFFFFF', primarySoft: '#E4EDFF', accent: '#E4EDFF', accentForeground: '#1E4FD6', ring: '#2563EB' },
    dark: { primary: '#5B9BFF', primaryForeground: '#06101F', primarySoft: '#1B2A45', accent: '#1F2E48', accentForeground: '#B9D2FF', ring: '#5B9BFF' },
  },
  {
    id: 'emerald',
    label: 'Yeşil',
    swatch: '#059669',
    light: { primary: '#059669', primaryForeground: '#FFFFFF', primarySoft: '#D8F7EB', accent: '#D8F7EB', accentForeground: '#047857', ring: '#059669' },
    dark: { primary: '#34D399', primaryForeground: '#06140E', primarySoft: '#123229', accent: '#15392E', accentForeground: '#A7F3D0', ring: '#34D399' },
  },
  {
    id: 'rose',
    label: 'Pembe',
    swatch: '#E11D48',
    light: { primary: '#E11D48', primaryForeground: '#FFFFFF', primarySoft: '#FCE3EA', accent: '#FCE3EA', accentForeground: '#BE123C', ring: '#E11D48' },
    dark: { primary: '#FB7185', primaryForeground: '#1F0A10', primarySoft: '#3A1822', accent: '#3F1A26', accentForeground: '#FECDD3', ring: '#FB7185' },
  },
  {
    id: 'amber',
    label: 'Turuncu',
    swatch: '#D97706',
    light: { primary: '#D97706', primaryForeground: '#FFFFFF', primarySoft: '#FBEAD0', accent: '#FBEAD0', accentForeground: '#B45309', ring: '#D97706' },
    dark: { primary: '#FBBF24', primaryForeground: '#1F1605', primarySoft: '#3A2D10', accent: '#3F3112', accentForeground: '#FDE68A', ring: '#FBBF24' },
  },
  {
    id: 'slate',
    label: 'Gri',
    swatch: '#475569',
    light: { primary: '#475569', primaryForeground: '#FFFFFF', primarySoft: '#EBEEF3', accent: '#EBEEF3', accentForeground: '#334155', ring: '#475569' },
    dark: { primary: '#94A3B8', primaryForeground: '#0B0F17', primarySoft: '#272F3B', accent: '#2A323E', accentForeground: '#CBD5E1', ring: '#94A3B8' },
  },
]

export const DEFAULT_ACCENT = 'violet'

export function accentPreset(id: string): AccentPreset {
  return ACCENT_PRESETS.find((p) => p.id === id) ?? ACCENT_PRESETS[0]
}

// ── Scalar token scales (scheme-independent) ────────────────────────────────

/** 4px spacing grid (mirrors Tailwind v4 base unit, DESIGN.md §3.2). */
export const spacing = {
  px: 1,
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const

/** Radius ramp — base 10 (DESIGN.md §3.3). `full` = pill/avatar. */
export const radius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 10,
  xl: 14,
  '2xl': 18,
  '3xl': 24,
  full: 999,
} as const

/** Type ramp (DESIGN.md §3.1) — sizes + line heights + weights. */
export const type = {
  size: {
    '2xs': 11,
    xs: 12,
    sm: 13,
    base: 15,
    lg: 17,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  leading: {
    tight: 1.2,
    normal: 1.45,
    relaxed: 1.6,
  },
  weight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const

/** Elevation presets — RN shadow objects keyed by role (DESIGN.md §3.4).
 *  Returns a style fragment; `color` comes from the scheme so dark elevations
 *  read correctly. */
export function elevation(level: 'none' | 'sm' | 'md' | 'lg' | 'xl', scheme: ColorScheme) {
  if (level === 'none') return {}
  const isDark = scheme === 'dark'
  const shadowColor = isDark ? '#000000' : '#1A1A2E'
  const presets = {
    sm: { radius: 4, y: 1, opacity: isDark ? 0.4 : 0.06, e: 1 },
    md: { radius: 10, y: 3, opacity: isDark ? 0.5 : 0.1, e: 3 },
    lg: { radius: 20, y: 8, opacity: isDark ? 0.6 : 0.14, e: 8 },
    xl: { radius: 30, y: 14, opacity: isDark ? 0.7 : 0.2, e: 14 },
  } as const
  const p = presets[level]
  return {
    shadowColor,
    shadowOffset: { width: 0, height: p.y },
    shadowOpacity: p.opacity,
    shadowRadius: p.radius,
    elevation: p.e, // Android
  }
}

/** Motion durations (ms) — mirrors DESIGN.md §3.6. */
export const duration = { fast: 120, normal: 200, slow: 320 } as const

// ── Customisation scales (radius roundness + base font size) ─────────────────
// The active Theme carries scaled copies of the radius/type ramps so the whole
// app responds to the user's roundness/font preference.
export type RadiusTokens = Record<keyof typeof radius, number>
export type RadiusScaleId = 'compact' | 'default' | 'round'
export const RADIUS_FACTORS: Record<RadiusScaleId, number> = {
  compact: 0.6,
  default: 1,
  round: 1.5,
}

export function scaleRadius(scale: RadiusScaleId): RadiusTokens {
  const f = RADIUS_FACTORS[scale]
  const out = {} as RadiusTokens
  for (const k of Object.keys(radius) as (keyof typeof radius)[]) {
    out[k] = k === 'full' ? radius[k] : Math.max(2, Math.round(radius[k] * f))
  }
  return out
}

export type TypeSizeTokens = Record<keyof typeof type.size, number>
export interface TypeTokens {
  size: TypeSizeTokens
  leading: typeof type.leading
  weight: typeof type.weight
}
export type FontScaleId = 'small' | 'default' | 'large'
export const FONT_FACTORS: Record<FontScaleId, number> = {
  small: 0.92,
  default: 1,
  large: 1.12,
}

export function scaleType(scale: FontScaleId): TypeTokens {
  const f = FONT_FACTORS[scale]
  const size = {} as TypeSizeTokens
  for (const k of Object.keys(type.size) as (keyof typeof type.size)[]) {
    size[k] = Math.round(type.size[k] * f)
  }
  return { size, leading: type.leading, weight: type.weight }
}
