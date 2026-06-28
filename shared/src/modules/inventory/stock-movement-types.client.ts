import type { AxiosInstance } from 'axios'

import type {
  CreateStockMovementTypeRequest,
  StockMovementTypeDto,
  UpdateStockMovementTypeRequest,
} from './stock-movement.dto'
import type { IStockMovementTypesService } from './stock-movement-types.service'

export class StockMovementTypesApiClient implements IStockMovementTypesService {
  constructor(private readonly http: AxiosInstance) {}

  async list(): Promise<StockMovementTypeDto[]> {
    return (await this.http.get<StockMovementTypeDto[]>('/inventory/movement-types')).data
  }
  async create(input: CreateStockMovementTypeRequest): Promise<StockMovementTypeDto> {
    return (await this.http.post<StockMovementTypeDto>('/inventory/movement-types', input)).data
  }
  async update(id: string, input: UpdateStockMovementTypeRequest): Promise<StockMovementTypeDto> {
    return (await this.http.patch<StockMovementTypeDto>(`/inventory/movement-types/${id}`, input)).data
  }
  async remove(id: string): Promise<void> {
    await this.http.delete(`/inventory/movement-types/${id}`)
  }
}
