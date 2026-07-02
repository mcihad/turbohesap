// İş Emri (Work Order) — bir Üretim Emrinin tek bir operasyonu (reçete rota adımı).
// Saha terminalinde başlat/duraklat/devam/bitir akışıyla yürütülür; her aktif
// aralık bir zaman logu (WorkOrderTimeLog) üretir. Gerçek süre × iş merkezi saat
// ücreti = operasyon maliyeti (maliyet rollup'ında kullanılır).

export type WorkOrderStatus =
  | 'pending'
  | 'ready'
  | 'in_progress'
  | 'paused'
  | 'done'
  | 'cancelled'

export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  pending: 'Bekliyor',
  ready: 'Hazır',
  in_progress: 'Çalışıyor',
  paused: 'Duraklatıldı',
  done: 'Tamamlandı',
  cancelled: 'İptal',
}

export interface WorkOrderTimeLogDto {
  id: string
  workOrderId: string
  employeeId: string | null
  startedAt: string
  endedAt: string | null
  durationMinutes: number
  note: string | null
}

export interface WorkOrderDto {
  id: string
  manufacturingOrderId: string
  manufacturingOrderNo: string
  productName: string
  operationId: string | null
  sequence: number
  name: string
  workCenterId: string
  workCenterName: string
  status: WorkOrderStatus
  plannedQuantity: number
  producedQuantity: number
  rejectedQuantity: number
  unit: string
  plannedSetupMinutes: number
  plannedRunMinutes: number
  actualMinutes: number
  assignedEmployeeId: string | null
  startedAt: string | null
  finishedAt: string | null
  qualityCheckRequired: boolean
  notes: string | null
  timeLogs: WorkOrderTimeLogDto[]
  createdAt: string
  updatedAt: string
}

export interface WorkOrderSummary {
  id: string
  manufacturingOrderId: string
  manufacturingOrderNo: string
  sequence: number
  name: string
  workCenterName: string
  status: WorkOrderStatus
  plannedQuantity: number
  producedQuantity: number
  unit: string
}

// ── Shop-floor actions ───────────────────────────────────────────────────────

export interface StartWorkOrderRequest {
  employeeId?: string | null
  note?: string | null
}

export interface FinishWorkOrderRequest {
  producedQuantity: number
  rejectedQuantity?: number
  note?: string | null
}

export interface WorkOrderListQuery {
  manufacturingOrderId?: string
  workCenterId?: string
  status?: WorkOrderStatus
  assignedEmployeeId?: string
}
