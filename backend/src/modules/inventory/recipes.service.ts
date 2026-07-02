import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { EntityManager, In, Repository } from 'typeorm'

import type {
  RecipeComponentDto,
  SetProductRecipeRequest,
} from '@turbohesap/shared'

import { Product } from './entities/product.entity'
import { ProductRecipeComponent } from './entities/product-recipe-component.entity'
import { StockMovementsService } from './stock-movements.service'
import { StockMovementTypesService } from './stock-movement-types.service'
import { CostService } from './cost.service'

function round4(n: number): number {
  return Math.round(n * 1e4) / 1e4
}

/** One sold line's context for consuming its product's recipe ingredients. */
export interface RecipeConsumeParams {
  productId: string
  variantId?: string | null
  branchId: string | null
  /** Sold quantity of the parent — each ingredient is consumed × this. */
  multiplier: number
  date: string
  sourceModule: string
  sourceId: string
}

@Injectable()
export class RecipesService {
  constructor(
    @InjectRepository(ProductRecipeComponent)
    private readonly components: Repository<ProductRecipeComponent>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    private readonly stockMovements: StockMovementsService,
    private readonly movementTypes: StockMovementTypesService,
    private readonly cost: CostService,
  ) {}

  async getForProduct(productId: string): Promise<RecipeComponentDto[]> {
    const rows = await this.components.find({ where: { productId }, order: { sortOrder: 'ASC' } })
    return this.decorate(rows)
  }

  async setForProduct(
    productId: string,
    dto: SetProductRecipeRequest,
  ): Promise<RecipeComponentDto[]> {
    if (!(await this.products.findOne({ where: { id: productId } }))) {
      throw new NotFoundException('Ürün bulunamadı')
    }
    const components = dto.components ?? []
    const componentIds = [...new Set(components.map((c) => c.componentProductId))]
    if (componentIds.length) {
      const found = await this.products.count({ where: { id: In(componentIds) } })
      if (found !== componentIds.length) throw new BadRequestException('Geçersiz malzeme ürünü')
    }
    await this.components.delete({ productId })
    if (components.length) {
      await this.components.save(
        components.map((c, i) =>
          this.components.create({
            productId,
            componentProductId: c.componentProductId,
            componentVariantId: c.componentVariantId ?? null,
            quantity: c.quantity ?? 1,
            unit: c.unit ?? null,
            sortOrder: c.sortOrder ?? i,
          }),
        ),
      )
    }
    return this.getForProduct(productId)
  }

  /** productId → its recipe components (only products with ≥1 ingredient). */
  async recipeMap(): Promise<Record<string, RecipeComponentDto[]>> {
    const rows = await this.components.find({ order: { sortOrder: 'ASC' } })
    const decorated = await this.decorate(rows)
    const map: Record<string, RecipeComponentDto[]> = {}
    for (const c of decorated) (map[c.productId] ??= []).push(c)
    return map
  }

  /**
   * Silently backflush a sold product's recipe ingredients from stock, inside
   * the caller's transaction. Posts one 'Reçete Sarf' OUT per ingredient at
   * `quantity × multiplier`, valued at ingredient AVCO. Non-stocked ingredients
   * are skipped (no movement). Never blocks: an ingredient driven below zero
   * still posts, but yields a Turkish warning in the returned array. Recipes do
   * NOT nest — an ingredient's own recipe is not expanded.
   */
  async consume(em: EntityManager, params: RecipeConsumeParams): Promise<string[]> {
    const rows = await em
      .getRepository(ProductRecipeComponent)
      .find({ where: { productId: params.productId }, order: { sortOrder: 'ASC' } })
    if (!rows.length) return []

    const ingredientIds = [...new Set(rows.map((r) => r.componentProductId))]
    const ingredients = await em.getRepository(Product).find({ where: { id: In(ingredientIds) } })
    const ingMap = new Map(ingredients.map((p) => [p.id, p]))
    const typeId = await this.movementTypes.systemTypeId('Reçete Sarf', 'out')

    const warnings: string[] = []
    for (const r of rows) {
      const consumeQty = round4(r.quantity * params.multiplier)
      if (consumeQty <= 0) continue
      const ing = ingMap.get(r.componentProductId) ?? null
      // A non-stocked ingredient (e.g. a service item) is skipped entirely —
      // no phantom movement, mirroring production consumption.
      if (ing?.trackStock === false) continue

      const unitCost = await this.cost.getUnitCost(
        r.componentProductId,
        r.componentVariantId,
        params.branchId,
        em,
      )
      const onHand = await this.stockMovements.onHand(
        em,
        r.componentProductId,
        r.componentVariantId,
        params.branchId,
      )
      if (onHand - consumeQty < 0) {
        const name = ing?.name ?? 'malzeme'
        warnings.push(
          `Yetersiz stok: ${name} (mevcut ${round4(onHand)}, gereken ${consumeQty}) — negatif bakiyeye düşüldü`,
        )
      }
      await this.stockMovements.post(em, {
        productId: r.componentProductId,
        variantId: r.componentVariantId,
        branchId: params.branchId,
        movementTypeId: typeId,
        direction: 'out',
        quantity: consumeQty,
        unit: r.unit ?? ing?.unit ?? 'Adet',
        date: params.date,
        unitCost,
        description: 'Reçete sarfı',
        sourceModule: params.sourceModule,
        sourceId: params.sourceId,
      })
    }
    return warnings
  }

  private async decorate(rows: ProductRecipeComponent[]): Promise<RecipeComponentDto[]> {
    if (!rows.length) return []
    const productIds = [...new Set(rows.map((r) => r.componentProductId))]
    const products = await this.products.find({ where: { id: In(productIds) } })
    const nameMap = new Map(products.map((p) => [p.id, p]))
    return rows.map((r) => toRecipeComponentDto(r, nameMap.get(r.componentProductId) ?? null))
  }
}

export function toRecipeComponentDto(
  c: ProductRecipeComponent,
  product: Product | null,
): RecipeComponentDto {
  return {
    id: c.id,
    productId: c.productId,
    componentProductId: c.componentProductId,
    componentVariantId: c.componentVariantId,
    componentName: product?.name ?? '',
    componentUnit: product?.unit ?? '',
    quantity: c.quantity,
    unit: c.unit,
    sortOrder: c.sortOrder,
  }
}
