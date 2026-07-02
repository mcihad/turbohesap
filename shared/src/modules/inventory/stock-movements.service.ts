import type { Page } from '../../core/pagination'
import type {
  CreateStockMovementRequest,
  StockMovementDto,
  StockMovementListQuery,
} from './stock-movement.dto'

export interface IStockMovementsService {
  list(query?: StockMovementListQuery): Promise<StockMovementDto[]>
  listPage(query?: StockMovementListQuery): Promise<Page<StockMovementDto>>
  create(input: CreateStockMovementRequest): Promise<StockMovementDto>
  remove(id: string): Promise<void>
}
