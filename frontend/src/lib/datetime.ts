// Small date/time helpers (tr-TR), shared by the audit/error views. No deps.

const dateTimeFmt = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const relFmt = new Intl.RelativeTimeFormat('tr', { numeric: 'auto' })

/** Absolute, localized date-time, e.g. "24 Haz 2026 14:32". */
export function formatDateTime(iso: string | Date): string {
  return dateTimeFmt.format(typeof iso === 'string' ? new Date(iso) : iso)
}

/** Relative time, e.g. "2 saat önce" — falls back to absolute past ~30 days. */
export function formatRelative(iso: string | Date): string {
  const t = (typeof iso === 'string' ? new Date(iso) : iso).getTime()
  const diff = t - Date.now()
  const abs = Math.abs(diff)
  const min = 60_000
  const hour = 3_600_000
  const day = 86_400_000
  if (abs < min) return relFmt.format(Math.round(diff / 1000), 'second')
  if (abs < hour) return relFmt.format(Math.round(diff / min), 'minute')
  if (abs < day) return relFmt.format(Math.round(diff / hour), 'hour')
  if (abs < day * 30) return relFmt.format(Math.round(diff / day), 'day')
  return formatDateTime(iso)
}
