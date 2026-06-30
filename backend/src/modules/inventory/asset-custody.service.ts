import { randomBytes } from 'node:crypto'

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'

import {
  ASSET_RETIRED_STATUSES,
  type AssetAssignmentDto,
  type AssetAssignmentListQuery,
  type AssetSummary,
  type AssetTransferDto,
  type AssetTransferListQuery,
} from '@turbohesap/shared'

import type { AuthUser } from '../../common/decorators/current-user.decorator'
import { Employee } from '../hr/entities/employee.entity'
import { Asset } from './entities/asset.entity'
import { AssetAssignment } from './entities/asset-assignment.entity'
import { AssetTransfer } from './entities/asset-transfer.entity'
import type {
  AcceptTransferDto,
  AssignAssetDto,
  InitiateTransferDto,
  ReturnAssetDto,
} from './dto/asset-custody.dto'
import {
  employeeDisplayName,
  toAssetSummary,
  toAssignmentDto,
  toTransferDto,
} from './asset.mappers'

const DEFAULT_TRANSFER_TTL_MIN = 1440 // 24 hours

// Zimmet (custody) + zimmet devri (transfer) operations. The transfer handshake
// (initiate → byToken → accept) is the mobile barcode flow. All custody moves run
// inside a transaction so the assignment ledger and the asset's denormalized
// current-custodian stay consistent. This service does NOT touch stock movements
// (assets are not stock).
@Injectable()
export class AssetCustodyService {
  constructor(
    @InjectRepository(Asset) private readonly assets: Repository<Asset>,
    @InjectRepository(AssetAssignment)
    private readonly assignments: Repository<AssetAssignment>,
    @InjectRepository(AssetTransfer)
    private readonly transfers: Repository<AssetTransfer>,
    @InjectRepository(Employee) private readonly employees: Repository<Employee>,
  ) {}

  // ── assignments ─────────────────────────────────────────────────────────────

  async listAssignments(
    query: AssetAssignmentListQuery = {},
  ): Promise<AssetAssignmentDto[]> {
    const where: Record<string, unknown> = {}
    if (query.assetId) where.assetId = query.assetId
    if (query.employeeId) where.employeeId = query.employeeId
    if (query.status) where.status = query.status
    const rows = await this.assignments.find({
      where,
      order: { assignedAt: 'DESC' },
    })
    return this.enrichAssignments(rows)
  }

  // Active assignments for the calling user's linked personel — "Zimmetlerim".
  async mine(user: AuthUser): Promise<AssetAssignmentDto[]> {
    const me = await this.myEmployee(user)
    if (!me) return []
    const rows = await this.assignments.find({
      where: { employeeId: me.id, status: 'active' },
      order: { assignedAt: 'DESC' },
    })
    return this.enrichAssignments(rows)
  }

  async assign(
    dto: AssignAssetDto,
    user: AuthUser,
  ): Promise<AssetAssignmentDto> {
    const employee = await this.employeeOrFail(dto.employeeId)
    return this.assets.manager.transaction(async (em) => {
      const asset = await em.findOne(Asset, { where: { id: dto.assetId } })
      if (!asset) throw new NotFoundException('Demirbaş bulunamadı')
      if (ASSET_RETIRED_STATUSES.includes(asset.status)) {
        throw new BadRequestException(
          'Kayıp/hurda/çıkış durumundaki bir demirbaş zimmetlenemez',
        )
      }
      await this.closeActiveAssignment(em, asset, 'returned', null)
      const created = await this.openAssignment(em, asset, {
        employeeId: employee.id,
        employeeName: employeeDisplayName(employee),
        assignedById: user.sub,
        assignedByName: user.username,
        notes: dto.notes ?? null,
        transferId: null,
      })
      return toAssignmentDto(created, toAssetSummary(asset))
    })
  }

  async returnAsset(
    assetId: string,
    dto: ReturnAssetDto,
  ): Promise<AssetAssignmentDto> {
    return this.assets.manager.transaction(async (em) => {
      const asset = await em.findOne(Asset, { where: { id: assetId } })
      if (!asset) throw new NotFoundException('Demirbaş bulunamadı')
      if (!asset.currentAssignmentId) {
        throw new BadRequestException('Bu demirbaş şu an kimseye zimmetli değil')
      }
      const closed = await this.closeActiveAssignment(em, asset, 'returned', null)
      if (dto.branchId !== undefined) asset.branchId = dto.branchId ?? null
      if (asset.status === 'zimmetli') asset.status = 'depoda'
      await em.save(asset)
      if (dto.note && closed) {
        closed.notes = dto.note
        await em.save(closed)
      }
      if (!closed) throw new BadRequestException('Aktif zimmet bulunamadı')
      return toAssignmentDto(closed, toAssetSummary(asset))
    })
  }

  // ── transfers (barcode handshake) ────────────────────────────────────────────

  async listTransfers(
    query: AssetTransferListQuery,
    user: AuthUser,
  ): Promise<AssetTransferDto[]> {
    const qb = this.transfers.createQueryBuilder('t')
    if (query.assetId) qb.andWhere('t.assetId = :a', { a: query.assetId })
    if (query.status) qb.andWhere('t.status = :s', { s: query.status })
    if (query.mine) {
      const me = await this.myEmployee(user)
      const meId = me?.id ?? '00000000-0000-0000-0000-000000000000'
      qb.andWhere(
        '(t.fromEmployeeId = :me OR t.toEmployeeId = :me OR t.initiatedById = :uid)',
        { me: meId, uid: user.sub },
      )
    }
    qb.orderBy('t.createdAt', 'DESC')
    const rows = await qb.getMany()
    return this.enrichTransfers(rows)
  }

  async getTransfer(id: string): Promise<AssetTransferDto> {
    const t = await this.transfers.findOne({ where: { id } })
    if (!t) throw new NotFoundException('Devir kaydı bulunamadı')
    return (await this.enrichTransfers([t]))[0]
  }

  // Receiver resolves a scanned token to its transfer (auto-expires if stale).
  async byToken(token: string): Promise<AssetTransferDto> {
    const t = await this.transfers.findOne({ where: { token } })
    if (!t) throw new NotFoundException('Geçersiz devir kodu')
    await this.expireIfStale(t)
    return (await this.enrichTransfers([t]))[0]
  }

  async initiate(
    dto: InitiateTransferDto,
    user: AuthUser,
  ): Promise<AssetTransferDto> {
    const asset = await this.assetOrFail(dto.assetId)
    if (ASSET_RETIRED_STATUSES.includes(asset.status)) {
      throw new BadRequestException(
        'Kayıp/hurda/çıkış durumundaki bir demirbaş devredilemez',
      )
    }
    let toEmployee: Employee | null = null
    if (dto.toEmployeeId) toEmployee = await this.employeeOrFail(dto.toEmployeeId)
    const me = await this.myEmployee(user)

    // Supersede any still-pending transfer for this asset.
    await this.transfers.update(
      { assetId: asset.id, status: 'pending' },
      { status: 'cancelled' },
    )

    const ttl = dto.expiresInMinutes ?? DEFAULT_TRANSFER_TTL_MIN
    const transfer = this.transfers.create({
      assetId: asset.id,
      status: 'pending',
      fromEmployeeId: asset.currentEmployeeId,
      fromEmployeeName: asset.currentEmployeeName,
      toEmployeeId: toEmployee?.id ?? null,
      toEmployeeName: toEmployee ? employeeDisplayName(toEmployee) : null,
      acceptedByEmployeeId: null,
      acceptedByEmployeeName: null,
      initiatedById: user.sub,
      initiatedByName: me ? employeeDisplayName(me) : user.username,
      token: randomBytes(12).toString('hex'),
      expiresAt: new Date(Date.now() + ttl * 60_000),
      acceptedAt: null,
      notes: dto.notes ?? null,
    })
    const saved = await this.transfers.save(transfer)
    return toTransferDto(saved, toAssetSummary(asset))
  }

  // Receiver confirms "Devraldım" by token → custody moves to them.
  async accept(
    dto: AcceptTransferDto,
    user: AuthUser,
  ): Promise<AssetTransferDto> {
    const acceptor = await this.myEmployee(user)
    if (!acceptor) {
      throw new BadRequestException(
        'Devralmak için kullanıcınızın bir personel kaydına bağlı olması gerekir',
      )
    }
    return this.assets.manager.transaction(async (em) => {
      const t = await em.findOne(AssetTransfer, { where: { token: dto.token } })
      if (!t) throw new NotFoundException('Geçersiz devir kodu')
      if (t.status !== 'pending') {
        throw new BadRequestException('Bu devir artık geçerli değil')
      }
      if (t.expiresAt && t.expiresAt.getTime() < Date.now()) {
        t.status = 'expired'
        await em.save(t)
        throw new BadRequestException('Devir süresi dolmuş')
      }
      if (t.toEmployeeId && t.toEmployeeId !== acceptor.id) {
        throw new ForbiddenException('Bu devir başka bir personele tanımlı')
      }
      if (t.fromEmployeeId && t.fromEmployeeId === acceptor.id) {
        throw new BadRequestException('Demirbaş zaten sizde')
      }

      const asset = await em.findOne(Asset, { where: { id: t.assetId } })
      if (!asset) throw new NotFoundException('Demirbaş bulunamadı')

      await this.closeActiveAssignment(em, asset, 'transferred', t.id)
      await this.openAssignment(em, asset, {
        employeeId: acceptor.id,
        employeeName: employeeDisplayName(acceptor),
        assignedById: user.sub,
        assignedByName: user.username,
        notes: t.notes,
        transferId: t.id,
      })

      t.status = 'accepted'
      t.acceptedAt = new Date()
      t.acceptedByEmployeeId = acceptor.id
      t.acceptedByEmployeeName = employeeDisplayName(acceptor)
      const saved = await em.save(t)
      return toTransferDto(saved, toAssetSummary(asset))
    })
  }

  async reject(id: string): Promise<AssetTransferDto> {
    return this.terminate(id, 'rejected')
  }

  async cancel(id: string): Promise<AssetTransferDto> {
    return this.terminate(id, 'cancelled')
  }

  // ── internals ────────────────────────────────────────────────────────────────

  private async terminate(
    id: string,
    status: 'rejected' | 'cancelled',
  ): Promise<AssetTransferDto> {
    const t = await this.transfers.findOne({ where: { id } })
    if (!t) throw new NotFoundException('Devir kaydı bulunamadı')
    if (t.status !== 'pending') {
      throw new BadRequestException('Yalnızca bekleyen bir devir iptal edilebilir')
    }
    t.status = status
    const saved = await this.transfers.save(t)
    return (await this.enrichTransfers([saved]))[0]
  }

  // Close the asset's active assignment (if any) and clear the asset's custodian.
  private async closeActiveAssignment(
    em: import('typeorm').EntityManager,
    asset: Asset,
    status: 'returned' | 'transferred',
    transferId: string | null,
  ): Promise<AssetAssignment | null> {
    if (!asset.currentAssignmentId) return null
    const active = await em.findOne(AssetAssignment, {
      where: { id: asset.currentAssignmentId, status: 'active' },
    })
    if (active) {
      active.status = status
      active.returnedAt = new Date()
      if (transferId) active.transferId = transferId
      await em.save(active)
    }
    asset.currentEmployeeId = null
    asset.currentEmployeeName = null
    asset.currentAssignmentId = null
    return active
  }

  // Open a new active assignment and flip the asset to zimmetli.
  private async openAssignment(
    em: import('typeorm').EntityManager,
    asset: Asset,
    data: {
      employeeId: string
      employeeName: string
      assignedById: string | null
      assignedByName: string | null
      notes: string | null
      transferId: string | null
    },
  ): Promise<AssetAssignment> {
    const created = em.create(AssetAssignment, {
      assetId: asset.id,
      employeeId: data.employeeId,
      employeeName: data.employeeName,
      status: 'active',
      assignedById: data.assignedById,
      assignedByName: data.assignedByName,
      assignedAt: new Date(),
      returnedAt: null,
      transferId: data.transferId,
      notes: data.notes,
    })
    const saved = await em.save(created)
    asset.currentEmployeeId = data.employeeId
    asset.currentEmployeeName = data.employeeName
    asset.currentAssignmentId = saved.id
    asset.status = 'zimmetli'
    await em.save(asset)
    return saved
  }

  private async expireIfStale(t: AssetTransfer): Promise<void> {
    if (
      t.status === 'pending' &&
      t.expiresAt &&
      t.expiresAt.getTime() < Date.now()
    ) {
      t.status = 'expired'
      await this.transfers.save(t)
    }
  }

  private async myEmployee(user: AuthUser): Promise<Employee | null> {
    return this.employees.findOne({
      where: { userId: user.sub, isActive: true },
    })
  }

  private async employeeOrFail(id: string): Promise<Employee> {
    const e = await this.employees.findOne({ where: { id } })
    if (!e) throw new NotFoundException('Personel bulunamadı')
    return e
  }

  private async assetOrFail(id: string): Promise<Asset> {
    const a = await this.assets.findOne({ where: { id } })
    if (!a) throw new NotFoundException('Demirbaş bulunamadı')
    return a
  }

  private async enrichAssignments(
    rows: AssetAssignment[],
  ): Promise<AssetAssignmentDto[]> {
    const summaries = await this.assetSummaries(rows.map((r) => r.assetId))
    return rows.map((r) => toAssignmentDto(r, summaries.get(r.assetId) ?? null))
  }

  private async enrichTransfers(
    rows: AssetTransfer[],
  ): Promise<AssetTransferDto[]> {
    const summaries = await this.assetSummaries(rows.map((r) => r.assetId))
    return rows.map((r) => toTransferDto(r, summaries.get(r.assetId) ?? null))
  }

  private async assetSummaries(
    ids: string[],
  ): Promise<Map<string, AssetSummary>> {
    const unique = [...new Set(ids)]
    const map = new Map<string, AssetSummary>()
    if (unique.length === 0) return map
    const rows = await this.assets.find({ where: { id: In(unique) } })
    for (const a of rows) map.set(a.id, toAssetSummary(a))
    return map
  }
}
