import type { AxiosInstance } from 'axios'

import type {
  AvailabilityDto,
  AvailabilityQuery,
  ProductCostDto,
  ReservationListQuery,
  ReserveStockRequest,
  StockReservationDto,
} from './stock-ops.dto'
import type {
  IAvailabilityService,
  IProductCostService,
  IStockReservationsService,
} from './stock-ops.service'

export class StockReservationsApiClient implements IStockReservationsService {
  constructor(private readonly http: AxiosInstance) {}
  async list(query?: ReservationListQuery): Promise<StockReservationDto[]> {
    return (await this.http.get<StockReservationDto[]>('/inventory/reservations', { params: query })).data
  }
  async reserve(input: ReserveStockRequest): Promise<StockReservationDto> {
    return (await this.http.post<StockReservationDto>('/inventory/reservations', input)).data
  }
  async releaseSource(sourceModule: string, sourceId: string): Promise<void> {
    await this.http.post('/inventory/reservations/release', { sourceModule, sourceId })
  }
}

export class ProductCostApiClient implements IProductCostService {
  constructor(private readonly http: AxiosInstance) {}
  async get(productId: string, variantId?: string, branchId?: string): Promise<ProductCostDto> {
    return (await this.http.get<ProductCostDto>('/inventory/cost', { params: { productId, variantId, branchId } })).data
  }
}

export class AvailabilityApiClient implements IAvailabilityService {
  constructor(private readonly http: AxiosInstance) {}
  async get(query: AvailabilityQuery): Promise<AvailabilityDto> {
    return (await this.http.get<AvailabilityDto>('/inventory/availability', { params: query })).data
  }
  async bulk(
    units: Array<{ productId: string; variantId?: string }>,
    opts?: { branchId?: string; horizonDays?: number },
  ): Promise<AvailabilityDto[]> {
    return (await this.http.post<AvailabilityDto[]>('/inventory/availability/bulk', { units, ...opts })).data
  }
}
