// Shared formatting helpers for the Üretim (production/manufacturing) screens —
// money + quantity formatting plus the Turkish label/tone maps for MO/WO/fason/
// planning/quality statuses. Mirrors orders/format.ts + stocktake/format.ts so
// every production screen stays visually consistent. Labels themselves live in
// @turbohesap/shared; here we only add the badge tones + a few icons.

import type { BadgeTone, IconName } from '../../components'
import {
  BOM_TYPE_LABELS,
  CONSUMPTION_POLICY_LABELS,
  PLANNING_REASON_LABELS,
  PRODUCTION_ORDER_STATUS_LABELS,
  PRODUCTION_PRIORITY_LABELS,
  QUALITY_RESULT_LABELS,
  QUALITY_TYPE_LABELS,
  SUBCONTRACT_DISPATCH_STATUS_LABELS,
  WORK_ORDER_STATUS_LABELS,
  type BomType,
  type PlanningRunStatus,
  type ProductionOrderStatus,
  type ProductionPriority,
  type QualityCheckResult,
  type SubcontractDispatchStatus,
  type WorkOrderStatus,
} from '@turbohesap/shared'

export function formatMoney(value: number, currency = 'TRY'): string {
  try {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency }).format(value ?? 0)
  } catch {
    return `${value ?? 0} ${currency}`
  }
}

/** Trim a quantity to a tidy string (3.0 → "3", 2.50 → "2,5"). */
export function formatQty(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '0'
  const rounded = Math.round(value * 1000) / 1000
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace('.', ',')
}

// ── Üretim Emri (manufacturing order) ────────────────────────────────────────
export const MO_STATUS_TONES: Record<ProductionOrderStatus, BadgeTone> = {
  draft: 'muted',
  confirmed: 'primary',
  in_progress: 'info',
  done: 'success',
  cancelled: 'destructive',
}

export const PRIORITY_TONES: Record<ProductionPriority, BadgeTone> = {
  low: 'muted',
  normal: 'default',
  high: 'warning',
  urgent: 'destructive',
}

// ── İş Emri (work order) ─────────────────────────────────────────────────────
export const WO_STATUS_TONES: Record<WorkOrderStatus, BadgeTone> = {
  pending: 'muted',
  ready: 'primary',
  in_progress: 'info',
  paused: 'warning',
  done: 'success',
  cancelled: 'destructive',
}

export const WO_STATUS_ICONS: Record<WorkOrderStatus, IconName> = {
  pending: 'clock',
  ready: 'play-circle',
  in_progress: 'activity',
  paused: 'pause-circle',
  done: 'check-circle',
  cancelled: 'x-circle',
}

// ── Fason (subcontract dispatch) ─────────────────────────────────────────────
export const SUBCONTRACT_STATUS_TONES: Record<SubcontractDispatchStatus, BadgeTone> = {
  draft: 'muted',
  sent: 'primary',
  received: 'success',
  cancelled: 'destructive',
}

// ── Planlama (planning run) ──────────────────────────────────────────────────
export const PLANNING_STATUS_TONES: Record<PlanningRunStatus, BadgeTone> = {
  draft: 'primary',
  applied: 'success',
  cancelled: 'destructive',
}

export const PLANNING_STATUS_LABELS: Record<PlanningRunStatus, string> = {
  draft: 'Taslak',
  applied: 'Uygulandı',
  cancelled: 'İptal',
}

// ── Kalite (quality check) ───────────────────────────────────────────────────
export const QUALITY_RESULT_TONES: Record<QualityCheckResult, BadgeTone> = {
  pass: 'success',
  fail: 'destructive',
}

// ── BOM type ─────────────────────────────────────────────────────────────────
export const BOM_TYPE_TONES: Record<BomType, BadgeTone> = {
  manufacture: 'primary',
  phantom: 'info',
  subcontract: 'warning',
}

export {
  BOM_TYPE_LABELS,
  CONSUMPTION_POLICY_LABELS,
  PLANNING_REASON_LABELS,
  PRODUCTION_ORDER_STATUS_LABELS,
  PRODUCTION_PRIORITY_LABELS,
  QUALITY_RESULT_LABELS,
  QUALITY_TYPE_LABELS,
  SUBCONTRACT_DISPATCH_STATUS_LABELS,
  WORK_ORDER_STATUS_LABELS,
}
