// Üretim Emri (Manufacturing Order) — bir mamulü belirli miktarda üretmek için
// açılan emir. Onaylandığında reçete patlatılır: bileşenler snapshot'lanır +
// rezerve edilir, operasyonlardan İş Emirleri (Work Order) üretilir. Tamamlanınca
// bileşenler sarf edilir (stok çıkış), mamul girişi yapılır (stok giriş) ve maliyet
// hesaplanır (AVCO rollup). İptalde tüm stok hareketleri geri alınır.

import type { WorkOrderDto } from './work-order.dto'

export type ProductionOrderStatus =
  | 'draft'
  | 'confirmed'
  | 'in_progress'
  | 'done'
  | 'cancelled'

export const PRODUCTION_ORDER_STATUS_LABELS: Record<ProductionOrderStatus, string> = {
  draft: 'Taslak',
  confirmed: 'Onaylandı',
  in_progress: 'Üretimde',
  done: 'Tamamlandı',
  cancelled: 'İptal',
}

// Make-to-stock (stoğa) / Make-to-order (siparişe).
export type ProductionSourceMode = 'mts' | 'mto'

export type ProductionOrderType = 'standard' | 'subcontract'

// Bileşen tüketim modu: backflush (otomatik, mamul girişinde) / manual (elle bildir).
export type ConsumptionMode = 'backflush' | 'manual'

export type ProductionPriority = 'low' | 'normal' | 'high' | 'urgent'
export const PRODUCTION_PRIORITY_LABELS: Record<ProductionPriority, string> = {
  low: 'Düşük',
  normal: 'Normal',
  high: 'Yüksek',
  urgent: 'Acil',
}

export interface ManufacturingOrderComponentDto {
  id: string
  componentProductId: string
  componentVariantId: string | null
  componentName: string
  componentCode: string
  /** Required for the planned quantity (BOM × qty × (1+scrap), phantom-exploded). */
  requiredQuantity: number
  reservedQuantity: number
  consumedQuantity: number
  unit: string
  scrapRate: number
  operationId: string | null
  consumptionType: 'auto' | 'manual'
  isOptional: boolean
  /** Branch the component is consumed from. */
  sourceBranchId: string | null
  /** AVCO unit cost captured at consumption. */
  unitCost: number | null
  totalCost: number | null
}

export interface ManufacturingOrderByproductDto {
  id: string
  productId: string
  variantId: string | null
  productName: string
  /** Expected (per BOM, scaled). */
  quantity: number
  /** Actually produced/received into stock. */
  producedQuantity: number
  unit: string
  costShareRate: number
  unitCost: number | null
}

export interface ManufacturingOrderDto {
  id: string
  orderNo: string
  productId: string
  variantId: string | null
  productName: string
  productCode: string
  bomId: string | null
  bomCode: string | null
  bomVersion: number | null
  type: ProductionOrderType
  sourceMode: ProductionSourceMode
  salesOrderLineId: string | null
  plannedQuantity: number
  producedQuantity: number
  scrappedQuantity: number
  unit: string
  status: ProductionOrderStatus
  priority: ProductionPriority
  componentSourceBranchId: string | null
  targetBranchId: string | null
  wipBranchId: string | null
  subcontractorContactId: string | null
  consumptionMode: ConsumptionMode
  plannedStartDate: string | null
  plannedEndDate: string | null
  actualStartDate: string | null
  actualEndDate: string | null
  dueDate: string | null
  responsibleEmployeeId: string | null
  // Cost snapshot (computed on complete). Standard = planned at confirm; actual = on done.
  stdMaterialCost: number
  stdOperationCost: number
  stdOverheadCost: number
  actualMaterialCost: number
  actualOperationCost: number
  actualOverheadCost: number
  /** Fason işçilik ücreti (subcontract MO) — operasyon maliyetine dahil. */
  subcontractServiceCost: number
  byproductCredit: number
  totalCost: number
  unitCost: number
  currency: string
  notes: string | null
  components: ManufacturingOrderComponentDto[]
  byproducts: ManufacturingOrderByproductDto[]
  workOrders: WorkOrderDto[]
  createdAt: string
  updatedAt: string
}

export interface ManufacturingOrderSummary {
  id: string
  orderNo: string
  productId: string
  productName: string
  plannedQuantity: number
  producedQuantity: number
  unit: string
  status: ProductionOrderStatus
  priority: ProductionPriority
  dueDate: string | null
}

// ── Create / update ────────────────────────────────────────────────────────────

export interface CreateManufacturingOrderRequest {
  productId: string
  variantId?: string | null
  /** Optional — when omitted the active BOM for the product/variant is used. */
  bomId?: string | null
  plannedQuantity: number
  unit?: string
  type?: ProductionOrderType
  sourceMode?: ProductionSourceMode
  salesOrderLineId?: string | null
  componentSourceBranchId?: string | null
  targetBranchId?: string | null
  wipBranchId?: string | null
  subcontractorContactId?: string | null
  consumptionMode?: ConsumptionMode
  priority?: ProductionPriority
  plannedStartDate?: string | null
  plannedEndDate?: string | null
  dueDate?: string | null
  responsibleEmployeeId?: string | null
  notes?: string | null
}

export type UpdateManufacturingOrderRequest = Partial<
  Omit<CreateManufacturingOrderRequest, 'productId'>
>

// Tamamlama: üretilen miktar + (manuel modda) gerçek bileşen tüketimi + yan ürün.
export interface CompleteManufacturingOrderRequest {
  producedQuantity: number
  scrappedQuantity?: number
  date?: string
  /** Override consumption per component (manual mode or partial). */
  componentConsumptions?: Array<{ componentId: string; consumedQuantity: number }>
  /** Actual by-product output. */
  byproductOutputs?: Array<{ byproductId: string; quantity: number }>
  notes?: string | null
}

// Make-to-order: bir satış talebinden (sipariş satırı) doğrudan Üretim Emri üret.
export interface CreateFromDemandRequest {
  productId: string
  variantId?: string | null
  quantity: number
  salesOrderLineId?: string | null
  bomId?: string | null
  targetBranchId?: string | null
  componentSourceBranchId?: string | null
  dueDate?: string | null
  priority?: ProductionPriority
  notes?: string | null
}

export interface ManufacturingOrderListQuery {
  status?: ProductionOrderStatus
  productId?: string
  type?: ProductionOrderType
  sourceMode?: ProductionSourceMode
  branchId?: string
  search?: string
  from?: string
  to?: string
}
