import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'

import type {
  ProductBundleComponentDto,
  SetProductBundleRequest,
} from '@turbohesap/shared'

import { Product } from './entities/product.entity'
import { ProductBundleComponent } from './entities/product-bundle-component.entity'

@Injectable()
export class ProductBundlesService {
  constructor(
    @InjectRepository(ProductBundleComponent)
    private readonly components: Repository<ProductBundleComponent>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
  ) {}

  async getForProduct(productId: string): Promise<ProductBundleComponentDto[]> {
    const rows = await this.components.find({
      where: { productId },
      order: { sortOrder: 'ASC' },
    })
    return this.decorate(rows)
  }

  async setForProduct(
    productId: string,
    dto: SetProductBundleRequest,
  ): Promise<ProductBundleComponentDto[]> {
    if (!(await this.products.findOne({ where: { id: productId } }))) {
      throw new NotFoundException('Ürün bulunamadı')
    }
    const components = dto.components ?? []
    const componentIds = [...new Set(components.map((c) => c.componentProductId))]
    if (componentIds.length) {
      const found = await this.products.count({ where: { id: In(componentIds) } })
      if (found !== componentIds.length) throw new BadRequestException('Geçersiz bileşen ürünü')
    }
    await this.components.delete({ productId })
    if (components.length) {
      await this.components.save(
        components.map((c, i) =>
          this.components.create({
            productId,
            componentProductId: c.componentProductId,
            componentVariantId: c.componentVariantId ?? null,
            qty: c.qty ?? 1,
            isFree: c.isFree ?? true,
            unitPrice: c.unitPrice ?? null,
            deductStock: c.deductStock ?? true,
            returnable: c.returnable ?? true,
            sortOrder: c.sortOrder ?? i,
          }),
        ),
      )
    }
    return this.getForProduct(productId)
  }

  /** productId → its bundle components (only products with ≥1 component). */
  async bundleMap(): Promise<Record<string, ProductBundleComponentDto[]>> {
    const rows = await this.components.find({ order: { sortOrder: 'ASC' } })
    const decorated = await this.decorate(rows)
    const map: Record<string, ProductBundleComponentDto[]> = {}
    for (const c of decorated) (map[c.productId] ??= []).push(c)
    return map
  }

  // Attach component display name/unit for the editor and cart preview.
  private async decorate(rows: ProductBundleComponent[]): Promise<ProductBundleComponentDto[]> {
    if (!rows.length) return []
    const productIds = [...new Set(rows.map((r) => r.componentProductId))]
    const products = await this.products.find({ where: { id: In(productIds) } })
    const nameMap = new Map(products.map((p) => [p.id, p]))
    return rows.map((r) => toBundleComponentDto(r, nameMap.get(r.componentProductId) ?? null))
  }
}

export function toBundleComponentDto(
  c: ProductBundleComponent,
  product: Product | null,
): ProductBundleComponentDto {
  return {
    id: c.id,
    productId: c.productId,
    componentProductId: c.componentProductId,
    componentVariantId: c.componentVariantId,
    componentName: product?.name ?? '',
    componentUnit: product?.unit ?? '',
    qty: c.qty,
    isFree: c.isFree,
    unitPrice: c.unitPrice,
    deductStock: c.deductStock,
    returnable: c.returnable,
    sortOrder: c.sortOrder,
  }
}
