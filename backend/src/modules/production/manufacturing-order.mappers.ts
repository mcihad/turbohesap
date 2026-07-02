import type {
  ManufacturingOrderByproductDto,
  ManufacturingOrderComponentDto,
  ManufacturingOrderDto,
  ManufacturingOrderSummary,
  WorkOrderDto,
  WorkOrderTimeLogDto,
} from '@turbohesap/shared'

import type { ProductionOrder } from './entities/production-order.entity'
import type { ProductionOrderComponent } from './entities/production-order-component.entity'
import type { ProductionOrderByproduct } from './entities/production-order-byproduct.entity'
import type { WorkOrder } from './entities/work-order.entity'
import type { WorkOrderTimeLog } from './entities/work-order-time-log.entity'
import type { NameRef } from './production.mappers'

export function toComponentDto(
  c: ProductionOrderComponent,
  products: Map<string, NameRef>,
): ManufacturingOrderComponentDto {
  const ref = products.get(c.componentProductId)
  return {
    id: c.id,
    componentProductId: c.componentProductId,
    componentVariantId: c.componentVariantId,
    componentName: ref?.name ?? '',
    componentCode: ref?.code ?? '',
    requiredQuantity: c.requiredQuantity,
    reservedQuantity: c.reservedQuantity,
    consumedQuantity: c.consumedQuantity,
    unit: c.unit,
    scrapRate: c.scrapRate,
    operationId: c.operationId,
    consumptionType: c.consumptionType,
    isOptional: c.isOptional,
    sourceBranchId: c.sourceBranchId,
    unitCost: c.unitCost,
    totalCost: c.totalCost,
  }
}

export function toByproductDto(
  b: ProductionOrderByproduct,
  products: Map<string, NameRef>,
): ManufacturingOrderByproductDto {
  return {
    id: b.id,
    productId: b.productId,
    variantId: b.variantId,
    productName: products.get(b.productId)?.name ?? '',
    quantity: b.quantity,
    producedQuantity: b.producedQuantity,
    unit: b.unit,
    costShareRate: b.costShareRate,
    unitCost: b.unitCost,
  }
}

export function toWorkOrderTimeLogDto(l: WorkOrderTimeLog): WorkOrderTimeLogDto {
  return {
    id: l.id,
    workOrderId: l.workOrderId,
    employeeId: l.employeeId,
    startedAt: l.startedAt.toISOString(),
    endedAt: l.endedAt ? l.endedAt.toISOString() : null,
    durationMinutes: l.durationMinutes,
    note: l.note,
  }
}

export function toWorkOrderDto(
  w: WorkOrder,
  ctx: {
    manufacturingOrderNo: string
    productName: string
    workCenterName: string
    timeLogs: WorkOrderTimeLog[]
  },
): WorkOrderDto {
  return {
    id: w.id,
    manufacturingOrderId: w.manufacturingOrderId,
    manufacturingOrderNo: ctx.manufacturingOrderNo,
    productName: ctx.productName,
    operationId: w.operationId,
    sequence: w.sequence,
    name: w.name,
    workCenterId: w.workCenterId,
    workCenterName: ctx.workCenterName,
    status: w.status,
    plannedQuantity: w.plannedQuantity,
    producedQuantity: w.producedQuantity,
    rejectedQuantity: w.rejectedQuantity,
    unit: w.unit,
    plannedSetupMinutes: w.plannedSetupMinutes,
    plannedRunMinutes: w.plannedRunMinutes,
    actualMinutes: w.actualMinutes,
    assignedEmployeeId: w.assignedEmployeeId,
    startedAt: w.startedAt ? w.startedAt.toISOString() : null,
    finishedAt: w.finishedAt ? w.finishedAt.toISOString() : null,
    qualityCheckRequired: w.qualityCheckRequired,
    notes: w.notes,
    timeLogs: ctx.timeLogs
      .slice()
      .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())
      .map(toWorkOrderTimeLogDto),
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
  }
}

export function toManufacturingOrderDto(
  o: ProductionOrder,
  parts: {
    components: ProductionOrderComponent[]
    byproducts: ProductionOrderByproduct[]
    workOrders: WorkOrderDto[]
    products: Map<string, NameRef>
  },
): ManufacturingOrderDto {
  const product = parts.products.get(o.productId)
  return {
    id: o.id,
    orderNo: o.orderNo,
    productId: o.productId,
    variantId: o.variantId,
    productName: product?.name ?? '',
    productCode: product?.code ?? '',
    bomId: o.bomId,
    bomCode: o.bomCode,
    bomVersion: o.bomVersion,
    type: o.type,
    sourceMode: o.sourceMode,
    salesOrderLineId: o.salesOrderLineId,
    plannedQuantity: o.plannedQuantity,
    producedQuantity: o.producedQuantity,
    scrappedQuantity: o.scrappedQuantity,
    unit: o.unit,
    status: o.status,
    priority: o.priority,
    componentSourceBranchId: o.componentSourceBranchId,
    targetBranchId: o.targetBranchId,
    wipBranchId: o.wipBranchId,
    subcontractorContactId: o.subcontractorContactId,
    consumptionMode: o.consumptionMode,
    plannedStartDate: o.plannedStartDate,
    plannedEndDate: o.plannedEndDate,
    actualStartDate: o.actualStartDate ? o.actualStartDate.toISOString() : null,
    actualEndDate: o.actualEndDate ? o.actualEndDate.toISOString() : null,
    dueDate: o.dueDate,
    responsibleEmployeeId: o.responsibleEmployeeId,
    stdMaterialCost: o.stdMaterialCost,
    stdOperationCost: o.stdOperationCost,
    stdOverheadCost: o.stdOverheadCost,
    actualMaterialCost: o.actualMaterialCost,
    actualOperationCost: o.actualOperationCost,
    actualOverheadCost: o.actualOverheadCost,
    subcontractServiceCost: o.subcontractServiceCost,
    byproductCredit: o.byproductCredit,
    totalCost: o.totalCost,
    unitCost: o.unitCost,
    currency: o.currency,
    notes: o.notes,
    components: parts.components
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => toComponentDto(c, parts.products)),
    byproducts: parts.byproducts
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((b) => toByproductDto(b, parts.products)),
    workOrders: parts.workOrders.slice().sort((a, b) => a.sequence - b.sequence),
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  }
}

export function toManufacturingOrderSummary(o: ProductionOrder, productName: string): ManufacturingOrderSummary {
  return {
    id: o.id,
    orderNo: o.orderNo,
    productId: o.productId,
    productName,
    plannedQuantity: o.plannedQuantity,
    producedQuantity: o.producedQuantity,
    unit: o.unit,
    status: o.status,
    priority: o.priority,
    dueDate: o.dueDate,
  }
}
