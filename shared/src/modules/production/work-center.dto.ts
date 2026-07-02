// İş Merkezi (Work Center / istasyon) — makine+işçilik kapasitesi ve saat ücreti.
// Operasyon süresi × costPerHour = operasyon maliyeti (maliyet rollup'ında).

export interface WorkCenterDto {
  id: string
  code: string
  name: string
  branchId: string | null
  /** Blended labor+machine rate per hour (operation cost basis). */
  costPerHour: number
  /** Optional distinct setup rate per hour. */
  setupCostPerHour: number | null
  currency: string
  /** Throughput units/hour (planning). */
  capacityPerHour: number | null
  /** How many work orders can run at once. */
  parallelCapacity: number
  /** Time-efficiency / OEE factor (1 = nominal; <1 inflates planned time). */
  efficiencyRate: number
  setupTimeMinutes: number
  cleanupTimeMinutes: number
  /** Fallback when overloaded. */
  alternateWorkCenterId: string | null
  /** Cost account code for future GL posting. */
  costAccountCode: string | null
  isActive: boolean
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface WorkCenterSummary {
  id: string
  code: string
  name: string
  costPerHour: number
}

export interface CreateWorkCenterRequest {
  code?: string
  name: string
  branchId?: string | null
  costPerHour?: number
  setupCostPerHour?: number | null
  currency?: string
  capacityPerHour?: number | null
  parallelCapacity?: number
  efficiencyRate?: number
  setupTimeMinutes?: number
  cleanupTimeMinutes?: number
  alternateWorkCenterId?: string | null
  costAccountCode?: string | null
  isActive?: boolean
  notes?: string | null
}

export type UpdateWorkCenterRequest = Partial<CreateWorkCenterRequest>

export interface WorkCenterListQuery {
  branchId?: string
  isActive?: boolean
}
