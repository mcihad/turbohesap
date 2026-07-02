import type { AxiosInstance } from 'axios'

import type {
  CreateUomCategoryRequest,
  CreateUomRequest,
  UomCategoryDto,
  UomConvertRequest,
  UomConvertResult,
  UomDto,
  UpdateUomCategoryRequest,
  UpdateUomRequest,
} from './uom.dto'
import type { IUomService } from './uom.service'

// Axios implementation → /api/inventory/uom* .
export class UomApiClient implements IUomService {
  constructor(private readonly http: AxiosInstance) {}

  async listCategories(): Promise<UomCategoryDto[]> {
    return (await this.http.get<UomCategoryDto[]>('/inventory/uom-categories')).data
  }
  async createCategory(input: CreateUomCategoryRequest): Promise<UomCategoryDto> {
    return (await this.http.post<UomCategoryDto>('/inventory/uom-categories', input)).data
  }
  async updateCategory(id: string, input: UpdateUomCategoryRequest): Promise<UomCategoryDto> {
    return (await this.http.patch<UomCategoryDto>(`/inventory/uom-categories/${id}`, input)).data
  }
  async removeCategory(id: string): Promise<void> {
    await this.http.delete(`/inventory/uom-categories/${id}`)
  }

  async list(categoryId?: string): Promise<UomDto[]> {
    return (await this.http.get<UomDto[]>('/inventory/uoms', { params: { categoryId } })).data
  }
  async create(input: CreateUomRequest): Promise<UomDto> {
    return (await this.http.post<UomDto>('/inventory/uoms', input)).data
  }
  async update(id: string, input: UpdateUomRequest): Promise<UomDto> {
    return (await this.http.patch<UomDto>(`/inventory/uoms/${id}`, input)).data
  }
  async remove(id: string): Promise<void> {
    await this.http.delete(`/inventory/uoms/${id}`)
  }

  async convert(input: UomConvertRequest): Promise<UomConvertResult> {
    return (await this.http.post<UomConvertResult>('/inventory/uoms/convert', input)).data
  }
}
