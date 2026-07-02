// Ölçü birimi (Unit of Measure) sistemi — gerçek birim dönüşümleri. Mevcut `birim`
// lookup ANAHTARLARI (ADET/KG/GR…) korunur; her UoM bir kategoriye bağlıdır ve
// kategori içindeki bir REFERANS birime göre `factorToReference` taşır. Dönüşüm
// yalnız aynı kategori içinde yapılır (kg↔gram olur, kg↔litre olmaz). Ürünün/
// reçetenin/hareketin `unit` alanı bu UoM kodlarıdır.

export interface UomCategoryDto {
  id: string
  name: string
  /** The base unit code of this category (factorToReference = 1). */
  referenceUomCode: string
  isActive: boolean
  /** Number of UoMs in this category (list/get). */
  uomCount: number
  createdAt: string
  updatedAt: string
}

export interface UomDto {
  id: string
  categoryId: string
  categoryName: string
  /** Stable code, matches the legacy `birim` key (e.g. "KG", "GR"). Unique. */
  code: string
  name: string
  /** Quantity of the reference unit that 1 of this unit equals (g→kg = 0.001). */
  factorToReference: number
  /** Rounding precision for converted quantities (e.g. 0.01). */
  rounding: number
  isReference: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateUomCategoryRequest {
  name: string
  /** Reference unit code; created/flagged as the category's base (factor 1). */
  referenceUomCode: string
  isActive?: boolean
}
export type UpdateUomCategoryRequest = Partial<CreateUomCategoryRequest>

export interface CreateUomRequest {
  categoryId: string
  code: string
  name: string
  factorToReference: number
  rounding?: number
  isReference?: boolean
  isActive?: boolean
}
export type UpdateUomRequest = Partial<Omit<CreateUomRequest, 'categoryId'>>

// Convert a quantity between two unit codes (must share a category).
export interface UomConvertRequest {
  quantity: number
  fromCode: string
  toCode: string
}
export interface UomConvertResult {
  quantity: number
  fromCode: string
  toCode: string
}
