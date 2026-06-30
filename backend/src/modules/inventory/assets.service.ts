import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import {
  ASSET_RETIRED_STATUSES,
  type AssetDto,
  type AssetListQuery,
} from '@turbohesap/shared'

import { Asset } from './entities/asset.entity'
import { AssetAssignment } from './entities/asset-assignment.entity'
import type { CreateAssetDto, UpdateAssetDto } from './dto/create-asset.dto'
import type { ChangeAssetStatusDto } from './dto/create-asset.dto'
import { toAssetDto } from './asset.mappers'

@Injectable()
export class AssetsService {
  constructor(
    @InjectRepository(Asset) private readonly assets: Repository<Asset>,
    @InjectRepository(AssetAssignment)
    private readonly assignments: Repository<AssetAssignment>,
  ) {}

  async list(query: AssetListQuery = {}): Promise<AssetDto[]> {
    const qb = this.assets.createQueryBuilder('a')
    if (query.status) qb.andWhere('a.status = :status', { status: query.status })
    if (query.assetTypeKey)
      qb.andWhere('a.assetTypeKey = :t', { t: query.assetTypeKey })
    if (query.branchId) qb.andWhere('a.branchId = :b', { b: query.branchId })
    if (query.employeeId)
      qb.andWhere('a.currentEmployeeId = :e', { e: query.employeeId })
    if (query.isVehicle !== undefined)
      qb.andWhere('a.isVehicle = :v', { v: query.isVehicle })
    if (query.search) {
      qb.andWhere(
        '(a.name ILIKE :s OR a.code ILIKE :s OR a.barcode ILIKE :s OR a.serialNo ILIKE :s OR a.plate ILIKE :s)',
        { s: `%${query.search}%` },
      )
    }
    qb.orderBy('a.createdAt', 'DESC')
    const rows = await qb.getMany()
    return rows.map(toAssetDto)
  }

  async get(id: string): Promise<AssetDto> {
    return toAssetDto(await this.findOrFail(id))
  }

  async create(dto: CreateAssetDto): Promise<AssetDto> {
    const code = (dto.code ?? '').trim() || (await this.nextCode())
    await this.assertCodeFree(code)
    if (dto.barcode) await this.assertBarcodeFree(dto.barcode)

    const asset = this.assets.create({
      code,
      name: dto.name.trim(),
      assetTypeKey: dto.assetTypeKey ?? null,
      barcode: dto.barcode?.trim() || null,
      serialNo: dto.serialNo ?? null,
      brand: dto.brand ?? null,
      model: dto.model ?? null,
      purchaseDate: dto.purchaseDate ?? null,
      purchaseValue: dto.purchaseValue ?? 0,
      currency: dto.currency ?? 'TRY',
      supplierContactId: dto.supplierContactId ?? null,
      warrantyEnd: dto.warrantyEnd ?? null,
      branchId: dto.branchId ?? null,
      status: 'depoda',
      statusReason: null,
      statusNote: null,
      statusChangedAt: null,
      currentEmployeeId: null,
      currentEmployeeName: null,
      currentAssignmentId: null,
      isVehicle: dto.isVehicle ?? false,
      plate: dto.plate ?? null,
      chassisNo: dto.chassisNo ?? null,
      engineNo: dto.engineNo ?? null,
      modelYear: dto.modelYear ?? null,
      fuelTypeKey: dto.fuelTypeKey ?? null,
      currentOdometer: null,
      notes: dto.notes ?? null,
      isActive: dto.isActive ?? true,
    })
    return toAssetDto(await this.assets.save(asset))
  }

  async update(id: string, dto: UpdateAssetDto): Promise<AssetDto> {
    const a = await this.findOrFail(id)

    if (dto.code !== undefined) {
      const code = dto.code.trim()
      if (code && code !== a.code) {
        await this.assertCodeFree(code)
        a.code = code
      }
    }
    if (dto.barcode !== undefined) {
      const bc = dto.barcode?.trim() || null
      if (bc && bc !== a.barcode) await this.assertBarcodeFree(bc)
      a.barcode = bc
    }
    if (dto.name !== undefined) a.name = dto.name.trim()
    if (dto.assetTypeKey !== undefined) a.assetTypeKey = dto.assetTypeKey ?? null
    if (dto.serialNo !== undefined) a.serialNo = dto.serialNo ?? null
    if (dto.brand !== undefined) a.brand = dto.brand ?? null
    if (dto.model !== undefined) a.model = dto.model ?? null
    if (dto.purchaseDate !== undefined) a.purchaseDate = dto.purchaseDate ?? null
    if (dto.purchaseValue !== undefined) a.purchaseValue = dto.purchaseValue ?? 0
    if (dto.currency !== undefined) a.currency = dto.currency ?? 'TRY'
    if (dto.supplierContactId !== undefined)
      a.supplierContactId = dto.supplierContactId ?? null
    if (dto.warrantyEnd !== undefined) a.warrantyEnd = dto.warrantyEnd ?? null
    if (dto.branchId !== undefined) a.branchId = dto.branchId ?? null
    if (dto.isVehicle !== undefined) a.isVehicle = dto.isVehicle ?? false
    if (dto.plate !== undefined) a.plate = dto.plate ?? null
    if (dto.chassisNo !== undefined) a.chassisNo = dto.chassisNo ?? null
    if (dto.engineNo !== undefined) a.engineNo = dto.engineNo ?? null
    if (dto.modelYear !== undefined) a.modelYear = dto.modelYear ?? null
    if (dto.fuelTypeKey !== undefined) a.fuelTypeKey = dto.fuelTypeKey ?? null
    if (dto.notes !== undefined) a.notes = dto.notes ?? null
    if (dto.isActive !== undefined) a.isActive = dto.isActive ?? true

    return toAssetDto(await this.assets.save(a))
  }

  // Lifecycle status change (giriş/çıkış, kayıp, hurda, pasif…). Moving to a
  // retired status auto-closes any active zimmet (custody assignment).
  async changeStatus(id: string, dto: ChangeAssetStatusDto): Promise<AssetDto> {
    return this.assets.manager.transaction(async (em) => {
      const a = await em.findOne(Asset, { where: { id } })
      if (!a) throw new NotFoundException('Demirbaş bulunamadı')

      const when = dto.date ? new Date(dto.date) : new Date()
      a.status = dto.status
      a.statusReason = dto.reason ?? null
      a.statusNote = dto.note ?? null
      a.statusChangedAt = when

      if (ASSET_RETIRED_STATUSES.includes(dto.status) && a.currentAssignmentId) {
        await em.update(
          AssetAssignment,
          { id: a.currentAssignmentId, status: 'active' },
          { status: 'returned', returnedAt: when },
        )
        a.currentEmployeeId = null
        a.currentEmployeeName = null
        a.currentAssignmentId = null
      }
      return toAssetDto(await em.save(a))
    })
  }

  async remove(id: string): Promise<void> {
    const a = await this.findOrFail(id)
    await this.assets.remove(a)
  }

  // ── internals ──────────────────────────────────────────────────────────────

  async findOrFail(id: string): Promise<Asset> {
    const a = await this.assets.findOne({ where: { id } })
    if (!a) throw new NotFoundException('Demirbaş bulunamadı')
    return a
  }

  private async assertCodeFree(code: string): Promise<void> {
    if (await this.assets.exists({ where: { code } }))
      throw new ConflictException('Bu demirbaş kodu zaten kullanılıyor')
  }

  private async assertBarcodeFree(barcode: string): Promise<void> {
    if (await this.assets.exists({ where: { barcode } }))
      throw new ConflictException('Bu barkod zaten kullanılıyor')
  }

  // Generate the next DMB-#### code from the current count (uniqueness is still
  // enforced; a collision throws a friendly 409).
  private async nextCode(): Promise<string> {
    const n = (await this.assets.count()) + 1
    const code = `DMB-${String(n).padStart(4, '0')}`
    if (await this.assets.exists({ where: { code } })) {
      throw new BadRequestException(
        'Otomatik kod üretilemedi, lütfen kodu elle girin',
      )
    }
    return code
  }
}
