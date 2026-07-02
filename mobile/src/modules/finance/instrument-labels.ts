// Çek/Senet — Turkish labels, badge tones, and the status-action state machine.
// Mirrors documents/labels.ts style. The state machine mirrors the transitions
// documented on `IFinancialInstrumentsService` (shared/src/modules/finance/
// financial-instrument.service.ts) and the brief:
//   received: open → in_collection → collected (terminal) | bounced | endorsed | pledged.
//             Also open → cancelled.
//   issued:   open → paid (terminal) | bounced | cancelled.
//   (collected|paid) → reverse → open.
// The backend is the real source of truth (it 400s on an invalid transition) —
// this only drives which action buttons are offered.

import { FinancePermissions, type InstrumentDirection, type InstrumentStatus, type InstrumentType } from '@turbohesap/shared'
import type { BadgeTone, IconName } from '../../components'

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
  in_collection: 'Tahsilde',
  collected: 'Tahsil Edildi',
  paid: 'Ödendi',
  bounced: 'Karşılıksız',
  endorsed: 'Ciro Edildi',
  pledged: 'Teminatta',
  cancelled: 'İptal',
}

export const INSTRUMENT_STATUS_TONES: Record<InstrumentStatus, BadgeTone> = {
  open: 'default',
  in_collection: 'warning',
  collected: 'success',
  paid: 'success',
  bounced: 'destructive',
  endorsed: 'info',
  pledged: 'info',
  cancelled: 'muted',
}

export function instrumentStatusLabel(s: InstrumentStatus): string {
  return INSTRUMENT_STATUS_LABELS[s] ?? s
}

export function instrumentStatusTone(s: InstrumentStatus): BadgeTone {
  return INSTRUMENT_STATUS_TONES[s] ?? 'muted'
}

export type InstrumentActionKey =
  | 'depositForCollection'
  | 'collect'
  | 'pay'
  | 'reverse'
  | 'bounce'
  | 'endorse'
  | 'pledge'
  | 'cancel'

export interface InstrumentActionDef {
  key: InstrumentActionKey
  label: string
  icon: IconName
  permission: string
  variant: 'default' | 'outline' | 'destructive'
  /** collect/pay open the settle sub-form instead of firing immediately. */
  settle?: boolean
  /** Requires a confirm alert before firing (all except settle actions). */
  confirmMessage?: string
}

/** Returns the valid actions for the instrument's current (status, direction). */
export function getAvailableActions(
  status: InstrumentStatus,
  direction: InstrumentDirection,
): InstrumentActionDef[] {
  const actions: InstrumentActionDef[] = []

  if (direction === 'received') {
    if (status === 'open') {
      actions.push({
        key: 'depositForCollection',
        label: 'Tahsile Ver',
        icon: 'send',
        permission: FinancePermissions.instrumentsStatus,
        variant: 'outline',
      })
    }
    if (status === 'open' || status === 'in_collection') {
      actions.push({
        key: 'collect',
        label: 'Tahsil Et',
        icon: 'check-circle',
        permission: FinancePermissions.instrumentsSettle,
        variant: 'default',
        settle: true,
      })
      actions.push({
        key: 'bounce',
        label: 'Karşılıksız',
        icon: 'alert-triangle',
        permission: FinancePermissions.instrumentsStatus,
        variant: 'destructive',
        confirmMessage: 'Bu çek/senet karşılıksız olarak işaretlenecek. Devam edilsin mi?',
      })
    }
    // endorse/pledge/cancel: backend only allows these from 'open' (NOT
    // 'in_collection') — see financial-instruments.service.ts.
    if (status === 'open') {
      actions.push({
        key: 'endorse',
        label: 'Ciro Et',
        icon: 'repeat',
        permission: FinancePermissions.instrumentsStatus,
        variant: 'outline',
        confirmMessage: 'Bu çek/senet ciro edilecek. Devam edilsin mi?',
      })
      actions.push({
        key: 'pledge',
        label: 'Teminata Ver',
        icon: 'lock',
        permission: FinancePermissions.instrumentsStatus,
        variant: 'outline',
        confirmMessage: 'Bu çek/senet teminata verilecek. Devam edilsin mi?',
      })
      actions.push({
        key: 'cancel',
        label: 'İptal Et',
        icon: 'x-circle',
        permission: FinancePermissions.instrumentsStatus,
        variant: 'destructive',
        confirmMessage: 'Bu çek/senet kaydı iptal edilecek. Devam edilsin mi?',
      })
    }
    if (status === 'collected') {
      actions.push({
        key: 'reverse',
        label: 'Geri Al',
        icon: 'rotate-ccw',
        permission: FinancePermissions.instrumentsSettle,
        variant: 'outline',
        confirmMessage: 'Tahsilat geri alınacak; ilgili finans ve cari kayıtları silinecek. Devam edilsin mi?',
      })
    }
  } else {
    if (status === 'open') {
      actions.push({
        key: 'pay',
        label: 'Öde',
        icon: 'check-circle',
        permission: FinancePermissions.instrumentsSettle,
        variant: 'default',
        settle: true,
      })
      actions.push({
        key: 'bounce',
        label: 'Karşılıksız',
        icon: 'alert-triangle',
        permission: FinancePermissions.instrumentsStatus,
        variant: 'destructive',
        confirmMessage: 'Bu çek/senet karşılıksız olarak işaretlenecek. Devam edilsin mi?',
      })
      actions.push({
        key: 'cancel',
        label: 'İptal Et',
        icon: 'x-circle',
        permission: FinancePermissions.instrumentsStatus,
        variant: 'destructive',
        confirmMessage: 'Bu çek/senet kaydı iptal edilecek. Devam edilsin mi?',
      })
    }
    if (status === 'paid') {
      actions.push({
        key: 'reverse',
        label: 'Geri Al',
        icon: 'rotate-ccw',
        permission: FinancePermissions.instrumentsSettle,
        variant: 'outline',
        confirmMessage: 'Ödeme geri alınacak; ilgili finans ve cari kayıtları silinecek. Devam edilsin mi?',
      })
    }
  }

  return actions
}
