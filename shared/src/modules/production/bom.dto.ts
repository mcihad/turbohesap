// Ürün Ağacı / Reçete (Bill of Materials). Bir mamulü üretmek için gereken
// bileşenler (hammadde/yarı mamul), yan ürünler ve operasyonlar (rota — iş merkezi
// + süre). `type`: manufacture (normal), phantom (kit — üst reçeteye patlatılır),
// subcontract (fason). Aynı (ürün,varyant) için yalnızca bir reçete `isActive`
// olabilir (güncel sürüm); kullanılmış reçete düzenlenince sürüm artar.

export type BomType = 'manufacture' | 'phantom' | 'subcontract'
export const BOM_TYPE_LABELS: Record<BomType, string> = {
  manufacture: 'Üretim',
  phantom: 'Yarı Mamul (Phantom)',
  subcontract: 'Fason',
}

export type ConsumptionPolicy = 'strict' | 'warn' | 'flexible'
export const CONSUMPTION_POLICY_LABELS: Record<ConsumptionPolicy, string> = {
  strict: 'Katı (reçeteye birebir)',
  warn: 'Uyarılı (sapmaya izin, uyarır)',
  flexible: 'Esnek (serbest)',
}

export type ComponentConsumptionType = 'auto' | 'manual'
export type OperationTimeBasis = 'per_unit' | 'fixed'

export interface BomComponentDto {
  id: string
  componentProductId: string
  componentVariantId: string | null
  componentName: string
  componentCode: string
  /** Quantity required per `outputQuantity` of the header. */
  quantity: number
  unit: string
  /** Expected scrap fraction for this component (e.g. 0.05 = %5). */
  scrapRate: number
  /** Which operation consumes it (optional). */
  operationId: string | null
  consumptionType: ComponentConsumptionType
  isOptional: boolean
  /** Restrict this line to one parent variant (else applies to all). */
  applyOnVariantId: string | null
  notes: string | null
  sortOrder: number
}

export interface BomByproductDto {
  id: string
  productId: string
  variantId: string | null
  productName: string
  quantity: number
  unit: string
  /** Co-product cost allocation share (0..1). */
  costShareRate: number
  sortOrder: number
}

export interface BomOperationDto {
  id: string
  sequence: number
  name: string
  workCenterId: string
  workCenterName: string
  setupTimeMinutes: number
  timePerUnitMinutes: number
  timeBasis: OperationTimeBasis
  instructions: string | null
  qualityCheckRequired: boolean
  sortOrder: number
}

export interface BomDto {
  id: string
  productId: string
  variantId: string | null
  productName: string
  productCode: string
  code: string
  name: string
  type: BomType
  outputQuantity: number
  unit: string
  version: number
  revision: string | null
  validFrom: string | null
  validTo: string | null
  consumptionPolicy: ConsumptionPolicy
  manufLeadTimeDays: number | null
  isActive: boolean
  notes: string | null
  components: BomComponentDto[]
  byproducts: BomByproductDto[]
  operations: BomOperationDto[]
  createdAt: string
  updatedAt: string
}

export interface BomSummary {
  id: string
  code: string
  name: string
  productId: string
  type: BomType
  version: number
  isActive: boolean
}

// ── Create/update (nested inputs; the service replaces the child rows) ─────────

export interface BomComponentInput {
  componentProductId: string
  componentVariantId?: string | null
  quantity: number
  unit?: string
  scrapRate?: number
  operationRef?: number | null // refers to an operation's `sequence` (resolved server-side)
  consumptionType?: ComponentConsumptionType
  isOptional?: boolean
  applyOnVariantId?: string | null
  notes?: string | null
  sortOrder?: number
}

export interface BomByproductInput {
  productId: string
  variantId?: string | null
  quantity: number
  unit?: string
  costShareRate?: number
  sortOrder?: number
}

export interface BomOperationInput {
  sequence: number
  name: string
  workCenterId: string
  setupTimeMinutes?: number
  timePerUnitMinutes?: number
  timeBasis?: OperationTimeBasis
  instructions?: string | null
  qualityCheckRequired?: boolean
  sortOrder?: number
}

export interface CreateBomRequest {
  productId: string
  variantId?: string | null
  code?: string
  name?: string
  type?: BomType
  outputQuantity?: number
  unit?: string
  revision?: string | null
  validFrom?: string | null
  validTo?: string | null
  consumptionPolicy?: ConsumptionPolicy
  manufLeadTimeDays?: number | null
  isActive?: boolean
  notes?: string | null
  components?: BomComponentInput[]
  byproducts?: BomByproductInput[]
  operations?: BomOperationInput[]
}

export type UpdateBomRequest = Partial<CreateBomRequest>

export interface BomListQuery {
  productId?: string
  type?: BomType
  isActive?: boolean
  search?: string
}
