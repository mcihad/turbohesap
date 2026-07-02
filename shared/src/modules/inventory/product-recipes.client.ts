import type { AxiosInstance } from 'axios'

import type {
  RecipeComponentDto,
  SetProductRecipeRequest,
} from './product-recipe.dto'
import type { IProductRecipesService } from './product-recipes.service'

// Axios implementation → /api/inventory. The recipe-map route is deliberately
// NOT under products/* so the products `:id` route does not shadow it.
export class ProductRecipesApiClient implements IProductRecipesService {
  constructor(private readonly http: AxiosInstance) {}

  async getForProduct(productId: string): Promise<RecipeComponentDto[]> {
    return (
      await this.http.get<RecipeComponentDto[]>(
        `/inventory/products/${productId}/recipe`,
      )
    ).data
  }

  async setForProduct(
    productId: string,
    input: SetProductRecipeRequest,
  ): Promise<RecipeComponentDto[]> {
    return (
      await this.http.put<RecipeComponentDto[]>(
        `/inventory/products/${productId}/recipe`,
        input,
      )
    ).data
  }

  async recipeMap(): Promise<Record<string, RecipeComponentDto[]>> {
    return (
      await this.http.get<Record<string, RecipeComponentDto[]>>(
        '/inventory/recipe-map',
      )
    ).data
  }
}
