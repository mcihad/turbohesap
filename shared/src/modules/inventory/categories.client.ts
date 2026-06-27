import type { AxiosInstance } from 'axios'

import type {
  CategoryDto,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from './category.dto'
import type { ICategoriesService } from './categories.service'

// Axios implementation → /api/inventory/categories.
export class CategoriesApiClient implements ICategoriesService {
  constructor(private readonly http: AxiosInstance) {}

  async list(): Promise<CategoryDto[]> {
    return (await this.http.get<CategoryDto[]>('/inventory/categories')).data
  }

  async get(id: string): Promise<CategoryDto> {
    return (await this.http.get<CategoryDto>(`/inventory/categories/${id}`)).data
  }

  async create(input: CreateCategoryRequest): Promise<CategoryDto> {
    return (await this.http.post<CategoryDto>('/inventory/categories', input))
      .data
  }

  async update(
    id: string,
    input: UpdateCategoryRequest,
  ): Promise<CategoryDto> {
    return (
      await this.http.patch<CategoryDto>(`/inventory/categories/${id}`, input)
    ).data
  }

  async remove(id: string): Promise<void> {
    await this.http.delete(`/inventory/categories/${id}`)
  }
}
