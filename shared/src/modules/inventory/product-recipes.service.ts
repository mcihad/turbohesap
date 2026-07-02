import type {
  RecipeComponentDto,
  SetProductRecipeRequest,
} from './product-recipe.dto'

// Contract for a product's recipe ingredients (/inventory/products/:id/recipe)
// plus a bulk map for POS preloading (which products have a recipe).
export interface IProductRecipesService {
  /** Recipe ingredients configured for a product. */
  getForProduct(productId: string): Promise<RecipeComponentDto[]>
  /** Replace the full ingredient set for a product. */
  setForProduct(
    productId: string,
    input: SetProductRecipeRequest,
  ): Promise<RecipeComponentDto[]>
  /** productId → its recipe components (only products with ≥1 ingredient). */
  recipeMap(): Promise<Record<string, RecipeComponentDto[]>>
}
