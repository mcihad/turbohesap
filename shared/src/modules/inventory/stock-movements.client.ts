import type { AxiosInstance } from 'axios'

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
  async create(input: CreateStockMovementRequest): Promise<StockMovementDto> {
    return (await this.http.post<StockMovementDto>('/inventory/stock-movements', input)).data
  }
  async remove(id: string): Promise<void> {
    await this.http.delete(`/inventory/stock-movements/${id}`)
  }
}
