import type {
  CreateStockMovementTypeRequest,
  StockMovementTypeDto,
  UpdateStockMovementTypeRequest,
} from './stock-movement.dto'

export interface IStockMovementTypesService {
  list(): Promise<StockMovementTypeDto[]>
  create(input: CreateStockMovementTypeRequest): Promise<StockMovementTypeDto>
  update(id: string, input: UpdateStockMovementTypeRequest): Promise<StockMovementTypeDto>
  remove(id: string): Promise<void>
}
