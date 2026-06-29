import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'

import type { PosSessionDto, SessionListQuery } from '@turbohesap/shared'

import { PosSession } from './entities/pos-session.entity'
import { PosRegister } from './entities/pos-register.entity'
import { PosOrder } from './entities/pos-order.entity'
import { PosPayment } from './entities/pos-payment.entity'
import { User } from '../iam/entities/user.entity'
import { FinanceTransaction } from '../finance/entities/finance-transaction.entity'
import { displayName } from '../contacts/user-name.util'
import type { CloseSessionDto, OpenSessionDto } from './dto/pos.dto'

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

@Injectable()
export class PosSessionsService {
  constructor(
    @InjectRepository(PosSession) private readonly sessions: Repository<PosSession>,
    @InjectRepository(PosRegister) private readonly registers: Repository<PosRegister>,
    @InjectRepository(PosOrder) private readonly orders: Repository<PosOrder>,
    @InjectRepository(PosPayment) private readonly payments: Repository<PosPayment>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(FinanceTransaction) private readonly finance: Repository<FinanceTransaction>,
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

  // Vezne: on close, aggregate the session's cash and card takings into a single
  // finance transaction each (cash → kasa, card → banka). Cash/card are NOT
  // posted per order — this is the one place they hit finance. The aggregate
  // links back to the session (sourceModule 'pos-session') for drill-down.
  async close(id: string, dto: CloseSessionDto, userId?: string): Promise<PosSessionDto> {
    const s = await this.findOrFail(id)
    if (s.status === 'closed') throw new BadRequestException('Vardiya zaten kapalı')
    await this.sessions.manager.transaction(async (em) => {
      const register = await em.getRepository(PosRegister).findOne({ where: { id: s.registerId } })
      const paidOrders = await em
        .getRepository(PosOrder)
        .find({ where: { sessionId: s.id, status: 'paid' } })
      if (paidOrders.length) {
        const pays = await em
          .getRepository(PosPayment)
          .find({ where: { orderId: In(paidOrders.map((o) => o.id)) } })
        const cashPays = pays.filter((p) => p.method === 'cash')
        const cardPays = pays.filter((p) => p.method === 'card')
        const cashSum = round2(cashPays.reduce((sum, p) => sum + p.amount, 0))
        const cardSum = round2(cardPays.reduce((sum, p) => sum + p.amount, 0))
        const dateStr = new Date().toISOString().slice(0, 10)
        const finRepo = em.getRepository(FinanceTransaction)
        if (cashSum > 0) {
          const cashAccountId =
            register?.defaultCashAccountId ?? cashPays.find((p) => p.cashAccountId)?.cashAccountId ?? null
          const fin = await finRepo.save(
            finRepo.create({
              cashAccountId,
              bankAccountId: null,
              contactId: null,
              type: 'in',
              amount: cashSum,
              date: new Date(),
              description: `POS ${register?.name ?? ''} ${dateStr} kapanış (nakit)`,
              sourceModule: 'pos-session',
              sourceId: s.id,
            }),
          )
          s.cashFinanceTxId = fin.id
        }
        if (cardSum > 0) {
          const bankAccountId = cardPays.find((p) => p.bankAccountId)?.bankAccountId ?? null
          const fin = await finRepo.save(
            finRepo.create({
              cashAccountId: null,
              bankAccountId,
              contactId: null,
              type: 'in',
              amount: cardSum,
              date: new Date(),
              description: `POS ${register?.name ?? ''} ${dateStr} kapanış (kart)`,
              sourceModule: 'pos-session',
              sourceId: s.id,
            }),
          )
          s.cardFinanceTxId = fin.id
        }
      }
      s.status = 'closed'
      s.closedAt = new Date()
      s.closedById = userId ?? null
      s.countedCash = dto.countedCash ?? null
      s.closingCash = dto.countedCash ?? null
      if (dto.notes !== undefined) s.notes = dto.notes
      await em.getRepository(PosSession).save(s)
    })
    return this.toDto(s)
  }

  private async toDto(s: PosSession): Promise<PosSessionDto> {
    const [register, opener, closer, paidOrders] = await Promise.all([
      this.registers.findOne({ where: { id: s.registerId } }),
      this.users.findOne({ where: { id: s.openedById } }),
      s.closedById ? this.users.findOne({ where: { id: s.closedById } }) : Promise.resolve(null),
      this.orders.find({ where: { sessionId: s.id, status: In(['paid', 'refunded']) } }),
    ])
    const salesTotal = paidOrders
      .filter((o) => o.status === 'paid')
      .reduce((sum, o) => sum + o.grandTotal, 0)
    let cashIn = 0
    let cardTotal = 0
    if (paidOrders.length) {
      const pays = await this.payments.find({
        where: { orderId: In(paidOrders.map((o) => o.id)) },
      })
      cashIn = pays.filter((p) => p.method === 'cash').reduce((sum, p) => sum + p.amount, 0)
      cardTotal = pays.filter((p) => p.method === 'card').reduce((sum, p) => sum + p.amount, 0)
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
      closedById: s.closedById,
      closedByName: closer ? displayName(closer) : null,
      expectedCash: round2(s.openingCash + cashIn),
      countedCash: s.countedCash,
      status: s.status,
      salesTotal: round2(salesTotal),
      cardTotal: round2(cardTotal),
      orderCount: paidOrders.filter((o) => o.status === 'paid').length,
      cashFinanceTxId: s.cashFinanceTxId,
      cardFinanceTxId: s.cardFinanceTxId,
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
