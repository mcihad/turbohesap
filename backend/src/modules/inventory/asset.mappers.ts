import type {
  AssetAssignmentDto,
  AssetDto,
  AssetMaintenanceDto,
  AssetSummary,
  AssetTransferDto,
  AssetVehicleLogDto,
} from '@turbohesap/shared'

import type { Employee } from '../hr/entities/employee.entity'
import { Asset } from './entities/asset.entity'
import { AssetAssignment } from './entities/asset-assignment.entity'
import { AssetMaintenance } from './entities/asset-maintenance.entity'
import { AssetTransfer } from './entities/asset-transfer.entity'
import { AssetVehicleLog } from './entities/asset-vehicle-log.entity'

const iso = (d: Date | null | undefined): string | null =>
  d ? d.toISOString() : null

// Compose a personel display name from an Employee entity.
export function employeeDisplayName(e: Pick<Employee, 'firstName' | 'lastName'>): string {
  return `${e.firstName} ${e.lastName}`.trim()
}

export function toAssetSummary(a: Asset): AssetSummary {
  return {
    id: a.id,
    code: a.code,
    name: a.name,
    assetTypeKey: a.assetTypeKey,
    status: a.status,
    isVehicle: a.isVehicle,
    plate: a.plate,
  }
}

export function toAssetDto(a: Asset): AssetDto {
  return {
    id: a.id,
    code: a.code,
    name: a.name,
    assetTypeKey: a.assetTypeKey,
    barcode: a.barcode,
    serialNo: a.serialNo,
    brand: a.brand,
    model: a.model,
    purchaseDate: a.purchaseDate,
    purchaseValue: a.purchaseValue,
    currency: a.currency,
    supplierContactId: a.supplierContactId,
    warrantyEnd: a.warrantyEnd,
    branchId: a.branchId,
    status: a.status,
    statusReason: a.statusReason,
    statusNote: a.statusNote,
    statusChangedAt: iso(a.statusChangedAt),
    currentEmployeeId: a.currentEmployeeId,
    currentEmployeeName: a.currentEmployeeName,
    currentAssignmentId: a.currentAssignmentId,
    isVehicle: a.isVehicle,
    plate: a.plate,
    chassisNo: a.chassisNo,
    engineNo: a.engineNo,
    modelYear: a.modelYear,
    fuelTypeKey: a.fuelTypeKey,
    currentOdometer: a.currentOdometer,
    notes: a.notes,
    isActive: a.isActive,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }
}

export function toAssignmentDto(
  r: AssetAssignment,
  asset: AssetSummary | null = null,
): AssetAssignmentDto {
  return {
    id: r.id,
    assetId: r.assetId,
    asset,
    employeeId: r.employeeId,
    employeeName: r.employeeName,
    status: r.status,
    assignedById: r.assignedById,
    assignedByName: r.assignedByName,
    assignedAt: r.assignedAt.toISOString(),
    returnedAt: iso(r.returnedAt),
    transferId: r.transferId,
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }
}

export function toTransferDto(
  r: AssetTransfer,
  asset: AssetSummary | null = null,
): AssetTransferDto {
  return {
    id: r.id,
    assetId: r.assetId,
    asset,
    status: r.status,
    fromEmployeeId: r.fromEmployeeId,
    fromEmployeeName: r.fromEmployeeName,
    toEmployeeId: r.toEmployeeId,
    toEmployeeName: r.toEmployeeName,
    acceptedByEmployeeId: r.acceptedByEmployeeId,
    acceptedByEmployeeName: r.acceptedByEmployeeName,
    initiatedById: r.initiatedById,
    initiatedByName: r.initiatedByName,
    token: r.token,
    expiresAt: iso(r.expiresAt),
    acceptedAt: iso(r.acceptedAt),
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }
}

export function toMaintenanceDto(
  r: AssetMaintenance,
  asset: AssetSummary | null = null,
): AssetMaintenanceDto {
  return {
    id: r.id,
    assetId: r.assetId,
    asset,
    type: r.type,
    status: r.status,
    date: r.date,
    cost: r.cost,
    currency: r.currency,
    vendorContactId: r.vendorContactId,
    odometer: r.odometer,
    description: r.description,
    nextDueDate: r.nextDueDate,
    nextDueOdometer: r.nextDueOdometer,
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }
}

export function toVehicleLogDto(
  r: AssetVehicleLog,
  asset: AssetSummary | null = null,
): AssetVehicleLogDto {
  return {
    id: r.id,
    assetId: r.assetId,
    asset,
    kind: r.kind,
    date: r.date,
    odometer: r.odometer,
    liters: r.liters,
    unitPrice: r.unitPrice,
    totalCost: r.totalCost,
    currency: r.currency,
    fuelTypeKey: r.fuelTypeKey,
    isFull: r.isFull,
    station: r.station,
    driverEmployeeId: r.driverEmployeeId,
    driverEmployeeName: r.driverEmployeeName,
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }
}
