import { Body, Controller, Get, Param, Put } from '@nestjs/common'

import {
  InventoryPermissions,
  type RecipeComponentDto,
} from '@turbohesap/shared'

import { RequirePermissions } from '../../common/decorators/permissions.decorator'
import { RecipesService } from './recipes.service'
import { SetProductRecipeDto } from './dto/product-recipe.dto'

@Controller('inventory')
export class RecipesController {
  constructor(private readonly recipes: RecipesService) {}

  // NOT under products/* — that path is owned by the products controller's
  // :id route, which would capture "recipe-map" as a productId (500).
  @Get('recipe-map')
  @RequirePermissions(InventoryPermissions.productsRead)
  recipeMap(): Promise<Record<string, RecipeComponentDto[]>> {
    return this.recipes.recipeMap()
  }

  @Get('products/:productId/recipe')
  @RequirePermissions(InventoryPermissions.productsRead)
  getForProduct(@Param('productId') productId: string): Promise<RecipeComponentDto[]> {
    return this.recipes.getForProduct(productId)
  }

  @Put('products/:productId/recipe')
  @RequirePermissions(InventoryPermissions.productsWrite)
  setForProduct(
    @Param('productId') productId: string,
    @Body() dto: SetProductRecipeDto,
  ): Promise<RecipeComponentDto[]> {
    return this.recipes.setForProduct(productId, dto)
  }
}
