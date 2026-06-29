import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Monitor, Store } from 'lucide-react'

import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth/auth-context'
import { displayName } from '@/lib/auth/tokens'
import { cn } from '@/lib/utils'
import { PosHeader } from '../components/pos-header'

// Register picker — the POS landing screen after login. An operator hero (who's
// working, when, how many shifts are open) sits above a grid of terminal cards;
// tapping one opens its sell screen.
export function PosHomePage() {
  const registersQuery = useQuery({ queryKey: ['pos', 'registers'], queryFn: () => api.pos.registers.list() })
  const registers = (registersQuery.data ?? []).filter((r) => r.isActive)
  const { user } = useAuth()
  const clock = useClock()
  const openCount = registers.filter((r) => r.openSessionId).length
  const firstName = user ? displayName(user).split(' ')[0] : ''

  return (
    <div className="flex h-full flex-col">
      <PosHeader left={<span className="text-sm font-semibold tracking-tight">Kasa Seçimi</span>} />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-6 py-10">
          {/* Operator hero */}
          <div className="flex flex-wrap items-end justify-between gap-6 border-b pb-8">
            <div className="space-y-1.5">
              <p className="text-2xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{clock.date}</p>
              <h1 className="text-3xl font-semibold tracking-tight">
                Merhaba{firstName ? `, ${firstName}` : ''} 👋
              </h1>
              <p className="text-sm text-muted-foreground">Çalışacağın kasayı seç ve satışa başla.</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-4xl font-semibold leading-none tracking-tight tabular-nums">{clock.time}</p>
              <p className="mt-2 text-2xs text-muted-foreground">
                {registers.length} kasa · {openCount} açık vardiya
              </p>
            </div>
          </div>

          {/* Terminals */}
          <div className="pt-8">
            {registersQuery.isLoading ? (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-44 animate-pulse rounded-2xl border bg-card" />
                ))}
              </div>
            ) : registers.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed py-20 text-center">
                <Store className="size-10 text-muted-foreground/40" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Tanımlı kasa yok</p>
                  <p className="text-2xs text-muted-foreground">Yönetimden POS &gt; Kasalar bölümünde bir kasa ekleyin.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-4">
                {registers.map((r) => {
                  const open = !!r.openSessionId
                  const meta = [r.code, r.branch?.name, r.salesChannel?.name].filter(Boolean).join(' · ')
                  return (
                    <Link
                      key={r.id}
                      to="/pos/sell/$registerId"
                      params={{ registerId: r.id }}
                      className={cn(
                        'group flex flex-col gap-5 rounded-2xl border bg-card p-5 shadow-xs transition-all',
                        'hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg',
                        open && 'border-primary/30',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Monitor className="size-6" />
                        </span>
                        <StatusChip open={open} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-lg font-semibold leading-tight tracking-tight">{r.name}</p>
                        {meta ? <p className="text-2xs text-muted-foreground">{meta}</p> : null}
                      </div>
                      <span className="mt-auto flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors group-hover:text-primary">
                        {open ? 'Devam et' : 'Vardiya aç'}
                        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusChip({ open }: { open: boolean }) {
  return open ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-2xs font-semibold text-emerald-600">
      <span className="size-1.5 rounded-full bg-emerald-500" />
      Vardiya açık
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-2xs font-medium text-muted-foreground">
      <span className="size-1.5 rounded-full bg-muted-foreground/50" />
      Kapalı
    </span>
  )
}

// Ticking wall clock + long date for the hero (POS operators glance at the time).
function useClock() {
  const [now, setNow] = React.useState(() => new Date())
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])
  return {
    time: now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' }),
    date: now.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Istanbul' }),
  }
}
