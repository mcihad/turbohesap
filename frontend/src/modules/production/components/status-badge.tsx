// Durum rozetleri — üretim modülündeki her durum makinesi için tutarlı ton
// eşlemeleri. Sıralı liste/board/detay ekranlarında tekrar kullanılır.

import {
  PLANNING_REASON_LABELS,
  PRODUCTION_ORDER_STATUS_LABELS,
  PRODUCTION_PRIORITY_LABELS,
  QUALITY_RESULT_LABELS,
  SUBCONTRACT_DISPATCH_STATUS_LABELS,
  WORK_ORDER_STATUS_LABELS,
  type PlanningRunStatus,
  type PlanningSuggestionReason,
  type PlanningSuggestionType,
  type ProductionOrderStatus,
  type ProductionPriority,
  type QualityCheckResult,
  type SubcontractDispatchStatus,
  type WorkOrderStatus,
} from '@turbohesap/shared'

import { Badge } from '@/components/ui/badge'

type Tone = 'default' | 'secondary' | 'outline' | 'success' | 'info' | 'warning' | 'destructive'

const MO_STATUS_TONE: Record<ProductionOrderStatus, Tone> = {
  draft: 'outline',
  confirmed: 'info',
  in_progress: 'warning',
  done: 'success',
  cancelled: 'destructive',
}

const WO_STATUS_TONE: Record<WorkOrderStatus, Tone> = {
  pending: 'outline',
  ready: 'info',
  in_progress: 'warning',
  paused: 'secondary',
  done: 'success',
  cancelled: 'destructive',
}

const SUBCONTRACT_STATUS_TONE: Record<SubcontractDispatchStatus, Tone> = {
  draft: 'outline',
  sent: 'info',
  received: 'success',
  cancelled: 'destructive',
}

const PRIORITY_TONE: Record<ProductionPriority, Tone> = {
  low: 'outline',
  normal: 'secondary',
  high: 'warning',
  urgent: 'destructive',
}

const PLANNING_RUN_TONE: Record<PlanningRunStatus, Tone> = {
  draft: 'outline',
  applied: 'success',
  cancelled: 'destructive',
}

const PLANNING_RUN_STATUS_LABELS: Record<PlanningRunStatus, string> = {
  draft: 'Taslak',
  applied: 'Uygulandı',
  cancelled: 'İptal',
}

export function PlanningRunBadge({ status }: { status: PlanningRunStatus }) {
  return <Badge variant={PLANNING_RUN_TONE[status]}>{PLANNING_RUN_STATUS_LABELS[status]}</Badge>
}

export function MoStatusBadge({ status }: { status: ProductionOrderStatus }) {
  return <Badge variant={MO_STATUS_TONE[status]}>{PRODUCTION_ORDER_STATUS_LABELS[status]}</Badge>
}

export function WoStatusBadge({ status }: { status: WorkOrderStatus }) {
  return <Badge variant={WO_STATUS_TONE[status]}>{WORK_ORDER_STATUS_LABELS[status]}</Badge>
}

export function SubcontractStatusBadge({ status }: { status: SubcontractDispatchStatus }) {
  return (
    <Badge variant={SUBCONTRACT_STATUS_TONE[status]}>
      {SUBCONTRACT_DISPATCH_STATUS_LABELS[status]}
    </Badge>
  )
}

export function PriorityBadge({ priority }: { priority: ProductionPriority }) {
  if (priority === 'normal') return <span className="text-muted-foreground">—</span>
  return <Badge variant={PRIORITY_TONE[priority]}>{PRODUCTION_PRIORITY_LABELS[priority]}</Badge>
}

export function QualityResultBadge({ result }: { result: QualityCheckResult }) {
  return (
    <Badge variant={result === 'pass' ? 'success' : 'destructive'}>
      {QUALITY_RESULT_LABELS[result]}
    </Badge>
  )
}

export function SuggestionTypeBadge({ type }: { type: PlanningSuggestionType }) {
  return (
    <Badge variant={type === 'manufacture' ? 'info' : 'secondary'}>
      {type === 'manufacture' ? 'Üretim' : 'Satınalma'}
    </Badge>
  )
}

export function SuggestionReasonBadge({ reason }: { reason: PlanningSuggestionReason }) {
  return <Badge variant="outline">{PLANNING_REASON_LABELS[reason]}</Badge>
}
