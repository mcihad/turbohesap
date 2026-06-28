import type {
  CreatePosFloorRequest,
  CreatePosTableRequest,
  PosFloorDto,
  PosFloorLayoutDto,
  PosTableDto,
  TableListQuery,
  UpdatePosFloorRequest,
  UpdatePosTableRequest,
} from './table.dto'

// Floors (kat) + tables (masa) management and the live floor map.
export interface IPosTablesService {
  listFloors(branchId?: string): Promise<PosFloorDto[]>
  createFloor(input: CreatePosFloorRequest): Promise<PosFloorDto>
  updateFloor(id: string, input: UpdatePosFloorRequest): Promise<PosFloorDto>
  removeFloor(id: string): Promise<void>

  listTables(query?: TableListQuery): Promise<PosTableDto[]>
  createTable(input: CreatePosTableRequest): Promise<PosTableDto>
  updateTable(id: string, input: UpdatePosTableRequest): Promise<PosTableDto>
  removeTable(id: string): Promise<void>

  /** Floors + their tables with live occupancy — the dine-in floor map. */
  layout(branchId?: string): Promise<PosFloorLayoutDto[]>
}
