import { Monitor, Moon, RotateCcw, Sun } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useTheme } from '@/lib/theme/use-theme'
import {
  COLOR_PRESETS,
  FONT_OPTIONS,
  MONO_FONT_OPTIONS,
} from '@/lib/theme/presets'
import type { ShadowStrength, ThemeMode } from '@/lib/theme/types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const MODES: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Açık', icon: Sun },
  { value: 'dark', label: 'Koyu', icon: Moon },
  { value: 'system', label: 'Sistem', icon: Monitor },
]

const SHADOWS: { value: ShadowStrength; label: string }[] = [
  { value: 'none', label: 'Yok' },
  { value: 'soft', label: 'Yumuşak' },
  { value: 'default', label: 'Varsayılan' },
  { value: 'strong', label: 'Güçlü' },
]

/** Small labeled section wrapper. */
function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <Label className="text-xs font-medium text-muted-foreground">
          {label}
        </Label>
        {hint && <span className="font-mono text-2xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

export function ThemeCustomizer() {
  const { config, setConfig, reset } = useTheme()

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 p-5">
        {/* Mode --------------------------------------------------------- */}
        <Field label="Görünüm">
          <div className="grid grid-cols-3 gap-2">
            {MODES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setConfig({ mode: value })}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-lg border p-3 text-xs font-medium transition-colors',
                  config.mode === value
                    ? 'border-primary bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50',
                )}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>
        </Field>

        <Separator />

        {/* Color preset ------------------------------------------------- */}
        <Field label="Vurgu rengi">
          <div className="grid grid-cols-7 gap-2">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                title={preset.label}
                onClick={() => setConfig({ preset: preset.id })}
                className={cn(
                  'flex aspect-square items-center justify-center rounded-full ring-offset-2 ring-offset-background transition-all',
                  config.preset === preset.id
                    ? 'ring-2 ring-ring'
                    : 'hover:scale-110',
                )}
              >
                <span
                  className="size-5 rounded-full"
                  style={{ backgroundColor: preset.swatch }}
                />
              </button>
            ))}
          </div>
        </Field>

        <Separator />

        {/* Radius ------------------------------------------------------- */}
        <Field label="Köşe yuvarlığı" hint={`${config.radius.toFixed(3)}rem`}>
          <Slider
            value={[config.radius]}
            min={0}
            max={1.5}
            step={0.025}
            onValueChange={([v]) => setConfig({ radius: v })}
          />
        </Field>

        {/* Scale -------------------------------------------------------- */}
        <Field label="Ölçek (yoğunluk)" hint={`${config.scale.toFixed(2)}×`}>
          <Slider
            value={[config.scale]}
            min={0.85}
            max={1.25}
            step={0.01}
            onValueChange={([v]) => setConfig({ scale: v })}
          />
        </Field>

        {/* Base font size ---------------------------------------------- */}
        <Field label="Temel yazı boyutu" hint={`${config.fontSize}px`}>
          <Slider
            value={[config.fontSize]}
            min={13}
            max={18}
            step={1}
            onValueChange={([v]) => setConfig({ fontSize: v })}
          />
        </Field>

        {/* Spacing grid ------------------------------------------------ */}
        <Field
          label="Boşluk ızgarası"
          hint={`${Math.round(config.spacing * 16)}px`}
        >
          <Slider
            value={[config.spacing]}
            min={0.2}
            max={0.32}
            step={0.01}
            onValueChange={([v]) => setConfig({ spacing: v })}
          />
        </Field>

        <Separator />

        {/* Fonts -------------------------------------------------------- */}
        <Field label="Sans-serif yazı tipi">
          <Select
            value={config.fontSans}
            onValueChange={(v) => setConfig({ fontSans: v })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map((f) => (
                <SelectItem key={f.label} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Başlık yazı tipi">
          <Select
            value={config.fontHeading}
            onValueChange={(v) => setConfig({ fontHeading: v })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map((f) => (
                <SelectItem key={f.label} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Monospace yazı tipi">
          <Select
            value={config.fontMono}
            onValueChange={(v) => setConfig({ fontMono: v })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONO_FONT_OPTIONS.map((f) => (
                <SelectItem key={f.label} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Separator />

        {/* Shadow ------------------------------------------------------- */}
        <Field label="Yükseklik (Gölge)">
          <div className="grid grid-cols-4 gap-2">
            {SHADOWS.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setConfig({ shadow: s.value })}
                className={cn(
                  'rounded-lg border px-2 py-2 text-xs font-medium transition-colors',
                  config.shadow === s.value
                    ? 'border-primary bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50',
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </Field>

        <Separator />

        <Button variant="outline" className="w-full" onClick={reset}>
          <RotateCcw />
          Varsayılana sıfırla
        </Button>
      </div>
    </ScrollArea>
  )
}
