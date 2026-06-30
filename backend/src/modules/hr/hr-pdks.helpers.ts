import { createHash } from 'node:crypto'

import type { CheckinTimeWindow } from '@turbohesap/shared'

// Pure PDKS helpers (no DB) — unit-tested in hr-pdks.helpers.spec.ts.

// True if `hhmm` (local "HH:MM") on weekday `dow` (1=Mon..7=Sun) falls inside any
// allowed window. No windows → always allowed.
export function evaluateTimeWindows(
  windows: CheckinTimeWindow[] | null | undefined,
  dow: number,
  hhmm: string,
): boolean {
  if (!windows || windows.length === 0) return true
  return windows.some((w) => {
    if (w.dow && w.dow.length && !w.dow.includes(dow)) return false
    return w.from <= hhmm && hhmm <= w.to
  })
}

// The day-of-week (1=Mon..7=Sun) and "HH:MM" for `now` in a given IANA timezone.
export function localDowAndTime(now: Date, timeZone: string): { dow: number; hhmm: string } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now)
  const wd = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon'
  const hh = parts.find((p) => p.type === 'hour')?.value ?? '00'
  const mm = parts.find((p) => p.type === 'minute')?.value ?? '00'
  const dowMap: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }
  return { dow: dowMap[wd] ?? 1, hhmm: `${hh === '24' ? '00' : hh}:${mm}` }
}

// Index into a rotation's `days` for a given calendar day. Handles negative
// (anchor in the future) and large offsets via double-mod.
export function rotationSlotIndex(
  anchorEpochDay: number,
  dayEpochDay: number,
  offset: number,
  cycle: number,
): number {
  const c = Math.max(1, cycle)
  return (((dayEpochDay - anchorEpochDay + offset) % c) + c) % c
}

// Stable idempotency key for a card event lacking an externalId.
export function deriveDedupKey(
  deviceId: string,
  cardNo: string | undefined,
  eventTime: string,
  direction: string | undefined,
): string {
  return createHash('sha256')
    .update(`${deviceId}|${cardNo ?? ''}|${eventTime}|${direction ?? ''}`)
    .digest('hex')
    .slice(0, 40)
}

export const EPOCH_DAY_MS = 86_400_000
export const epochDay = (isoDate: string): number =>
  Math.floor(new Date(`${isoDate.slice(0, 10)}T00:00:00.000Z`).getTime() / EPOCH_DAY_MS)
