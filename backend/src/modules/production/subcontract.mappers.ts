import type {
  SubcontractDispatchDto,
  SubcontractDispatchLineDto,
} from '@turbohesap/shared'

import type { SubcontractDispatch } from './entities/subcontract-dispatch.entity'
import type { SubcontractDispatchLine } from './entities/subcontract-dispatch-line.entity'
import type { NameRef } from './production.mappers'

export function toDispatchLineDto(l: SubcontractDispatchLine, products: Map<string, NameRef>): SubcontractDispatchLineDto {
  const ref = products.get(l.componentProductId)
  return {
    id: l.id,
    componentProductId: l.componentProductId,
    componentVariantId: l.componentVariantId,
    componentName: ref?.name ?? '',
    componentCode: ref?.code ?? '',
    sentQuantity: l.sentQuantity,
    returnedQuantity: l.returnedQuantity,
    atSubcontractor: l.sentQuantity - l.returnedQuantity,
    unit: l.unit,
    sortOrder: l.sortOrder,
  }
}

export function toSubcontractDispatchDto(
  d: SubcontractDispatch,
  parts: { lines: SubcontractDispatchLine[]; products: Map<string, NameRef>; manufacturingOrderNo: string; contactName: string },
): SubcontractDispatchDto {
  return {
    id: d.id,
    dispatchNo: d.dispatchNo,
    manufacturingOrderId: d.manufacturingOrderId,
    manufacturingOrderNo: parts.manufacturingOrderNo,
    contactId: d.contactId,
    contactName: parts.contactName,
    dispatchDate: d.dispatchDate,
    expectedReturnDate: d.expectedReturnDate,
    status: d.status,
    serviceCost: d.serviceCost,
    currency: d.currency,
    notes: d.notes,
    lines: parts.lines
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((l) => toDispatchLineDto(l, parts.products)),
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }
}
