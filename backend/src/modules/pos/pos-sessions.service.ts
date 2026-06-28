import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'

import type { PosSessionDto, SessionListQuery } from '@turbohesap/shared'

import { PosSession } from './entities/pos-session.entity'
import { PosRegister } from './entities/pos-register.entity'
import { PosOrder } from './entities/pos-order.entity'
import { PosPayment } from './entities/pos-payment.entity'
import { User } from '../iam/entities/user.entity'
import { displayName } from '../contacts/user-name.util'
import type { CloseSessionDto, OpenSessionDto } from './dto/pos.dto'

@Injectable()
export class PosSessionsService {
  constructor(
    @InjectRepository(PosSession) private readonly sessions: Repository<PosSession>,
    @InjectRepository(PosRegister) private readonly registers: Repository<PosRegister>,
    @InjectRepository(PosOrder) private readonly orders: Repository<PosOrder>,
    @InjectRepository(PosPayment) private readonly payments: Repository<PosPayment>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async list(query?: SessionListQuery): Promise<PosSessionDto[]> {
    const where: Record<string, unknown> = {}
    if (query?.registerId) where.registerId = query.registerId
    if (query?.status) where.status = query.status
    const rows = await this.sessions.find({ where, order: { openedAt: 'DESC' }, take: 100 })
    return Promise.all(rows.map((s) => this.toDto(s)))
  }

  async get(id: string): Promise<PosSessionDto> {
    return this.toDto(await this.findOrFail(id))
  }

  async current(registerId: string): Promise<PosSessionDto | null> {
    const s = await this.sessions.findOne({ where: { registerId, status: 'open' } })
    return s ? this.toDto(s) : null
  }

  async open(dto: OpenSessionDto, userId: string): Promise<PosSessionDto> {
    const register = await this.registers.findOne({ where: { id: dto.registerId } })
    if (!register) throw new NotFoundException('Kasa bulunamadı')
    if (await this.sessions.count({ where: { registerId: dto.registerId, status: 'open' } })) {
      throw new BadRequestException('Bu kasada zaten açık bir vardiya var')
    }
    const saved = await this.sessions.save(
      this.sessions.create({
        registerId: dto.registerId,
        branchId: register.branchId,
        openedById: userId,
        openedAt: new Date(),
        openingCash: dto.openingCash ?? 0,
        status: 'open',
      }),
    )
    return this.toDto(saved)
  }

  async close(id: string, dto: CloseSessionDto): Promise<PosSessionDto> {
    const s = await this.findOrFail(id)
    if (s.status === 'closed') throw new BadRequestException('Vardiya zaten kapalı')
    s.status = 'closed'
    s.closedAt = new Date()
    s.countedCash = dto.countedCash ?? null
    s.closingCash = dto.countedCash ?? null
    if (dto.notes !== undefined) s.notes = dto.notes
    await this.sessions.save(s)
    return this.toDto(s)
  }

  private async toDto(s: PosSession): Promise<PosSessionDto> {
    const [register, opener, paidOrders] = await Promise.all([
      this.registers.findOne({ where: { id: s.registerId } }),
      this.users.findOne({ where: { id: s.openedById } }),
      this.orders.find({ where: { sessionId: s.id, status: In(['paid', 'refunded']) } }),
    ])
    const salesTotal = paidOrders
      .filter((o) => o.status === 'paid')
      .reduce((sum, o) => sum + o.grandTotal, 0)
    let cashIn = 0
    if (paidOrders.length) {
      const pays = await this.payments.find({
        where: { orderId: In(paidOrders.map((o) => o.id)), method: 'cash' },
      })
      cashIn = pays.reduce((sum, p) => sum + p.amount, 0)
    }
    return {
      id: s.id,
      registerId: s.registerId,
      registerName: register?.name ?? '',
      branchId: s.branchId,
      openedById: s.openedById,
      openedByName: opener ? displayName(opener) : '',
      openedAt: s.openedAt.toISOString(),
      openingCash: s.openingCash,
      closedAt: s.closedAt ? s.closedAt.toISOString() : null,
      closingCash: s.closingCash,
      expectedCash: Math.round((s.openingCash + cashIn) * 100) / 100,
      countedCash: s.countedCash,
      status: s.status,
      salesTotal: Math.round(salesTotal * 100) / 100,
      orderCount: paidOrders.filter((o) => o.status === 'paid').length,
      notes: s.notes,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }
  }

  private async findOrFail(id: string): Promise<PosSession> {
    const s = await this.sessions.findOne({ where: { id } })
    if (!s) throw new NotFoundException('Vardiya bulunamadı')
    return s
  }
}
