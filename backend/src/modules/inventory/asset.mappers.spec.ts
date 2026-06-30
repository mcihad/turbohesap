import {
  employeeDisplayName,
  toAssetDto,
  toAssetSummary,
  toAssignmentDto,
  toTransferDto,
  toVehicleLogDto,
} from './asset.mappers'
import type { Asset } from './entities/asset.entity'
import type { AssetAssignment } from './entities/asset-assignment.entity'
import type { AssetTransfer } from './entities/asset-transfer.entity'
import type { AssetVehicleLog } from './entities/asset-vehicle-log.entity'

const NOW = new Date('2026-01-01T00:00:00.000Z')

const asset = {
  id: 'a1',
  code: 'DMB-0001',
  name: 'Forklift',
  assetTypeKey: 'arac',
  barcode: 'BC-1',
  serialNo: 'SN-1',
  brand: 'Toyota',
  model: '8FBE',
  purchaseDate: '2025-06-01',
  purchaseValue: 250000,
  currency: 'TRY',
  supplierContactId: null,
  warrantyEnd: null,
  branchId: null,
  status: 'zimmetli',
  statusReason: null,
  statusNote: null,
  statusChangedAt: null,
  currentEmployeeId: 'e1',
  currentEmployeeName: 'Ali Veli',
  currentAssignmentId: 'as1',
  isVehicle: true,
  plate: '34 ABC 34',
  chassisNo: 'CH-1',
  engineNo: 'EN-1',
  modelYear: 2025,
  fuelTypeKey: 'dizel',
  currentOdometer: 1234.5,
  notes: null,
  isActive: true,
  createdAt: NOW,
  updatedAt: NOW,
} as unknown as Asset

describe('asset mappers', () => {
  it('employeeDisplayName composes and trims', () => {
    expect(employeeDisplayName({ firstName: 'Ali', lastName: 'Veli' })).toBe('Ali Veli')
    expect(employeeDisplayName({ firstName: 'Ali', lastName: '' })).toBe('Ali')
  })

  it('toAssetSummary picks the compact fields incl. vehicle/plate', () => {
    expect(toAssetSummary(asset)).toEqual({
      id: 'a1',
      code: 'DMB-0001',
      name: 'Forklift',
      assetTypeKey: 'arac',
      status: 'zimmetli',
      isVehicle: true,
      plate: '34 ABC 34',
    })
  })

  it('toAssetDto passes through value/odometer and ISO-formats timestamps', () => {
    const dto = toAssetDto(asset)
    expect(dto.purchaseValue).toBe(250000)
    expect(dto.currentOdometer).toBe(1234.5)
    expect(dto.currentEmployeeName).toBe('Ali Veli')
    expect(dto.statusChangedAt).toBeNull()
    expect(dto.createdAt).toBe(NOW.toISOString())
  })

  it('toAssetDto keeps statusChangedAt as ISO when set', () => {
    const dto = toAssetDto({ ...asset, statusChangedAt: NOW } as Asset)
    expect(dto.statusChangedAt).toBe(NOW.toISOString())
  })

  it('toAssignmentDto embeds the asset summary and formats dates', () => {
    const row = {
      id: 'as1',
      assetId: 'a1',
      employeeId: 'e1',
      employeeName: 'Ali Veli',
      status: 'active',
      assignedById: 'u1',
      assignedByName: 'admin',
      assignedAt: NOW,
      returnedAt: null,
      transferId: null,
      notes: null,
      createdAt: NOW,
      updatedAt: NOW,
    } as unknown as AssetAssignment
    const dto = toAssignmentDto(row, toAssetSummary(asset))
    expect(dto.asset?.code).toBe('DMB-0001')
    expect(dto.assignedAt).toBe(NOW.toISOString())
    expect(dto.returnedAt).toBeNull()
  })

  it('toTransferDto exposes token and formats expiry/accepted timestamps', () => {
    const row = {
      id: 't1',
      assetId: 'a1',
      status: 'pending',
      fromEmployeeId: 'e1',
      fromEmployeeName: 'Ali Veli',
      toEmployeeId: null,
      toEmployeeName: null,
      acceptedByEmployeeId: null,
      acceptedByEmployeeName: null,
      initiatedById: 'u1',
      initiatedByName: 'Ali Veli',
      token: 'abc123',
      expiresAt: NOW,
      acceptedAt: null,
      notes: null,
      createdAt: NOW,
      updatedAt: NOW,
    } as unknown as AssetTransfer
    const dto = toTransferDto(row, toAssetSummary(asset))
    expect(dto.token).toBe('abc123')
    expect(dto.expiresAt).toBe(NOW.toISOString())
    expect(dto.acceptedAt).toBeNull()
  })

  it('toVehicleLogDto preserves nullable fuel fields', () => {
    const row = {
      id: 'l1',
      assetId: 'a1',
      kind: 'km',
      date: '2026-01-02',
      odometer: 1500,
      liters: null,
      unitPrice: null,
      totalCost: null,
      currency: 'TRY',
      fuelTypeKey: null,
      isFull: false,
      station: null,
      driverEmployeeId: null,
      driverEmployeeName: null,
      notes: null,
      createdAt: NOW,
      updatedAt: NOW,
    } as unknown as AssetVehicleLog
    const dto = toVehicleLogDto(row, null)
    expect(dto.odometer).toBe(1500)
    expect(dto.liters).toBeNull()
    expect(dto.asset).toBeNull()
  })
})
