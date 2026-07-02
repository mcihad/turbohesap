import type { InstrumentDirection, InstrumentStatus, InstrumentType } from '@turbohesap/shared'

export const INSTRUMENT_TYPE_LABELS: Record<InstrumentType, string> = {
  check: 'Çek',
  note: 'Senet',
}

export const INSTRUMENT_DIRECTION_LABELS: Record<InstrumentDirection, string> = {
  received: 'Alınan',
  issued: 'Verilen',
}

export const INSTRUMENT_STATUS_LABELS: Record<InstrumentStatus, string> = {
  open: 'Açık',
  in_collection: 'Tahsile Verildi',
  collected: 'Tahsil Edildi',
  paid: 'Ödendi',
  bounced: 'Karşılıksız',
  endorsed: 'Ciro Edildi',
  pledged: 'Teminatta',
  cancelled: 'İptal',
}

// Badge tone per status: open=outline, in_collection=warning (pending),
// collected/paid=success (terminal, money settled), bounced=destructive,
// endorsed/pledged=secondary (terminal-ish, no ledger entry), cancelled=outline.
export const INSTRUMENT_STATUS_TONE: Record<
  InstrumentStatus,
  'outline' | 'warning' | 'success' | 'destructive' | 'secondary'
> = {
  open: 'outline',
  in_collection: 'warning',
  collected: 'success',
  paid: 'success',
  bounced: 'destructive',
  endorsed: 'secondary',
  pledged: 'secondary',
  cancelled: 'outline',
}

export function instrumentTypeLabel(t: InstrumentType): string {
  return INSTRUMENT_TYPE_LABELS[t] ?? t
}

export function instrumentDirectionLabel(d: InstrumentDirection): string {
  return INSTRUMENT_DIRECTION_LABELS[d] ?? d
}

export function instrumentStatusLabel(s: InstrumentStatus): string {
  return INSTRUMENT_STATUS_LABELS[s] ?? s
}
