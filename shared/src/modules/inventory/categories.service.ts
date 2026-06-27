import type {
  CategoryDto,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from './category.dto'

// Contract for the inventory categories resource (/api/inventory/categories).
// Returns a flat list (with parentId); clients build the tree.
export interface ICategoriesService {
  list(): Promise<CategoryDto[]>
  get(id: string): Promise<CategoryDto>
  create(input: CreateCategoryRequest): Promise<CategoryDto>
  update(id: string, input: UpdateCategoryRequest): Promise<CategoryDto>
  remove(id: string): Promise<void>
}
