// Small date/time helpers (tr-TR), shared by the audit/error views. No deps.
//
// TurboHesap is a Türkiye-focused product, so real timestamps are always shown
// in Türkiye time (Europe/Istanbul) regardless of the device/runtime timezone —
// otherwise a machine on UTC would render every clock 3 hours early.
const TR_TZ = 'Europe/Istanbul'

const dateTimeFmt = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: TR_TZ,
})

const dateFmt = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeZone: TR_TZ })

// A bare calendar date ("YYYY-MM-DD") carries no time or zone. `new Date('…')`
// parses it as UTC midnight, which then renders as a bogus "03:00" (or even the
// previous day) once a timezone is applied. Format such values in UTC so the
// calendar day is preserved and no phantom time appears.
const dateOnlyFmt = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeZone: 'UTC' })
const dateOnlyRe = /^\d{4}-\d{2}-\d{2}$/

const timeFmt = new Intl.DateTimeFormat('tr-TR', { timeStyle: 'short', timeZone: TR_TZ })

const relFmt = new Intl.RelativeTimeFormat('tr', { numeric: 'auto' })

/** Absolute, localized date-time, e.g. "24 Haz 2026 14:32". */
export function formatDateTime(iso: string | Date): string {
  return dateTimeFmt.format(typeof iso === 'string' ? new Date(iso) : iso)
}

/** Absolute, localized date (no time), e.g. "24 Haz 2026". Timezone-safe for
 *  date-only values (no phantom time / day shift). */
export function formatDate(iso: string | Date): string {
  if (typeof iso === 'string' && dateOnlyRe.test(iso)) {
    return dateOnlyFmt.format(new Date(`${iso}T00:00:00Z`))
  }
  return dateFmt.format(typeof iso === 'string' ? new Date(iso) : iso)
}

/** Just the localized clock time of a real timestamp, e.g. "19:03". */
export function formatTime(iso: string | Date): string {
  return timeFmt.format(typeof iso === 'string' ? new Date(iso) : iso)
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
