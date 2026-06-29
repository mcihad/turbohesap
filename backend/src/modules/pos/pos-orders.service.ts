import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, In, Repository } from 'typeorm'

import {
  lineGross,
  modifierDeltaSum,
  taxBreakdown,
  type PosOrderDto,
  type PosOrderLineDto,
  type PosOrderListQuery,
  type PosPaymentDto,
} from '@turbohesap/shared'

import { PosOrder } from './entities/pos-order.entity'
import { PosOrderLine } from './entities/pos-order-line.entity'
import { PosOrderLineModifier } from './entities/pos-order-line-modifier.entity'
import { PosPayment } from './entities/pos-payment.entity'
import { PosRegister } from './entities/pos-register.entity'
import { PosSession } from './entities/pos-session.entity'
import { Product } from '../inventory/entities/product.entity'
import { ProductVariant } from '../inventory/entities/product-variant.entity'
import { ProductChannelPrice } from '../inventory/entities/product-channel-price.entity'
import { ProductModifierOption } from '../inventory/entities/product-modifier-option.entity'
import { ProductModifierGroup } from '../inventory/entities/product-modifier-group.entity'
import { ProductBundleComponent } from '../inventory/entities/product-bundle-component.entity'
import { Contact } from '../contacts/entities/contact.entity'
import { ContactTransaction } from '../contacts/entities/contact-transaction.entity'
import { FinanceTransaction } from '../finance/entities/finance-transaction.entity'
import { StockMovementsService } from '../inventory/stock-movements.service'
import { StockMovementTypesService } from '../inventory/stock-movement-types.service'
import type {
  AddPosPaymentDto,
  CreatePosOrderDto,
  ReturnPosOrderDto,
  UpdatePosOrderDto,
  VoidPosOrderDto,
} from './dto/pos.dto'

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}
function round4(n: number): number {
  return Math.round((n + Number.EPSILON) * 10000) / 10000
}
function newRef(): string {
  return 'srv-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

@Injectable()
export class PosOrdersService {
  constructor(
    @InjectRepository(PosOrder) private readonly orders: Repository<PosOrder>,
    @InjectRepository(PosOrderLine) private readonly lines: Repository<PosOrderLine>,
    @InjectRepository(PosOrderLineModifier) private readonly lineMods: Repository<PosOrderLineModifier>,
    @InjectRepository(PosPayment) private readonly payments: Repository<PosPayment>,
    @InjectRepository(PosRegister) private readonly registers: Repository<PosRegister>,
    @InjectRepository(PosSession) private readonly sessions: Repository<PosSession>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(ProductVariant) private readonly variants: Repository<ProductVariant>,
    @InjectRepository(ProductChannelPrice) private readonly channelPrices: Repository<ProductChannelPrice>,
    @InjectRepository(ProductModifierOption) private readonly modifierOptions: Repository<ProductModifierOption>,
    @InjectRepository(ProductModifierGroup) private readonly modifierGroups: Repository<ProductModifierGroup>,
    @InjectRepository(ProductBundleComponent) private readonly bundleComponents: Repository<ProductBundleComponent>,
    @InjectRepository(Contact) private readonly contacts: Repository<Contact>,
    private readonly stockMovements: StockMovementsService,
    private readonly movementTypes: StockMovementTypesService,
  ) {}

  async list(query?: PosOrderListQuery): Promise<PosOrderDto[]> {
    const where: Record<string, unknown> = {}
    if (query?.registerId) where.registerId = query.registerId
    if (query?.sessionId) where.sessionId = query.sessionId
    if (query?.status) where.status = query.status
    if (query?.contactId) where.contactId = query.contactId
    const rows = await this.orders.find({ where, order: { createdAt: 'DESC' }, take: 200 })
    return Promise.all(rows.map((o) => this.assemble(o)))
  }

  async get(id: string): Promise<PosOrderDto> {
    return this.assemble(await this.findOrFail(id))
  }

  async create(dto: CreatePosOrderDto): Promise<PosOrderDto> {
    if (dto.clientRef) {
      const existing = await this.orders.findOne({ where: { clientRef: dto.clientRef } })
      if (existing) return this.assemble(existing) // idempotent (offline-safe)
    }
    const register = await this.registers.findOne({ where: { id: dto.registerId } })
    if (!register) throw new NotFoundException('Kasa bulunamadı')
    const taxInclusive = register.settings?.taxInclusive ?? true
    const sessionId =
      dto.sessionId ??
      (await this.sessions.findOne({ where: { registerId: register.id, status: 'open' } }))?.id ??
      null

    const order = await this.orders.manager.transaction(async (em) => {
      const o = await em.getRepository(PosOrder).save(
        em.getRepository(PosOrder).create({
          clientRef: dto.clientRef || newRef(),
          sessionId,
          registerId: register.id,
          branchId: register.branchId,
          salesChannelId: register.salesChannelId,
          orderType: dto.orderType ?? 'takeaway',
          tableId: dto.tableId ?? null,
          contactId: dto.contactId ?? null,
          status: 'open',
          orderNo: await this.nextOrderNo(register),
          currencyCode: 'TRY',
          taxInclusive,
          notes: dto.notes ?? null,
          subtotal: 0,
          discountTotal: 0,
          taxTotal: 0,
          grandTotal: 0,
          paidTotal: 0,
          changeDue: 0,
        }),
      )
      await this.writeLines(em, o.id, dto.lines, taxInclusive, register.salesChannelId)
      await this.recomputeTotals(em, o.id)
      return o
    })
    return this.assemble(await this.findOrFail(order.id))
  }

  async update(id: string, dto: UpdatePosOrderDto): Promise<PosOrderDto> {
    const o = await this.findOrFail(id)
    if (o.status !== 'open' && o.status !== 'parked') {
      throw new BadRequestException('Yalnızca açık sipariş düzenlenebilir')
    }
    await this.orders.manager.transaction(async (em) => {
      if (dto.orderType !== undefined) o.orderType = dto.orderType
      if (dto.contactId !== undefined) o.contactId = dto.contactId
      if (dto.tableId !== undefined) o.tableId = dto.tableId
      if (dto.notes !== undefined) o.notes = dto.notes
      await em.getRepository(PosOrder).save(o)
      if (dto.lines) {
        const existing = await em.getRepository(PosOrderLine).find({ where: { orderId: id } })
        if (existing.length) {
          await em.getRepository(PosOrderLineModifier).delete({ lineId: In(existing.map((l) => l.id)) })
          await em.getRepository(PosOrderLine).delete({ orderId: id })
        }
        await this.writeLines(em, id, dto.lines, o.taxInclusive, o.salesChannelId)
      }
      await this.recomputeTotals(em, id)
    })
    return this.get(id)
  }

  async addPayment(id: string, dto: AddPosPaymentDto): Promise<PosOrderDto> {
    const o = await this.findOrFail(id)
    if (o.status !== 'open') throw new BadRequestException('Yalnızca açık siparişe tahsilat eklenebilir')
    if (!dto.amount || dto.amount <= 0) throw new BadRequestException('Tutar girilmelidir')
    if (dto.method === 'cash' && !dto.cashAccountId) throw new BadRequestException('Kasa seçilmelidir')
    if (dto.method === 'card' && !dto.bankAccountId) throw new BadRequestException('Banka hesabı seçilmelidir')
    if (dto.method === 'account') {
      const contactId = dto.contactId ?? o.contactId
      if (!contactId) throw new BadRequestException('Cari hesabı seçilmelidir')
    }
    const remaining = round2(o.grandTotal - o.paidTotal)
    let applied = dto.amount
    let change = 0
    if (dto.method === 'cash') {
      const tendered = dto.tendered ?? dto.amount
      applied = Math.min(tendered, remaining)
      change = round2(tendered - applied)
    } else if (dto.amount > remaining + 0.001) {
      throw new BadRequestException('Tutar kalan tutardan fazla olamaz')
    }

    await this.orders.manager.transaction(async (em) => {
      await em.getRepository(PosPayment).save(
        em.getRepository(PosPayment).create({
          orderId: id,
          method: dto.method,
          amount: round2(applied),
          changeGiven: change,
          cashAccountId: dto.method === 'cash' ? dto.cashAccountId ?? null : null,
          bankAccountId: dto.method === 'card' ? dto.bankAccountId ?? null : null,
          contactId: dto.method === 'account' ? dto.contactId ?? o.contactId ?? null : null,
          clientRef: dto.clientRef || newRef(),
        }),
      )
      const paid = await this.sumPaid(em, id)
      o.paidTotal = paid
      o.changeDue = await this.sumChange(em, id)
      await em.getRepository(PosOrder).save(o)
      if (paid >= o.grandTotal - 0.001) {
        await this.settleInTx(em, o)
      }
    })
    return this.get(id)
  }

  async removePayment(id: string, paymentId: string): Promise<PosOrderDto> {
    const o = await this.findOrFail(id)
    if (o.status !== 'open') throw new BadRequestException('Kapanmış siparişin tahsilatı silinemez (iade kullanın)')
    await this.orders.manager.transaction(async (em) => {
      await em.getRepository(PosPayment).delete({ id: paymentId, orderId: id })
      o.paidTotal = await this.sumPaid(em, id)
      o.changeDue = await this.sumChange(em, id)
      await em.getRepository(PosOrder).save(o)
    })
    return this.get(id)
  }

  async settle(id: string): Promise<PosOrderDto> {
    const o = await this.findOrFail(id)
    if (o.status !== 'open') return this.get(id)
    if (o.paidTotal < o.grandTotal - 0.001) {
      throw new BadRequestException('Sipariş tam ödenmeden kapatılamaz')
    }
    await this.orders.manager.transaction((em) => this.settleInTx(em, o))
    return this.get(id)
  }

  async split(id: string, lineIds: string[]): Promise<PosOrderDto> {
    const o = await this.findOrFail(id)
    if (o.status !== 'open') throw new BadRequestException('Yalnızca açık sipariş bölünebilir')
    if (!lineIds?.length) throw new BadRequestException('Bölünecek satır seçilmedi')
    const child = await this.orders.manager.transaction(async (em) => {
      const moving = await em.getRepository(PosOrderLine).find({ where: { id: In(lineIds), orderId: id } })
      if (!moving.length) throw new BadRequestException('Geçersiz satırlar')
      const remainingCount = await em.getRepository(PosOrderLine).count({ where: { orderId: id } })
      if (moving.length >= remainingCount) {
        throw new BadRequestException('Tüm satırlar taşınamaz; en az bir satır kalmalı')
      }
      const c = await em.getRepository(PosOrder).save(
        em.getRepository(PosOrder).create({
          clientRef: newRef(),
          sessionId: o.sessionId,
          registerId: o.registerId,
          branchId: o.branchId,
          salesChannelId: o.salesChannelId,
          orderType: o.orderType,
          tableId: o.tableId,
          contactId: o.contactId,
          status: 'open',
          orderNo: `${o.orderNo}-B`,
          currencyCode: o.currencyCode,
          taxInclusive: o.taxInclusive,
          parentOrderId: o.id,
          subtotal: 0, discountTotal: 0, taxTotal: 0, grandTotal: 0, paidTotal: 0, changeDue: 0,
        }),
      )
      for (const l of moving) {
        l.orderId = c.id
        await em.getRepository(PosOrderLine).save(l)
      }
      await this.recomputeTotals(em, o.id)
      await this.recomputeTotals(em, c.id)
      return c
    })
    return this.get(child.id)
  }

  async void(id: string, dto: VoidPosOrderDto): Promise<PosOrderDto> {
    const o = await this.findOrFail(id)
    if (o.status === 'voided' || o.status === 'refunded') return this.get(id)
    await this.orders.manager.transaction(async (em) => {
      if (o.status === 'paid') {
        if (!dto.refund) throw new BadRequestException('Kapanmış sipariş için iade (refund) gerekir')
        await this.reverseSettle(em, o)
        o.status = 'refunded'
      } else {
        o.status = 'voided'
      }
      if (dto.reason !== undefined) o.notes = [o.notes, dto.reason].filter(Boolean).join(' | ')
      await em.getRepository(PosOrder).save(o)
    })
    return this.get(id)
  }

  /**
   * Return returnable line units back to stock (geri giriş). Posts an inbound
   * stock movement for each returned line and records returnedQty. Optionally
   * refunds the value (cash drawer). Used for unconsumed packaged items.
   */
  async returnLines(id: string, dto: ReturnPosOrderDto): Promise<PosOrderDto> {
    const o = await this.findOrFail(id)
    if (o.status !== 'paid') throw new BadRequestException('Yalnızca kapanmış (ödenmiş) siparişten iade alınabilir')
    if (!dto.lines?.length) throw new BadRequestException('İade edilecek satır seçilmedi')
    await this.orders.manager.transaction(async (em) => {
      const lineRepo = em.getRepository(PosOrderLine)
      const lines = await lineRepo.find({ where: { id: In(dto.lines.map((l) => l.lineId)), orderId: id } })
      const lineMap = new Map(lines.map((l) => [l.id, l]))
      const today = new Date().toISOString().slice(0, 10)
      const typeId = await this.movementTypes.systemTypeId('Satış İadesi', 'in')
      const productIds = [...new Set(lines.map((l) => l.productId).filter((x): x is string => !!x))]
      const products = productIds.length
        ? await em.getRepository(Product).find({ where: { id: In(productIds) } })
        : []
      const trackMap = new Map(products.map((p) => [p.id, p.trackStock]))
      for (const req of dto.lines) {
        const l = lineMap.get(req.lineId)
        if (!l) throw new BadRequestException('Geçersiz satır')
        if (!l.returnable) throw new BadRequestException(`"${l.name}" iade edilemez`)
        const maxQty = round4(l.qty - l.returnedQty)
        if (req.qty > maxQty + 0.0001) throw new BadRequestException(`"${l.name}" için en fazla ${maxQty} iade edilebilir`)
        if (l.productId && l.deductStock !== false && trackMap.get(l.productId) !== false) {
          await this.stockMovements.post(em, {
            productId: l.productId,
            variantId: l.variantId,
            branchId: o.branchId,
            movementTypeId: typeId,
            direction: 'in',
            quantity: req.qty,
            date: today,
            description: `POS ${o.orderNo} iade`,
            sourceModule: 'pos-return',
            sourceId: o.id,
          })
        }
        l.returnedQty = round4(l.returnedQty + req.qty)
        await lineRepo.save(l)
      }
      if (dto.reason) o.notes = [o.notes, `İade: ${dto.reason}`].filter(Boolean).join(' | ')
      await em.getRepository(PosOrder).save(o)
    })
    return this.get(id)
  }

  async remove(id: string): Promise<void> {
    const o = await this.findOrFail(id)
    if (o.status === 'paid' || o.status === 'refunded') {
      throw new BadRequestException('Kapanmış sipariş silinemez')
    }
    await this.orders.manager.transaction(async (em) => {
      const ls = await em.getRepository(PosOrderLine).find({ where: { orderId: id } })
      if (ls.length) await em.getRepository(PosOrderLineModifier).delete({ lineId: In(ls.map((l) => l.id)) })
      await em.getRepository(PosOrderLine).delete({ orderId: id })
      await em.getRepository(PosPayment).delete({ orderId: id })
      await em.getRepository(PosOrder).delete({ id })
    })
  }

  // ── internals ──
  // Resolve each line's name/unitPrice/taxRate from its product (and the
  // register's sales channel) and each modifier's snapshot from its catalog
  // option. Client-supplied values are honoured only as explicit overrides, so
  // prices can never be tampered with from the device.
  private async writeLines(
    em: EntityManager,
    orderId: string,
    inputs: CreatePosOrderDto['lines'],
    taxInclusive: boolean,
    salesChannelId: string | null,
  ): Promise<void> {
    const productIds = [...new Set(inputs.map((l) => l.productId).filter((x): x is string => !!x))]
    const variantIds = [...new Set(inputs.map((l) => l.variantId).filter((x): x is string => !!x))]
    const optionIds = [
      ...new Set(
        inputs.flatMap((l) => (l.modifiers ?? []).map((m) => m.optionId).filter((x): x is string => !!x)),
      ),
    ]
    // Bundle components for the parent products (auto-added as child lines).
    const bundles = productIds.length
      ? await em
          .getRepository(ProductBundleComponent)
          .find({ where: { productId: In(productIds) }, order: { sortOrder: 'ASC' } })
      : []
    const bundleComponentProductIds = [...new Set(bundles.map((b) => b.componentProductId))]
    const allProductIds = [...new Set([...productIds, ...bundleComponentProductIds])]
    const products = allProductIds.length
      ? await em.getRepository(Product).find({ where: { id: In(allProductIds) } })
      : []
    const variants = variantIds.length
      ? await em.getRepository(ProductVariant).find({ where: { id: In(variantIds) } })
      : []
    const channelPrices =
      salesChannelId && productIds.length
        ? await em
            .getRepository(ProductChannelPrice)
            .find({ where: { productId: In(productIds), channelId: salesChannelId } })
        : []
    const options = optionIds.length
      ? await em.getRepository(ProductModifierOption).find({ where: { id: In(optionIds) } })
      : []
    const groups = options.length
      ? await em
          .getRepository(ProductModifierGroup)
          .find({ where: { id: In([...new Set(options.map((o) => o.groupId))]) } })
      : []
    const productMap = new Map(products.map((p) => [p.id, p]))
    const variantMap = new Map(variants.map((v) => [v.id, v]))
    const optionMap = new Map(options.map((o) => [o.id, o]))
    const groupMap = new Map(groups.map((g) => [g.id, g]))
    const bundlesByParent = new Map<string, ProductBundleComponent[]>()
    for (const b of bundles) {
      ;(bundlesByParent.get(b.productId) ?? bundlesByParent.set(b.productId, []).get(b.productId)!).push(b)
    }

    let i = 0
    for (const li of inputs) {
      // Skip any client-sent bundle child — the server is authoritative and
      // re-expands components below, so children never round-trip.
      if (li.isBundleChild) continue
      const product = li.productId ? productMap.get(li.productId) ?? null : null
      const variant = li.variantId ? variantMap.get(li.variantId) ?? null : null
      if (!product && (li.name == null || li.unitPrice == null)) {
        throw new BadRequestException('Ad ve fiyat olmadan serbest satır eklenemez')
      }
      // Resolve modifier snapshots from the catalog (client values are overrides).
      const mods = (li.modifiers ?? []).map((m) => {
        const opt = m.optionId ? optionMap.get(m.optionId) ?? null : null
        const grp = opt ? groupMap.get(opt.groupId) ?? null : null
        return {
          groupId: m.groupId ?? opt?.groupId ?? null,
          optionId: m.optionId ?? null,
          groupNameSnapshot: m.groupName ?? grp?.name ?? '',
          optionNameSnapshot: m.optionName ?? opt?.name ?? '',
          priceDelta: m.priceDelta ?? opt?.priceDelta ?? 0,
          // Stock-consumption snapshot (frozen at sale time).
          stockProductId: opt?.stockProductId ?? null,
          stockVariantId: opt?.stockVariantId ?? null,
          consumeQty: opt?.consumeQty ?? 1,
          deductStock: opt ? !!opt.deductStock && !!opt.stockProductId : false,
          returnable: opt ? !!opt.returnable && !!opt.stockProductId : false,
        }
      })
      const channelPrice = product
        ? channelPrices.find(
            (cp) => cp.productId === product.id && cp.variantId === (li.variantId ?? null),
          ) ?? null
        : null
      const resolvedUnit =
        li.unitPrice ??
        channelPrice?.salePrice ??
        variant?.salePrice ??
        product?.salePrice ??
        0
      const resolvedName = (li.name ?? product?.name ?? '').trim()
      const resolvedTaxRate = li.taxRate ?? product?.taxRate ?? 0

      const delta = modifierDeltaSum(mods.map((m) => m.priceDelta))
      const gross = lineGross(resolvedUnit, li.qty, li.discount ?? 0, delta)
      const { total } = taxBreakdown(gross, resolvedTaxRate, taxInclusive)
      const line = await em.getRepository(PosOrderLine).save(
        em.getRepository(PosOrderLine).create({
          orderId,
          productId: li.productId ?? null,
          variantId: li.variantId ?? null,
          name: resolvedName,
          qty: li.qty,
          unitPrice: resolvedUnit,
          discount: li.discount ?? 0,
          taxRate: resolvedTaxRate,
          lineTotal: total,
          kitchenStatus: 'new',
          notes: li.notes ?? null,
          isBundleChild: false,
          bundleParentLineId: null,
          deductStock: true,
          // Sold product lines can be returned to stock (geri giriş); bundle
          // components carry their own returnable flag.
          returnable: true,
          returnedQty: 0,
          sortOrder: i++,
        }),
      )
      if (mods.length) {
        await em.getRepository(PosOrderLineModifier).save(
          mods.map((m) => em.getRepository(PosOrderLineModifier).create({ lineId: line.id, ...m })),
        )
      }
      // Expand bundle components for this parent product into child lines.
      const comps = li.productId ? bundlesByParent.get(li.productId) ?? [] : []
      for (const b of comps) {
        const cp = productMap.get(b.componentProductId) ?? null
        const childQty = round4(b.qty * li.qty)
        const childUnit = b.isFree ? 0 : b.unitPrice ?? cp?.salePrice ?? 0
        const childTax = cp?.taxRate ?? 0
        const childGross = lineGross(childUnit, childQty, 0, 0)
        const { total: childTotal } = taxBreakdown(childGross, childTax, taxInclusive)
        await em.getRepository(PosOrderLine).save(
          em.getRepository(PosOrderLine).create({
            orderId,
            productId: b.componentProductId,
            variantId: b.componentVariantId ?? null,
            name: cp?.name ?? '',
            qty: childQty,
            unitPrice: childUnit,
            discount: 0,
            taxRate: childTax,
            lineTotal: childTotal,
            kitchenStatus: 'new',
            notes: null,
            isBundleChild: true,
            bundleParentLineId: line.id,
            deductStock: b.deductStock,
            returnable: b.returnable,
            returnedQty: 0,
            sortOrder: i++,
          }),
        )
      }
    }
  }

  private async recomputeTotals(em: EntityManager, orderId: string): Promise<void> {
    const o = await em.getRepository(PosOrder).findOne({ where: { id: orderId } })
    if (!o) return
    const lines = await em.getRepository(PosOrderLine).find({ where: { orderId } })
    let taxTotal = 0
    let grand = 0
    for (const l of lines) {
      const { tax } = taxBreakdown(l.lineTotal, l.taxRate, o.taxInclusive)
      taxTotal += tax
      grand += l.lineTotal
    }
    o.grandTotal = round2(grand)
    o.taxTotal = round2(taxTotal)
    o.subtotal = round2(grand - taxTotal)
    o.discountTotal = 0
    await em.getRepository(PosOrder).save(o)
  }

  private async sumPaid(em: EntityManager, orderId: string): Promise<number> {
    const rows = await em.getRepository(PosPayment).find({ where: { orderId } })
    return round2(rows.reduce((s, p) => s + p.amount, 0))
  }
  private async sumChange(em: EntityManager, orderId: string): Promise<number> {
    const rows = await em.getRepository(PosPayment).find({ where: { orderId } })
    return round2(rows.reduce((s, p) => s + p.changeGiven, 0))
  }

  /**
   * Settle: post stock (real-time) + cari for account tenders (real-time), and
   * mark paid. Cash/card are NOT posted to kasa/banka here — they are aggregated
   * once when the session is closed (vezne). Modifier-driven stock (e.g. "ekstra
   * ketçap") and bundle children are deducted too, respecting their flags.
   */
  private async settleInTx(em: EntityManager, o: PosOrder): Promise<void> {
    const lines = await em.getRepository(PosOrderLine).find({ where: { orderId: o.id } })
    const productIds = [...new Set(lines.map((l) => l.productId).filter((x): x is string => !!x))]
    const products = productIds.length
      ? await em.getRepository(Product).find({ where: { id: In(productIds) } })
      : []
    const trackMap = new Map(products.map((p) => [p.id, p.trackStock]))
    const today = new Date().toISOString().slice(0, 10)
    const typeId = await this.movementTypes.systemTypeId('Satış Çıkışı', 'out')
    for (const l of lines) {
      // Main/component line stock (bundle children opt out via deductStock).
      if (l.productId && l.deductStock !== false && trackMap.get(l.productId) !== false) {
        await this.stockMovements.post(em, {
          productId: l.productId,
          variantId: l.variantId,
          branchId: o.branchId,
          movementTypeId: typeId,
          direction: 'out',
          quantity: l.qty,
          date: today,
          sourceModule: 'pos',
          sourceId: o.id,
        })
      }
      // Modifier-driven stock consumption (e.g. "Ekstra ketçap" → deduct ketchup).
      const mods = await em.getRepository(PosOrderLineModifier).find({ where: { lineId: l.id } })
      for (const m of mods) {
        if (!m.deductStock || !m.stockProductId) continue
        await this.stockMovements.post(em, {
          productId: m.stockProductId,
          variantId: m.stockVariantId,
          branchId: o.branchId,
          movementTypeId: typeId,
          direction: 'out',
          quantity: round4((m.consumeQty || 1) * l.qty),
          date: today,
          sourceModule: 'pos',
          sourceId: o.id,
        })
      }
    }
    // Only account (veresiye) tenders post in real time — as cari debt.
    const pays = await em.getRepository(PosPayment).find({ where: { orderId: o.id } })
    for (const p of pays) {
      if (p.method === 'account') {
        const contactId = p.contactId ?? o.contactId
        if (contactId) {
          const tx = await em.getRepository(ContactTransaction).save(
            em.getRepository(ContactTransaction).create({
              contactId,
              date: today,
              documentType: 'invoice',
              documentNo: o.orderNo,
              description: `POS ${o.orderNo} hesaba satış`,
              debit: p.amount,
              credit: 0,
              currencyCode: o.currencyCode,
              exchangeRate: 1,
              sourceModule: 'pos',
              sourceId: o.id,
            }),
          )
          p.contactTransactionId = tx.id
          await em.getRepository(PosPayment).save(p)
        }
      }
    }
    o.status = 'paid'
    await em.getRepository(PosOrder).save(o)
  }

  private async reverseSettle(em: EntityManager, o: PosOrder): Promise<void> {
    // Reverses all 'pos' stock for this order (main lines + modifier consumption).
    await this.stockMovements.reverseSource(em, 'pos', o.id)
    // Re-add any returned units that were posted back as inbound (geri giriş).
    await this.stockMovements.reverseSource(em, 'pos-return', o.id)
    const pays = await em.getRepository(PosPayment).find({ where: { orderId: o.id } })
    for (const p of pays) {
      // Cash/card no longer post per-order (session-close vezne); only legacy or
      // account (cari) transactions need deleting here.
      if (p.financeTransactionId) await em.getRepository(FinanceTransaction).delete({ id: p.financeTransactionId })
      if (p.contactTransactionId) await em.getRepository(ContactTransaction).delete({ id: p.contactTransactionId })
    }
  }

  private async nextOrderNo(register: PosRegister): Promise<string> {
    const count = await this.orders.count({ where: { registerId: register.id } })
    return `${register.code}-${String(count + 1).padStart(4, '0')}`
  }

  private async findOrFail(id: string): Promise<PosOrder> {
    const o = await this.orders.findOne({ where: { id } })
    if (!o) throw new NotFoundException('Sipariş bulunamadı')
    return o
  }

  private async assemble(o: PosOrder): Promise<PosOrderDto> {
    const [lines, payments, contact] = await Promise.all([
      this.lines.find({ where: { orderId: o.id }, order: { sortOrder: 'ASC' } }),
      this.payments.find({ where: { orderId: o.id }, order: { createdAt: 'ASC' } }),
      o.contactId ? this.contacts.findOne({ where: { id: o.contactId } }) : Promise.resolve(null),
    ])
    const mods = lines.length
      ? await this.lineMods.find({ where: { lineId: In(lines.map((l) => l.id)) } })
      : []
    const lineDtos: PosOrderLineDto[] = lines.map((l) => ({
      id: l.id,
      orderId: l.orderId,
      productId: l.productId,
      variantId: l.variantId,
      name: l.name,
      qty: l.qty,
      unitPrice: l.unitPrice,
      discount: l.discount,
      taxRate: l.taxRate,
      lineTotal: l.lineTotal,
      kitchenStatus: l.kitchenStatus,
      stationId: l.stationId,
      notes: l.notes,
      isBundleChild: l.isBundleChild,
      bundleParentLineId: l.bundleParentLineId,
      returnable: l.returnable,
      returnedQty: l.returnedQty,
      modifiers: mods
        .filter((m) => m.lineId === l.id)
        .map((m) => ({
          id: m.id,
          lineId: m.lineId,
          groupNameSnapshot: m.groupNameSnapshot,
          optionNameSnapshot: m.optionNameSnapshot,
          priceDelta: m.priceDelta,
          groupId: m.groupId,
          optionId: m.optionId,
          stockProductId: m.stockProductId,
          stockVariantId: m.stockVariantId,
          consumeQty: m.consumeQty,
          deductStock: m.deductStock,
          returnable: m.returnable,
        })),
    }))
    const paymentDtos: PosPaymentDto[] = payments.map((p) => ({
      id: p.id,
      orderId: p.orderId,
      method: p.method,
      amount: p.amount,
      cashAccountId: p.cashAccountId,
      bankAccountId: p.bankAccountId,
      contactId: p.contactId,
      accountName: null,
      changeGiven: p.changeGiven,
      createdAt: p.createdAt.toISOString(),
    }))
    return {
      id: o.id,
      clientRef: o.clientRef,
      sessionId: o.sessionId,
      registerId: o.registerId,
      branchId: o.branchId,
      salesChannelId: o.salesChannelId,
      orderType: o.orderType,
      tableId: o.tableId,
      contactId: o.contactId,
      contact: contact ? { id: contact.id, name: contact.name } : null,
      status: o.status,
      orderNo: o.orderNo,
      currencyCode: o.currencyCode,
      subtotal: o.subtotal,
      discountTotal: o.discountTotal,
      taxTotal: o.taxTotal,
      grandTotal: o.grandTotal,
      paidTotal: o.paidTotal,
      remainingTotal: round2(Math.max(0, o.grandTotal - o.paidTotal)),
      changeDue: o.changeDue,
      taxInclusive: o.taxInclusive,
      notes: o.notes,
      parentOrderId: o.parentOrderId,
      lines: lineDtos,
      payments: paymentDtos,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
    }
  }
}
