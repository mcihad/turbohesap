// Kalite kontrol — operasyon/mamul bazlı geç/kal kaydı. qualityCheckRequired olan
// bir İş Emri, geçen (pass) bir kalite kaydı olmadan bitirilemez.

export type QualityCheckResult = 'pass' | 'fail'
export type QualityCheckType = 'operation' | 'final' | 'incoming'

export const QUALITY_RESULT_LABELS: Record<QualityCheckResult, string> = {
  pass: 'Geçti',
  fail: 'Kaldı',
}
export const QUALITY_TYPE_LABELS: Record<QualityCheckType, string> = {
  operation: 'Operasyon',
  final: 'Nihai Mamul',
  incoming: 'Girdi Kontrol',
}

export interface QualityCheckDto {
  id: string
  manufacturingOrderId: string
  manufacturingOrderNo: string
  workOrderId: string | null
  operationId: string | null
  checkType: QualityCheckType
  result: QualityCheckResult
  inspectedQuantity: number
  passedQuantity: number
  rejectedQuantity: number
  inspectorEmployeeId: string | null
  notes: string | null
  checkedAt: string
  createdAt: string
}

export interface RecordQualityCheckRequest {
  manufacturingOrderId: string
  workOrderId?: string | null
  operationId?: string | null
  checkType?: QualityCheckType
  result: QualityCheckResult
  inspectedQuantity?: number
  passedQuantity?: number
  rejectedQuantity?: number
  inspectorEmployeeId?: string | null
  notes?: string | null
}

export interface QualityCheckListQuery {
  manufacturingOrderId?: string
  workOrderId?: string
  result?: QualityCheckResult
}
