import type { AxiosInstance } from 'axios'

import type { Page } from '../../core/pagination'
import { encodeListQuery } from '../../core/list-query'
import type {
  CreateStockMovementRequest,
  StockMovementDto,
  StockMovementListQuery,
} from './stock-movement.dto'
import type { IStockMovementsService } from './stock-movements.service'

export class StockMovementsApiClient implements IStockMovementsService {
  constructor(private readonly http: AxiosInstance) {}

  async list(query?: StockMovementListQuery): Promise<StockMovementDto[]> {
    return (await this.http.get<StockMovementDto[]>('/inventory/stock-movements', { params: query })).data
  }
  async listPage(query?: StockMovementListQuery): Promise<Page<StockMovementDto>> {
    const params = {
      ...(query?.productId ? { productId: query.productId } : {}),
      ...(query?.branchId ? { branchId: query.branchId } : {}),
      ...(query?.from ? { from: query.from } : {}),
      ...(query?.to ? { to: query.to } : {}),
      ...encodeListQuery(query ?? {}),
    }
    return (await this.http.get<Page<StockMovementDto>>('/inventory/stock-movements/paged', { params })).data
  }
  async create(input: CreateStockMovementRequest): Promise<StockMovementDto> {
    return (await this.http.post<StockMovementDto>('/inventory/stock-movements', input)).data
  }
  async remove(id: string): Promise<void> {
    await this.http.delete(`/inventory/stock-movements/${id}`)
  }
}
