import { COLOR_PRESETS } from './presets'
import type { ColorTokens, ShadowStrength, ThemeConfig } from './types'

const SHADOW_MULTIPLIER: Record<ShadowStrength, number> = {
  none: 0,
  soft: 0.6,
  default: 1,
  strong: 1.7,
}

/** Build the six elevation tokens scaled by the chosen strength. */
function shadowVars(strength: ShadowStrength): Record<string, string> {
  const m = SHADOW_MULTIPLIER[strength]
  const a = (base: number) => +(base * m).toFixed(3)
  return {
    '--shadow-xs': `0 1px 2px 0 hsl(var(--shadow-color) / ${a(0.05)})`,
    '--shadow-sm': `0 1px 3px 0 hsl(var(--shadow-color) / ${a(0.08)}), 0 1px 2px -1px hsl(var(--shadow-color) / ${a(0.08)})`,
    '--shadow-md': `0 4px 6px -1px hsl(var(--shadow-color) / ${a(0.08)}), 0 2px 4px -2px hsl(var(--shadow-color) / ${a(0.08)})`,
    '--shadow-lg': `0 10px 15px -3px hsl(var(--shadow-color) / ${a(0.1)}), 0 4px 6px -4px hsl(var(--shadow-color) / ${a(0.1)})`,
    '--shadow-xl': `0 20px 25px -5px hsl(var(--shadow-color) / ${a(0.12)}), 0 8px 10px -6px hsl(var(--shadow-color) / ${a(0.12)})`,
    '--shadow-2xl': `0 25px 50px -12px hsl(var(--shadow-color) / ${a(0.25)})`,
  }
}

function colorVars(tokens: ColorTokens): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(tokens)) {
    if (value) out[`--${key}`] = value
  }
  return out
}

function serialize(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join('\n')
}

/**
 * Turn a ThemeConfig into a CSS string injected into <style id="app-theme">.
 * `:root` carries scalar tokens + the preset's light palette; `.dark` carries
 * the preset's dark palette so both modes stay fully themeable.
 */
export function generateThemeCss(config: ThemeConfig): string {
  const preset =
    COLOR_PRESETS.find((p) => p.id === config.preset) ?? COLOR_PRESETS[0]

  const scalarVars: Record<string, string> = {
    '--radius': `${config.radius}rem`,
    '--scale': `${config.scale}`,
    '--font-size-base': `${config.fontSize}px`,
    '--spacing': `${config.spacing}rem`,
    '--font-sans': config.fontSans,
    '--font-heading': config.fontHeading,
    '--font-mono': config.fontMono,
    ...shadowVars(config.shadow),
  }

  const root = { ...scalarVars, ...colorVars(preset.light) }
  const dark = colorVars(preset.dark)

  return `:root {\n${serialize(root)}\n}\n\n.dark {\n${serialize(dark)}\n}\n`
}
