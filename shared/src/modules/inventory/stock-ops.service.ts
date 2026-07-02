import type {
  AvailabilityDto,
  AvailabilityQuery,
  ProductCostDto,
  ReservationListQuery,
  ReserveStockRequest,
  StockReservationDto,
} from './stock-ops.dto'

// Rezervasyon: ayır / kaynağa göre serbest bırak / listele.
export interface IStockReservationsService {
  list(query?: ReservationListQuery): Promise<StockReservationDto[]>
  reserve(input: ReserveStockRequest): Promise<StockReservationDto>
  releaseSource(sourceModule: string, sourceId: string): Promise<void>
}

// Maliyet (AVCO) sorgusu.
export interface IProductCostService {
  get(productId: string, variantId?: string, branchId?: string): Promise<ProductCostDto>
}

// Uygunluk / ATP (söz verilebilir miktar).
export interface IAvailabilityService {
  get(query: AvailabilityQuery): Promise<AvailabilityDto>
  bulk(units: Array<{ productId: string; variantId?: string }>, opts?: { branchId?: string; horizonDays?: number }): Promise<AvailabilityDto[]>
}
