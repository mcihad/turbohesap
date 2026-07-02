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

// Ölçü birimi sistemi: kategoriler + birimler + dönüşüm.
export interface IUomService {
  listCategories(): Promise<UomCategoryDto[]>
  createCategory(input: CreateUomCategoryRequest): Promise<UomCategoryDto>
  updateCategory(id: string, input: UpdateUomCategoryRequest): Promise<UomCategoryDto>
  removeCategory(id: string): Promise<void>

  /** All units, or those of one category. */
  list(categoryId?: string): Promise<UomDto[]>
  create(input: CreateUomRequest): Promise<UomDto>
  update(id: string, input: UpdateUomRequest): Promise<UomDto>
  remove(id: string): Promise<void>

  /** Convert a quantity between two unit codes (same category). */
  convert(input: UomConvertRequest): Promise<UomConvertResult>
}
