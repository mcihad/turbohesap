// Date/time formatting helpers (Turkish) — the mobile counterpart of the web's
// `@/lib/datetime`. Kept dependency-free (no date-fns on mobile).

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return '—'
  const diff = Date.now() - then
  const sec = Math.round(diff / 1000)
  if (sec < 45) return 'az önce'
  const min = Math.round(sec / 60)
  if (min < 60) return `${min} dk önce`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr} sa önce`
  const day = Math.round(hr / 24)
  if (day < 30) return `${day} gün önce`
  const mon = Math.round(day / 30)
  if (mon < 12) return `${mon} ay önce`
  return `${Math.round(mon / 12)} yıl önce`
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
