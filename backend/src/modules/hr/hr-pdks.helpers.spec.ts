import {
  deriveDedupKey,
  epochDay,
  evaluateTimeWindows,
  localDowAndTime,
  rotationSlotIndex,
} from './hr-pdks.helpers'

describe('PDKS helpers', () => {
  describe('evaluateTimeWindows', () => {
    it('allows any time when no windows', () => {
      expect(evaluateTimeWindows([], 1, '03:00')).toBe(true)
      expect(evaluateTimeWindows(undefined, 5, '23:59')).toBe(true)
    })
    it('accepts inside a window, rejects outside', () => {
      const w = [{ from: '08:00', to: '09:30' }]
      expect(evaluateTimeWindows(w, 1, '08:00')).toBe(true)
      expect(evaluateTimeWindows(w, 1, '09:30')).toBe(true)
      expect(evaluateTimeWindows(w, 1, '07:59')).toBe(false)
      expect(evaluateTimeWindows(w, 1, '09:31')).toBe(false)
    })
    it('honors day-of-week restriction', () => {
      const w = [{ dow: [1, 2, 3, 4, 5], from: '08:00', to: '18:00' }]
      expect(evaluateTimeWindows(w, 3, '12:00')).toBe(true) // Wed
      expect(evaluateTimeWindows(w, 6, '12:00')).toBe(false) // Sat
    })
    it('accepts if ANY of multiple windows matches', () => {
      const w = [
        { from: '08:00', to: '09:00' },
        { from: '13:00', to: '14:00' },
      ]
      expect(evaluateTimeWindows(w, 1, '13:30')).toBe(true)
      expect(evaluateTimeWindows(w, 1, '11:00')).toBe(false)
    })
  })

  describe('localDowAndTime', () => {
    it('formats Istanbul local time/day for a known UTC instant', () => {
      // 2026-06-30T05:08:00Z → 08:08 Europe/Istanbul (UTC+3), a Tuesday.
      const r = localDowAndTime(new Date('2026-06-30T05:08:00Z'), 'Europe/Istanbul')
      expect(r.hhmm).toBe('08:08')
      expect(r.dow).toBe(2)
    })
  })

  describe('rotationSlotIndex', () => {
    const anchor = epochDay('2026-01-01')
    it('cycles with the pattern length', () => {
      expect(rotationSlotIndex(anchor, epochDay('2026-01-01'), 0, 3)).toBe(0)
      expect(rotationSlotIndex(anchor, epochDay('2026-01-02'), 0, 3)).toBe(1)
      expect(rotationSlotIndex(anchor, epochDay('2026-01-03'), 0, 3)).toBe(2)
      expect(rotationSlotIndex(anchor, epochDay('2026-01-04'), 0, 3)).toBe(0)
    })
    it('applies a team offset', () => {
      expect(rotationSlotIndex(anchor, epochDay('2026-01-01'), 1, 3)).toBe(1)
      expect(rotationSlotIndex(anchor, epochDay('2026-01-01'), 4, 3)).toBe(1) // 4 % 3
    })
    it('handles days before the anchor (negative)', () => {
      expect(rotationSlotIndex(anchor, epochDay('2025-12-31'), 0, 3)).toBe(2)
    })
    it('4-on-4-off has an 8-day cycle', () => {
      const idxs = Array.from({ length: 8 }, (_, i) =>
        rotationSlotIndex(anchor, anchor + i, 0, 8),
      )
      expect(idxs).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
      expect(rotationSlotIndex(anchor, anchor + 8, 0, 8)).toBe(0)
    })
  })

  describe('deriveDedupKey', () => {
    it('is deterministic for the same inputs', () => {
      const a = deriveDedupKey('ZK-1', '0006541234', '2026-06-30T08:03:12+03:00', 'in')
      const b = deriveDedupKey('ZK-1', '0006541234', '2026-06-30T08:03:12+03:00', 'in')
      expect(a).toBe(b)
      expect(a).toHaveLength(40)
    })
    it('differs when any component differs', () => {
      const base = deriveDedupKey('ZK-1', '1', '2026-06-30T08:03:12+03:00', 'in')
      expect(deriveDedupKey('ZK-2', '1', '2026-06-30T08:03:12+03:00', 'in')).not.toBe(base)
      expect(deriveDedupKey('ZK-1', '2', '2026-06-30T08:03:12+03:00', 'in')).not.toBe(base)
      expect(deriveDedupKey('ZK-1', '1', '2026-06-30T08:03:12+03:00', 'out')).not.toBe(base)
    })
  })
})
