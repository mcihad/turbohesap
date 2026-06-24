import type { ColorPreset, ThemeConfig } from './types'

/**
 * Color presets
 * ----------------------------------------------------------------------------
 * Each preset only overrides the tokens that define its identity (primary,
 * accent, ring, and — for tinted neutrals — surfaces). Everything it omits
 * falls through to the defaults in `index.css`. Keep values in OKLCH.
 */
export const COLOR_PRESETS: ColorPreset[] = [
  {
    id: 'violet',
    label: 'Mor',
    swatch: 'oklch(0.55 0.22 295)',
    light: {
      primary: 'oklch(0.55 0.22 295)',
      'primary-foreground': 'oklch(0.99 0.005 295)',
      accent: 'oklch(0.95 0.03 295)',
      'accent-foreground': 'oklch(0.3 0.12 295)',
      ring: 'oklch(0.55 0.22 295)',
    },
    dark: {
      primary: 'oklch(0.7 0.17 295)',
      'primary-foreground': 'oklch(0.18 0.04 295)',
      accent: 'oklch(0.3 0.04 295)',
      'accent-foreground': 'oklch(0.9 0.04 295)',
      ring: 'oklch(0.7 0.17 295)',
    },
  },
  {
    id: 'blue',
    label: 'Mavi',
    swatch: 'oklch(0.55 0.2 255)',
    light: {
      primary: 'oklch(0.55 0.2 255)',
      'primary-foreground': 'oklch(0.99 0.01 255)',
      accent: 'oklch(0.95 0.03 255)',
      'accent-foreground': 'oklch(0.3 0.12 255)',
      ring: 'oklch(0.55 0.2 255)',
    },
    dark: {
      primary: 'oklch(0.7 0.16 255)',
      'primary-foreground': 'oklch(0.17 0.04 255)',
      accent: 'oklch(0.3 0.05 255)',
      'accent-foreground': 'oklch(0.9 0.04 255)',
      ring: 'oklch(0.7 0.16 255)',
    },
  },
  {
    id: 'teal',
    label: 'Turkuaz',
    swatch: 'oklch(0.6 0.13 195)',
    light: {
      primary: 'oklch(0.6 0.13 195)',
      'primary-foreground': 'oklch(0.99 0.01 195)',
      accent: 'oklch(0.95 0.03 195)',
      'accent-foreground': 'oklch(0.3 0.08 195)',
      ring: 'oklch(0.6 0.13 195)',
    },
    dark: {
      primary: 'oklch(0.72 0.12 195)',
      'primary-foreground': 'oklch(0.17 0.03 195)',
      accent: 'oklch(0.3 0.04 195)',
      'accent-foreground': 'oklch(0.9 0.04 195)',
      ring: 'oklch(0.72 0.12 195)',
    },
  },
  {
    id: 'emerald',
    label: 'Zümrüt',
    swatch: 'oklch(0.6 0.15 155)',
    light: {
      primary: 'oklch(0.6 0.15 155)',
      'primary-foreground': 'oklch(0.99 0.01 155)',
      accent: 'oklch(0.95 0.04 155)',
      'accent-foreground': 'oklch(0.3 0.1 155)',
      ring: 'oklch(0.6 0.15 155)',
    },
    dark: {
      primary: 'oklch(0.72 0.14 155)',
      'primary-foreground': 'oklch(0.16 0.03 155)',
      accent: 'oklch(0.3 0.05 155)',
      'accent-foreground': 'oklch(0.9 0.05 155)',
      ring: 'oklch(0.72 0.14 155)',
    },
  },
  {
    id: 'amber',
    label: 'Kehribar',
    swatch: 'oklch(0.72 0.16 65)',
    light: {
      primary: 'oklch(0.72 0.16 65)',
      'primary-foreground': 'oklch(0.24 0.05 65)',
      accent: 'oklch(0.95 0.05 65)',
      'accent-foreground': 'oklch(0.35 0.1 65)',
      ring: 'oklch(0.72 0.16 65)',
    },
    dark: {
      primary: 'oklch(0.8 0.15 65)',
      'primary-foreground': 'oklch(0.2 0.05 65)',
      accent: 'oklch(0.32 0.06 65)',
      'accent-foreground': 'oklch(0.92 0.06 65)',
      ring: 'oklch(0.8 0.15 65)',
    },
  },
  {
    id: 'rose',
    label: 'Gül',
    swatch: 'oklch(0.6 0.21 15)',
    light: {
      primary: 'oklch(0.6 0.21 15)',
      'primary-foreground': 'oklch(0.99 0.01 15)',
      accent: 'oklch(0.95 0.04 15)',
      'accent-foreground': 'oklch(0.35 0.12 15)',
      ring: 'oklch(0.6 0.21 15)',
    },
    dark: {
      primary: 'oklch(0.7 0.18 15)',
      'primary-foreground': 'oklch(0.17 0.04 15)',
      accent: 'oklch(0.32 0.06 15)',
      'accent-foreground': 'oklch(0.92 0.05 15)',
      ring: 'oklch(0.7 0.18 15)',
    },
  },
  {
    id: 'neutral',
    label: 'Nötr',
    swatch: 'oklch(0.45 0.01 270)',
    light: {
      primary: 'oklch(0.32 0.01 270)',
      'primary-foreground': 'oklch(0.99 0 0)',
      accent: 'oklch(0.95 0.005 270)',
      'accent-foreground': 'oklch(0.28 0.01 270)',
      ring: 'oklch(0.45 0.01 270)',
    },
    dark: {
      primary: 'oklch(0.92 0.005 270)',
      'primary-foreground': 'oklch(0.2 0.01 270)',
      accent: 'oklch(0.3 0.01 270)',
      'accent-foreground': 'oklch(0.92 0.005 270)',
      ring: 'oklch(0.7 0.01 270)',
    },
  },
]

export const DEFAULT_THEME: ThemeConfig = {
  mode: 'system',
  preset: 'neutral',
  radius: 0.625,
  scale: 1,
  fontSize: 16,
  spacing: 0.25,
  fontSans:
    "'Inter', ui-sans-serif, system-ui, 'Segoe UI', Roboto, sans-serif",
  fontHeading:
    "'Inter', ui-sans-serif, system-ui, 'Segoe UI', Roboto, sans-serif",
  fontMono:
    "ui-monospace, 'JetBrains Mono', 'Cascadia Code', Consolas, monospace",
  shadow: 'default',
}

/** Curated font stacks offered in the customizer. */
export const FONT_OPTIONS: { label: string; value: string }[] = [
  {
    label: 'Inter (varsayılan)',
    value: "'Inter', ui-sans-serif, system-ui, 'Segoe UI', Roboto, sans-serif",
  },
  {
    label: 'Sistem Arayüzü',
    value: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  },
  {
    label: 'Geist',
    value: "'Geist', ui-sans-serif, system-ui, sans-serif",
  },
  {
    label: 'Serif',
    value: "ui-serif, Georgia, Cambria, 'Times New Roman', serif",
  },
]

export const MONO_FONT_OPTIONS: { label: string; value: string }[] = [
  {
    label: 'JetBrains Mono',
    value:
      "ui-monospace, 'JetBrains Mono', 'Cascadia Code', Consolas, monospace",
  },
  {
    label: 'Sistem Monospace',
    value: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  },
]
