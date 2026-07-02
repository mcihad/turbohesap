import type {
  BomByproductDto,
  BomComponentDto,
  BomDto,
  BomOperationDto,
  BomSummary,
  WorkCenterDto,
  WorkCenterSummary,
} from '@turbohesap/shared'

import type { WorkCenter } from './entities/work-center.entity'
import type { Bom } from './entities/bom.entity'
import type { BomComponent } from './entities/bom-component.entity'
import type { BomByproduct } from './entities/bom-byproduct.entity'
import type { BomOperation } from './entities/bom-operation.entity'

// Compact reference {id → {name, code}} for products, etc.
export interface NameRef {
  name: string
  code: string
}

export function toWorkCenterDto(w: WorkCenter): WorkCenterDto {
  return {
    id: w.id,
    code: w.code,
    name: w.name,
    branchId: w.branchId,
    costPerHour: w.costPerHour,
    setupCostPerHour: w.setupCostPerHour,
    currency: w.currency,
    capacityPerHour: w.capacityPerHour,
    parallelCapacity: w.parallelCapacity,
    efficiencyRate: w.efficiencyRate,
    setupTimeMinutes: w.setupTimeMinutes,
    cleanupTimeMinutes: w.cleanupTimeMinutes,
    alternateWorkCenterId: w.alternateWorkCenterId,
    costAccountCode: w.costAccountCode,
    isActive: w.isActive,
    notes: w.notes,
    createdAt: w.createdAt.toISOString(),
    updatedAt: w.updatedAt.toISOString(),
  }
}

export function toWorkCenterSummary(w: WorkCenter): WorkCenterSummary {
  return { id: w.id, code: w.code, name: w.name, costPerHour: w.costPerHour }
}

export function toBomSummary(b: Bom): BomSummary {
  return { id: b.id, code: b.code, name: b.name, productId: b.productId, type: b.type, version: b.version, isActive: b.isActive }
}

function toComponentDto(c: BomComponent, products: Map<string, NameRef>): BomComponentDto {
  const ref = products.get(c.componentProductId)
  return {
    id: c.id,
    componentProductId: c.componentProductId,
    componentVariantId: c.componentVariantId,
    componentName: ref?.name ?? '',
    componentCode: ref?.code ?? '',
    quantity: c.quantity,
    unit: c.unit,
    scrapRate: c.scrapRate,
    operationId: c.operationId,
    consumptionType: c.consumptionType,
    isOptional: c.isOptional,
    applyOnVariantId: c.applyOnVariantId,
    notes: c.notes,
    sortOrder: c.sortOrder,
  }
}

function toByproductDto(b: BomByproduct, products: Map<string, NameRef>): BomByproductDto {
  return {
    id: b.id,
    productId: b.productId,
    variantId: b.variantId,
    productName: products.get(b.productId)?.name ?? '',
    quantity: b.quantity,
    unit: b.unit,
    costShareRate: b.costShareRate,
    sortOrder: b.sortOrder,
  }
}

function toOperationDto(o: BomOperation, workCenters: Map<string, string>): BomOperationDto {
  return {
    id: o.id,
    sequence: o.sequence,
    name: o.name,
    workCenterId: o.workCenterId,
    workCenterName: workCenters.get(o.workCenterId) ?? '',
    setupTimeMinutes: o.setupTimeMinutes,
    timePerUnitMinutes: o.timePerUnitMinutes,
    timeBasis: o.timeBasis,
    instructions: o.instructions,
    qualityCheckRequired: o.qualityCheckRequired,
    sortOrder: o.sortOrder,
  }
}

export function toBomDto(
  b: Bom,
  parts: {
    components: BomComponent[]
    byproducts: BomByproduct[]
    operations: BomOperation[]
    products: Map<string, NameRef>
    workCenters: Map<string, string>
  },
): BomDto {
  const product = parts.products.get(b.productId)
  return {
    id: b.id,
    productId: b.productId,
    variantId: b.variantId,
    productName: product?.name ?? '',
    productCode: product?.code ?? '',
    code: b.code,
    name: b.name,
    type: b.type,
    outputQuantity: b.outputQuantity,
    unit: b.unit,
    version: b.version,
    revision: b.revision,
    validFrom: b.validFrom,
    validTo: b.validTo,
    consumptionPolicy: b.consumptionPolicy,
    manufLeadTimeDays: b.manufLeadTimeDays,
    isActive: b.isActive,
    notes: b.notes,
    components: parts.components
      .slice()
      .sort((x, y) => x.sortOrder - y.sortOrder)
      .map((c) => toComponentDto(c, parts.products)),
    byproducts: parts.byproducts
      .slice()
      .sort((x, y) => x.sortOrder - y.sortOrder)
      .map((x) => toByproductDto(x, parts.products)),
    operations: parts.operations
      .slice()
      .sort((x, y) => x.sequence - y.sequence)
      .map((o) => toOperationDto(o, parts.workCenters)),
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  }
}
