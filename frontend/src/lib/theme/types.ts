/**
 * Theme model
 * ----------------------------------------------------------------------------
 * A `ThemeConfig` is the complete, serializable description of a theme. It is
 * persisted to localStorage and turned into a `<style>` block at runtime by the
 * ThemeProvider, which overrides the default tokens declared in `index.css`.
 *
 * Anything a user can customize lives here — nothing else in the app should hold
 * theme state.
 */

export type ThemeMode = 'light' | 'dark' | 'system'

/** Color tokens a preset may set. Values are CSS color strings (OKLCH). */
export interface ColorTokens {
  background?: string
  foreground?: string
  card?: string
  'card-foreground'?: string
  popover?: string
  'popover-foreground'?: string
  primary?: string
  'primary-foreground'?: string
  secondary?: string
  'secondary-foreground'?: string
  muted?: string
  'muted-foreground'?: string
  accent?: string
  'accent-foreground'?: string
  destructive?: string
  'destructive-foreground'?: string
  border?: string
  input?: string
  ring?: string
  sidebar?: string
  'sidebar-foreground'?: string
  'sidebar-accent'?: string
  'sidebar-accent-foreground'?: string
  'sidebar-border'?: string
}

/** A color preset bundles a light + dark palette under a stable id. */
export interface ColorPreset {
  id: string
  label: string
  /** Swatch shown in the picker (resolved primary for light mode). */
  swatch: string
  light: ColorTokens
  dark: ColorTokens
}

export type ShadowStrength = 'none' | 'soft' | 'default' | 'strong'

export interface ThemeConfig {
  /** light / dark / follow OS */
  mode: ThemeMode
  /** id of the active color preset (see presets.ts) */
  preset: string
  /** base corner radius, in rem */
  radius: number
  /** global type + spacing multiplier ("density / zoom") */
  scale: number
  /** root font size, in px */
  fontSize: number
  /** spacing grid base unit, in rem (0.25 = 4px grid) */
  spacing: number
  /** body / UI font stack */
  fontSans: string
  /** heading font stack */
  fontHeading: string
  /** monospace font stack */
  fontMono: string
  /** elevation intensity */
  shadow: ShadowStrength
}
