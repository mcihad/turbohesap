import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, IsNull, Repository } from 'typeorm'

import type {
  BranchSummary,
  CategorySummary,
  ProductChannelPriceDto,
  ProductDto,
  ProductPackagingDto,
  ProductStockDto,
  ProductVariantDto,
  SalesChannelSummary,
  VariantAttribute,
} from '@turbohesap/shared'

import { Branch } from '../org/entities/branch.entity'
import { SalesChannel } from '../sales/entities/sales-channel.entity'
import { Category } from './entities/category.entity'
import { Product } from './entities/product.entity'
import { ProductChannelPrice } from './entities/product-channel-price.entity'
import { ProductPackaging } from './entities/product-packaging.entity'
import { ProductStock } from './entities/product-stock.entity'
import { ProductVariant } from './entities/product-variant.entity'
import { toCategorySummary } from './categories.service'
import type { CreateProductDto } from './dto/create-product.dto'
import type { UpdateProductDto } from './dto/update-product.dto'
import type {
  CreateProductVariantDto,
  GenerateVariantsDto,
  UpdateProductVariantDto,
} from './dto/product-variant.dto'
import type {
  CreateProductPackagingDto,
  UpdateProductPackagingDto,
} from './dto/product-packaging.dto'
import type { UpsertProductStockDto } from './dto/product-stock.dto'
import type { UpsertProductChannelPriceDto } from './dto/product-channel-price.dto'

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
    @InjectRepository(ProductVariant)
    private readonly variants: Repository<ProductVariant>,
    @InjectRepository(ProductPackaging)
    private readonly packagings: Repository<ProductPackaging>,
    @InjectRepository(ProductStock)
    private readonly stocks: Repository<ProductStock>,
    @InjectRepository(ProductChannelPrice)
    private readonly channelPrices: Repository<ProductChannelPrice>,
    @InjectRepository(Branch) private readonly branches: Repository<Branch>,
    @InjectRepository(SalesChannel)
    private readonly channels: Repository<SalesChannel>,
  ) {}

  // List — lightweight: embeds are empty, but `totalStock` and `variantCount`
  // are aggregated so the table can show them.
  async list(categoryId?: string): Promise<ProductDto[]> {
    const rows = await this.products.find({
      where: categoryId ? { categoryId } : {},
      order: { name: 'ASC' },
    })
    if (rows.length === 0) return []
    const ids = rows.map((p) => p.id)
    const cats = await this.categoryMap(rows.map((p) => p.categoryId))

    const stockRows = await this.stocks.find({ where: { productId: In(ids) } })
    const stockByProduct = new Map<string, number>()
    for (const s of stockRows) {
      stockByProduct.set(s.productId, (stockByProduct.get(s.productId) ?? 0) + s.quantity)
    }

    const variantRows = await this.variants.find({
      where: { productId: In(ids) },
      select: { id: true, productId: true, barcode: true },
    })
    const variantCountByProduct = new Map<string, number>()
    const barcodesByProduct = new Map<string, Set<string>>()
    const addBarcode = (productId: string, code: string) => {
      if (!code) return
      const set = barcodesByProduct.get(productId) ?? new Set<string>()
      set.add(code)
      barcodesByProduct.set(productId, set)
    }
    for (const p of rows) addBarcode(p.id, p.barcode)
    for (const v of variantRows) {
      variantCountByProduct.set(v.productId, (variantCountByProduct.get(v.productId) ?? 0) + 1)
      addBarcode(v.productId, v.barcode)
    }

    const packagingRows = await this.packagings.find({
      where: { productId: In(ids) },
      select: { id: true, productId: true, barcode: true },
    })
    for (const pk of packagingRows) addBarcode(pk.productId, pk.barcode)

    const channelPriceRows = await this.channelPrices.find({
      where: { productId: In(ids) },
      select: { id: true, productId: true, channelId: true },
    })
    const channelIdsByProduct = new Map<string, Set<string>>()
    for (const cp of channelPriceRows) {
      const set = channelIdsByProduct.get(cp.productId) ?? new Set<string>()
      set.add(cp.channelId)
      channelIdsByProduct.set(cp.productId, set)
    }

    return rows.map((p) =>
      toProductDto(p, p.categoryId ? cats.get(p.categoryId) ?? null : null, {
        totalStock: stockByProduct.has(p.id) ? stockByProduct.get(p.id)! : p.quantity,
        variantCount: variantCountByProduct.get(p.id) ?? 0,
        barcodes: [...(barcodesByProduct.get(p.id) ?? [])],
        channelIds: [...(channelIdsByProduct.get(p.id) ?? [])],
      }),
    )
  }

  // Detail — full embeds (variants, packagings, stock, channel prices).
  async get(id: string): Promise<ProductDto> {
    const product = await this.findOrFail(id)
    const category = product.categoryId
      ? await this.categories.findOne({ where: { id: product.categoryId } })
      : null

    const [variantRows, packagingRows, stockRows, channelPriceRows] =
      await Promise.all([
        this.variants.find({
          where: { productId: id },
          order: { sortOrder: 'ASC', code: 'ASC' },
        }),
        this.packagings.find({
          where: { productId: id },
          order: { sortOrder: 'ASC', quantity: 'ASC' },
        }),
        this.stocks.find({ where: { productId: id } }),
        this.channelPrices.find({ where: { productId: id } }),
      ])

    // Variant id → label, effective price, for embedding into stock/prices/packs.
    const labelByVariant = new Map<string, string>()
    const effPriceByVariant = new Map<string, number | null>()
    for (const v of variantRows) {
      labelByVariant.set(v.id, variantLabel(v.attributeValues, product.variantAttributes))
      effPriceByVariant.set(v.id, effectiveVariantPrice(v, product.salePrice))
    }

    const variants = variantRows.map((v) =>
      toVariantDto(v, product.salePrice, product.variantAttributes),
    )

    const packagings = packagingRows.map((pk) => {
      const baseUnit = pk.variantId
        ? effPriceByVariant.get(pk.variantId) ?? product.salePrice
        : product.salePrice
      return toPackagingDto(pk, baseUnit, pk.variantId ? labelByVariant.get(pk.variantId) ?? null : null)
    })

    const branchSummaries = await this.branchMap(stockRows.map((s) => s.branchId))
    const stock = stockRows.map((s) =>
      toStockDto(
        s,
        s.branchId ? branchSummaries.get(s.branchId) ?? null : null,
        s.variantId ? labelByVariant.get(s.variantId) ?? null : null,
      ),
    )

    const channelSummaries = await this.channelMap(
      channelPriceRows.map((cp) => cp.channelId),
    )
    const channelPrices = channelPriceRows.map((cp) =>
      toChannelPriceDto(
        cp,
        channelSummaries.get(cp.channelId) ?? null,
        cp.variantId ? labelByVariant.get(cp.variantId) ?? null : null,
      ),
    )

    const totalStock = stockRows.length
      ? stockRows.reduce((sum, s) => sum + s.quantity, 0)
      : product.quantity

    const barcodes = [
      ...new Set(
        [
          product.barcode,
          ...variantRows.map((v) => v.barcode),
          ...packagingRows.map((pk) => pk.barcode),
        ].filter(Boolean),
      ),
    ]
    const channelIds = [...new Set(channelPriceRows.map((cp) => cp.channelId))]

    return toProductDto(product, category ? toCategorySummary(category) : null, {
      variants,
      packagings,
      stock,
      channelPrices,
      totalStock,
      variantCount: variantRows.length,
      barcodes,
      channelIds,
    })
  }

  async create(dto: CreateProductDto): Promise<ProductDto> {
    const exists = await this.products.findOne({ where: { code: dto.code.trim() } })
    if (exists) throw new BadRequestException('Bu stok kodu zaten kullanımda')
    if (dto.categoryId) await this.requireCategory(dto.categoryId)

    const { code, name, attributes, categoryId, variantAttributes, ...rest } = dto
    const product = this.products.create({
      ...rest,
      code: code.trim(),
      name: name.trim(),
      categoryId: categoryId ?? null,
      variantAttributes: variantAttributes ?? [],
      attributes: attributes ?? {},
    })
    return this.get((await this.products.save(product)).id)
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductDto> {
    const product = await this.findOrFail(id)
    if (dto.code && dto.code.trim() !== product.code) {
      const clash = await this.products.findOne({ where: { code: dto.code.trim() } })
      if (clash && clash.id !== id) {
        throw new BadRequestException('Bu stok kodu zaten kullanımda')
      }
    }
    if (dto.categoryId) await this.requireCategory(dto.categoryId)

    const { attributes, variantAttributes, ...rest } = dto
    Object.assign(product, rest)
    if (dto.code !== undefined) product.code = dto.code.trim()
    if (dto.name !== undefined) product.name = dto.name.trim()
    if (dto.categoryId !== undefined) product.categoryId = dto.categoryId ?? null
    if (variantAttributes !== undefined) product.variantAttributes = variantAttributes
    if (attributes !== undefined) product.attributes = attributes
    await this.products.save(product)
    return this.get(id)
  }

  async remove(id: string): Promise<void> {
    const product = await this.findOrFail(id)
    // Cascade — sibling tables have no DB-level FK (repo convention).
    await this.variants.delete({ productId: id })
    await this.packagings.delete({ productId: id })
    await this.stocks.delete({ productId: id })
    await this.channelPrices.delete({ productId: id })
    await this.products.remove(product)
  }

  // --- Variants ----------------------------------------------------------
  async createVariant(
    productId: string,
    dto: CreateProductVariantDto,
  ): Promise<ProductVariantDto> {
    const product = await this.findOrFail(productId)
    const code = dto.code?.trim() || (await this.nextVariantCode(product, dto.attributeValues))
    await this.requireVariantCodeFree(code, null)
    const variant = this.variants.create({
      productId,
      code,
      barcode: dto.barcode ?? '',
      attributeValues: dto.attributeValues ?? {},
      priceExtra: dto.priceExtra ?? 0,
      salePrice: dto.salePrice ?? null,
      purchasePrice: dto.purchasePrice ?? null,
      isActive: dto.isActive ?? true,
      imageUrl: dto.imageUrl ?? '',
      sortOrder: dto.sortOrder ?? 0,
    })
    const saved = await this.variants.save(variant)
    return toVariantDto(saved, product.salePrice, product.variantAttributes)
  }

  async updateVariant(
    productId: string,
    variantId: string,
    dto: UpdateProductVariantDto,
  ): Promise<ProductVariantDto> {
    const product = await this.findOrFail(productId)
    const variant = await this.requireVariant(productId, variantId)
    if (dto.code && dto.code.trim() !== variant.code) {
      await this.requireVariantCodeFree(dto.code.trim(), variantId)
      variant.code = dto.code.trim()
    }
    if (dto.barcode !== undefined) variant.barcode = dto.barcode
    if (dto.attributeValues !== undefined) variant.attributeValues = dto.attributeValues
    if (dto.priceExtra !== undefined) variant.priceExtra = dto.priceExtra
    if (dto.salePrice !== undefined) variant.salePrice = dto.salePrice ?? null
    if (dto.purchasePrice !== undefined) variant.purchasePrice = dto.purchasePrice ?? null
    if (dto.isActive !== undefined) variant.isActive = dto.isActive
    if (dto.imageUrl !== undefined) variant.imageUrl = dto.imageUrl
    if (dto.sortOrder !== undefined) variant.sortOrder = dto.sortOrder
    const saved = await this.variants.save(variant)
    return toVariantDto(saved, product.salePrice, product.variantAttributes)
  }

  async removeVariant(productId: string, variantId: string): Promise<void> {
    await this.requireVariant(productId, variantId)
    // Detach dependent stock/prices/packagings pinned to this variant.
    await this.stocks.delete({ productId, variantId })
    await this.channelPrices.delete({ productId, variantId })
    await this.packagings.delete({ productId, variantId })
    await this.variants.delete({ id: variantId })
  }

  // Create every missing attribute combination from `variantAttributes`.
  async generateVariants(
    productId: string,
    dto?: GenerateVariantsDto,
  ): Promise<ProductVariantDto[]> {
    const product = await this.findOrFail(productId)
    const axes = (product.variantAttributes ?? []).filter(
      (a) => a.name && a.values?.length,
    )
    if (axes.length === 0) {
      throw new BadRequestException(
        'Varyant üretmek için ürünün varyant özellikleri tanımlı olmalı',
      )
    }

    const combos = cartesian(axes)
    const existing = await this.variants.find({ where: { productId } })
    const existingKeys = new Set(existing.map((v) => comboKey(v.attributeValues, axes)))

    const created: ProductVariant[] = []
    let order = existing.length
    for (const combo of combos) {
      const key = comboKey(combo, axes)
      if (existingKeys.has(key)) continue
      const code = await this.nextVariantCode(product, combo)
      created.push(
        this.variants.create({
          productId,
          code,
          barcode: '',
          attributeValues: combo,
          priceExtra: 0,
          salePrice: null,
          purchasePrice: null,
          isActive: true,
          imageUrl: '',
          sortOrder: order++,
        }),
      )
      existingKeys.add(key)
    }
    if (created.length) await this.variants.save(created)

    if (dto?.pruneInvalid) {
      const validKeys = new Set(combos.map((c) => comboKey(c, axes)))
      const stale = existing.filter(
        (v) => v.isActive && !validKeys.has(comboKey(v.attributeValues, axes)),
      )
      for (const v of stale) v.isActive = false
      if (stale.length) await this.variants.save(stale)
    }

    if (!product.hasVariants) {
      product.hasVariants = true
      await this.products.save(product)
    }

    const all = await this.variants.find({
      where: { productId },
      order: { sortOrder: 'ASC', code: 'ASC' },
    })
    return all.map((v) => toVariantDto(v, product.salePrice, product.variantAttributes))
  }

  // --- Packagings --------------------------------------------------------
  async createPackaging(
    productId: string,
    dto: CreateProductPackagingDto,
  ): Promise<ProductPackagingDto> {
    const product = await this.findOrFail(productId)
    let baseUnit = product.salePrice
    let label: string | null = null
    if (dto.variantId) {
      const v = await this.requireVariant(productId, dto.variantId)
      baseUnit = effectiveVariantPrice(v, product.salePrice)
      label = variantLabel(v.attributeValues, product.variantAttributes)
    }
    const pk = this.packagings.create({
      productId,
      variantId: dto.variantId ?? null,
      name: dto.name.trim(),
      unit: dto.unit ?? '',
      quantity: dto.quantity,
      barcode: dto.barcode ?? '',
      salePrice: dto.salePrice ?? null,
      purchasePrice: dto.purchasePrice ?? null,
      isActive: dto.isActive ?? true,
      sortOrder: dto.sortOrder ?? 0,
    })
    const saved = await this.packagings.save(pk)
    return toPackagingDto(saved, baseUnit, label)
  }

  async updatePackaging(
    productId: string,
    packagingId: string,
    dto: UpdateProductPackagingDto,
  ): Promise<ProductPackagingDto> {
    const product = await this.findOrFail(productId)
    const pk = await this.requirePackaging(productId, packagingId)
    if (dto.variantId !== undefined) {
      if (dto.variantId) await this.requireVariant(productId, dto.variantId)
      pk.variantId = dto.variantId ?? null
    }
    if (dto.name !== undefined) pk.name = dto.name.trim()
    if (dto.unit !== undefined) pk.unit = dto.unit
    if (dto.quantity !== undefined) pk.quantity = dto.quantity
    if (dto.barcode !== undefined) pk.barcode = dto.barcode
    if (dto.salePrice !== undefined) pk.salePrice = dto.salePrice ?? null
    if (dto.purchasePrice !== undefined) pk.purchasePrice = dto.purchasePrice ?? null
    if (dto.isActive !== undefined) pk.isActive = dto.isActive
    if (dto.sortOrder !== undefined) pk.sortOrder = dto.sortOrder
    const saved = await this.packagings.save(pk)

    let baseUnit = product.salePrice
    let label: string | null = null
    if (saved.variantId) {
      const v = await this.variants.findOne({ where: { id: saved.variantId } })
      if (v) {
        baseUnit = effectiveVariantPrice(v, product.salePrice)
        label = variantLabel(v.attributeValues, product.variantAttributes)
      }
    }
    return toPackagingDto(saved, baseUnit, label)
  }

  async removePackaging(productId: string, packagingId: string): Promise<void> {
    await this.requirePackaging(productId, packagingId)
    await this.packagings.delete({ id: packagingId })
  }

  // --- Per-branch stock --------------------------------------------------
  async setStock(
    productId: string,
    dto: UpsertProductStockDto,
  ): Promise<ProductStockDto> {
    await this.findOrFail(productId)
    const variantId = dto.variantId ?? null
    const branchId = dto.branchId ?? null
    if (variantId) await this.requireVariant(productId, variantId)
    let branch: Branch | null = null
    if (branchId) {
      branch = await this.branches.findOne({ where: { id: branchId } })
      if (!branch) throw new BadRequestException('Geçersiz şube')
    }

    // One row per (product, variant, branch) — find-or-create, then set absolute.
    // NULLs need IsNull() in TypeORM where-clauses.
    let row = await this.stocks.findOne({
      where: {
        productId,
        variantId: variantId ?? IsNull(),
        branchId: branchId ?? IsNull(),
      },
    })
    if (!row) {
      row = this.stocks.create({ productId, variantId, branchId, quantity: dto.quantity })
    } else {
      row.quantity = dto.quantity
    }
    const saved = await this.stocks.save(row)

    const variantLabelStr = variantId
      ? await this.variantLabelById(productId, variantId)
      : null
    return toStockDto(saved, branch ? toBranchSummary(branch) : null, variantLabelStr)
  }

  async removeStock(productId: string, stockId: string): Promise<void> {
    const row = await this.stocks.findOne({ where: { id: stockId, productId } })
    if (!row) throw new NotFoundException('Stok kaydı bulunamadı')
    await this.stocks.delete({ id: stockId })
  }

  // --- Per-channel prices ------------------------------------------------
  async setChannelPrice(
    productId: string,
    dto: UpsertProductChannelPriceDto,
  ): Promise<ProductChannelPriceDto> {
    await this.findOrFail(productId)
    const variantId = dto.variantId ?? null
    if (variantId) await this.requireVariant(productId, variantId)
    const channel = await this.channels.findOne({ where: { id: dto.channelId } })
    if (!channel) throw new BadRequestException('Geçersiz satış kanalı')

    let row = await this.channelPrices.findOne({
      where: { productId, variantId: variantId ?? IsNull(), channelId: dto.channelId },
    })
    if (!row) {
      row = this.channelPrices.create({
        productId,
        variantId,
        channelId: dto.channelId,
        salePrice: dto.salePrice,
        currency: dto.currency ?? null,
        isActive: dto.isActive ?? true,
      })
    } else {
      row.salePrice = dto.salePrice
      if (dto.currency !== undefined) row.currency = dto.currency ?? null
      if (dto.isActive !== undefined) row.isActive = dto.isActive
    }
    const saved = await this.channelPrices.save(row)

    const variantLabelStr = variantId
      ? await this.variantLabelById(productId, variantId)
      : null
    return toChannelPriceDto(saved, toSalesChannelSummary(channel), variantLabelStr)
  }

  async removeChannelPrice(
    productId: string,
    channelPriceId: string,
  ): Promise<void> {
    const row = await this.channelPrices.findOne({
      where: { id: channelPriceId, productId },
    })
    if (!row) throw new NotFoundException('Kanal fiyatı bulunamadı')
    await this.channelPrices.delete({ id: channelPriceId })
  }

  // --- Helpers -----------------------------------------------------------
  private async findOrFail(id: string): Promise<Product> {
    const product = await this.products.findOne({ where: { id } })
    if (!product) throw new NotFoundException('Ürün bulunamadı')
    return product
  }

  private async requireCategory(id: string): Promise<void> {
    const exists = await this.categories.findOne({ where: { id }, select: { id: true } })
    if (!exists) throw new BadRequestException('Geçersiz kategori')
  }

  private async requireVariant(
    productId: string,
    variantId: string,
  ): Promise<ProductVariant> {
    const v = await this.variants.findOne({ where: { id: variantId, productId } })
    if (!v) throw new NotFoundException('Varyant bulunamadı')
    return v
  }

  private async requirePackaging(
    productId: string,
    packagingId: string,
  ): Promise<ProductPackaging> {
    const pk = await this.packagings.findOne({ where: { id: packagingId, productId } })
    if (!pk) throw new NotFoundException('Paket bulunamadı')
    return pk
  }

  private async requireVariantCodeFree(
    code: string,
    exceptId: string | null,
  ): Promise<void> {
    const clash = await this.variants.findOne({ where: { code } })
    if (clash && clash.id !== exceptId) {
      throw new BadRequestException('Bu varyant kodu zaten kullanımda')
    }
  }

  // Build a readable, unique variant SKU: <product.code>-<VAL-VAL> (+counter).
  private async nextVariantCode(
    product: Product,
    values: Record<string, string>,
  ): Promise<string> {
    const slug = Object.values(values)
      .map((v) => String(v).toUpperCase().replace(/[^A-Z0-9]+/g, ''))
      .filter(Boolean)
      .join('-')
    const base = slug ? `${product.code}-${slug}` : `${product.code}-V`
    let code = base
    let n = 1
    while (await this.variants.findOne({ where: { code }, select: { id: true } })) {
      code = `${base}-${n++}`
    }
    return code
  }

  private async variantLabelById(
    productId: string,
    variantId: string,
  ): Promise<string | null> {
    const v = await this.variants.findOne({ where: { id: variantId, productId } })
    if (!v) return null
    const product = await this.products.findOne({ where: { id: productId } })
    return variantLabel(v.attributeValues, product?.variantAttributes)
  }

  private async categoryMap(
    ids: Array<string | null>,
  ): Promise<Map<string, CategorySummary>> {
    const unique = [...new Set(ids.filter((x): x is string => !!x))]
    const map = new Map<string, CategorySummary>()
    if (unique.length === 0) return map
    const cats = await this.categories.find({ where: { id: In(unique) } })
    for (const c of cats) map.set(c.id, toCategorySummary(c))
    return map
  }

  private async branchMap(
    ids: Array<string | null>,
  ): Promise<Map<string, BranchSummary>> {
    const unique = [...new Set(ids.filter((x): x is string => !!x))]
    const map = new Map<string, BranchSummary>()
    if (unique.length === 0) return map
    const rows = await this.branches.find({ where: { id: In(unique) } })
    for (const b of rows) map.set(b.id, toBranchSummary(b))
    return map
  }

  private async channelMap(
    ids: string[],
  ): Promise<Map<string, SalesChannelSummary>> {
    const unique = [...new Set(ids.filter(Boolean))]
    const map = new Map<string, SalesChannelSummary>()
    if (unique.length === 0) return map
    const rows = await this.channels.find({ where: { id: In(unique) } })
    for (const c of rows) map.set(c.id, toSalesChannelSummary(c))
    return map
  }
}

// --- Pure mappers / pricing rules ----------------------------------------

// Resolved unit sale price for a variant: explicit override, else
// template price + priceExtra (null when the template has no price).
function effectiveVariantPrice(
  v: ProductVariant,
  basePrice: number | null,
): number | null {
  if (v.salePrice != null) return v.salePrice
  if (basePrice == null) return v.priceExtra ? v.priceExtra : null
  return basePrice + (v.priceExtra ?? 0)
}

// Resolved pack price: explicit override, else quantity × base unit price.
function effectivePackagingPrice(
  pk: ProductPackaging,
  baseUnitPrice: number | null,
): number | null {
  if (pk.salePrice != null) return pk.salePrice
  if (baseUnitPrice == null) return null
  return baseUnitPrice * pk.quantity
}

// "Kırmızı / M" — values joined in the order of the template's attributes.
function variantLabel(
  values: Record<string, string>,
  attrs?: VariantAttribute[],
): string {
  const order = attrs?.length ? attrs.map((a) => a.name) : Object.keys(values)
  const parts = order.map((k) => values[k]).filter(Boolean)
  return parts.length ? parts.join(' / ') : Object.values(values).filter(Boolean).join(' / ')
}

// Cartesian product of the attribute axes → array of { name: value } maps.
function cartesian(axes: VariantAttribute[]): Array<Record<string, string>> {
  return axes.reduce<Array<Record<string, string>>>(
    (acc, axis) => {
      const next: Array<Record<string, string>> = []
      for (const combo of acc) {
        for (const value of axis.values) {
          next.push({ ...combo, [axis.name]: value })
        }
      }
      return next
    },
    [{}],
  )
}

// Stable identity for a combination, so duplicates are detected regardless of
// key order or extra keys.
function comboKey(
  values: Record<string, string>,
  axes: VariantAttribute[],
): string {
  return axes.map((a) => `${a.name}=${values[a.name] ?? ''}`).join('|')
}

export function toVariantDto(
  v: ProductVariant,
  basePrice: number | null,
  attrs?: VariantAttribute[],
): ProductVariantDto {
  return {
    id: v.id,
    productId: v.productId,
    code: v.code,
    barcode: v.barcode,
    attributeValues: v.attributeValues ?? {},
    label: variantLabel(v.attributeValues ?? {}, attrs),
    priceExtra: v.priceExtra,
    salePrice: v.salePrice,
    purchasePrice: v.purchasePrice,
    effectiveSalePrice: effectiveVariantPrice(v, basePrice),
    isActive: v.isActive,
    imageUrl: v.imageUrl,
    sortOrder: v.sortOrder,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  }
}

export function toPackagingDto(
  pk: ProductPackaging,
  baseUnitPrice: number | null,
  variantLabelStr: string | null,
): ProductPackagingDto {
  return {
    id: pk.id,
    productId: pk.productId,
    variantId: pk.variantId,
    variantLabel: variantLabelStr,
    name: pk.name,
    unit: pk.unit,
    quantity: pk.quantity,
    barcode: pk.barcode,
    salePrice: pk.salePrice,
    purchasePrice: pk.purchasePrice,
    effectiveSalePrice: effectivePackagingPrice(pk, baseUnitPrice),
    isActive: pk.isActive,
    sortOrder: pk.sortOrder,
    createdAt: pk.createdAt.toISOString(),
    updatedAt: pk.updatedAt.toISOString(),
  }
}

export function toStockDto(
  s: ProductStock,
  branch: BranchSummary | null,
  variantLabelStr: string | null,
): ProductStockDto {
  return {
    id: s.id,
    productId: s.productId,
    variantId: s.variantId,
    variantLabel: variantLabelStr,
    branchId: s.branchId,
    branch,
    quantity: s.quantity,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }
}

export function toChannelPriceDto(
  cp: ProductChannelPrice,
  channel: SalesChannelSummary | null,
  variantLabelStr: string | null,
): ProductChannelPriceDto {
  return {
    id: cp.id,
    productId: cp.productId,
    variantId: cp.variantId,
    variantLabel: variantLabelStr,
    channelId: cp.channelId,
    channel,
    salePrice: cp.salePrice,
    currency: cp.currency,
    isActive: cp.isActive,
    createdAt: cp.createdAt.toISOString(),
    updatedAt: cp.updatedAt.toISOString(),
  }
}

function toBranchSummary(b: Branch): BranchSummary {
  return { id: b.id, code: b.code, name: b.name, city: b.city }
}

function toSalesChannelSummary(c: SalesChannel): SalesChannelSummary {
  return { id: c.id, code: c.code, name: c.name, type: c.type }
}

export function toProductDto(
  p: Product,
  category: CategorySummary | null,
  opts?: {
    variants?: ProductVariantDto[]
    packagings?: ProductPackagingDto[]
    stock?: ProductStockDto[]
    channelPrices?: ProductChannelPriceDto[]
    totalStock?: number
    variantCount?: number
    barcodes?: string[]
    channelIds?: string[]
  },
): ProductDto {
  return {
    id: p.id,
    code: p.code,
    name: p.name,
    description: p.description,
    barcode: p.barcode,
    barcodes: opts?.barcodes ?? (p.barcode ? [p.barcode] : []),
    brand: p.brand,
    type: p.type,
    trackStock: p.trackStock,
    categoryId: p.categoryId,
    category,
    unit: p.unit,
    hasVariants: p.hasVariants,
    variantAttributes: p.variantAttributes ?? [],
    variantCount: opts?.variantCount ?? 0,
    purchasePrice: p.purchasePrice,
    salePrice: p.salePrice,
    taxRate: p.taxRate,
    currency: p.currency,
    quantity: p.quantity,
    minQuantity: p.minQuantity,
    totalStock: opts?.totalStock ?? p.quantity,
    weight: p.weight,
    imageUrl: p.imageUrl,
    isActive: p.isActive,
    attributes: p.attributes ?? {},
    channelIds: opts?.channelIds ?? [],
    variants: opts?.variants ?? [],
    packagings: opts?.packagings ?? [],
    stock: opts?.stock ?? [],
    channelPrices: opts?.channelPrices ?? [],
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }
}
