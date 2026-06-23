import { createFileRoute } from '@tanstack/react-router'
import { Layers, Locate, Minus, Plus } from 'lucide-react'

import { PageWrapper } from '@/components/layout/page'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export const Route = createFileRoute('/_authed/map')({
  component: MapPage,
})

/**
 * Demonstrates the edge-to-edge layout: `PageWrapper padded={false}` fills the
 * entire content area with zero gutters — ideal for maps, canvases, editors.
 */
function MapPage() {
  return (
    <PageWrapper padded={false}>
      {/* Faux map surface */}
      <div className="absolute inset-0 bg-muted">
        <div
          className="size-full opacity-[0.5] dark:opacity-30"
          style={{
            backgroundImage:
              'linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        {/* a couple of "routes" */}
        <svg className="absolute inset-0 size-full" aria-hidden>
          <path
            d="M 80 400 Q 300 200 520 320 T 900 260"
            fill="none"
            stroke="var(--color-primary)"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.8"
          />
          <circle cx="80" cy="400" r="7" fill="var(--color-primary)" />
          <circle cx="900" cy="260" r="7" fill="var(--color-destructive)" />
        </svg>
      </div>

      {/* Floating info panel */}
      <div className="absolute top-4 left-4 w-64 rounded-xl border bg-popover/95 p-4 shadow-lg backdrop-blur">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Canlı Filo</h2>
          <Badge variant="success">12 aktif</Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Bu sayfa sıfır kenar boşluklu düzen kullanır — dolgu yoktur, tüm ekranı kaplar.
        </p>
        <div className="mt-3 space-y-1.5 text-sm">
          {['Kamyon 04 · yolda', 'Kamyonet 11 · boşta', 'Kamyon 02 · teslimatta'].map(
            (t) => (
              <div key={t} className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-primary" />
                {t}
              </div>
            ),
          )}
        </div>
      </div>

      {/* Map controls */}
      <div className="absolute right-4 bottom-20 flex flex-col gap-2">
        <div className="flex flex-col overflow-hidden rounded-lg border bg-popover shadow-md">
          <Button variant="ghost" size="icon" aria-label="Yakınlaştır">
            <Plus />
          </Button>
          <div className="h-px bg-border" />
          <Button variant="ghost" size="icon" aria-label="Uzaklaştır">
            <Minus />
          </Button>
        </div>
        <Button variant="secondary" size="icon" aria-label="Konumla">
          <Locate />
        </Button>
        <Button variant="secondary" size="icon" aria-label="Katmanlar">
          <Layers />
        </Button>
      </div>
    </PageWrapper>
  )
}
