// POS floors (kat) and tables (masa) for restaurant/dine-in service. A floor
// groups tables; a dine-in order references a table (PosOrder.tableId). The
// floor map shows each table's live status (open order + running total).

export interface PosFloorDto {
  id: string
  name: string
  branchId: string | null
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface PosTableDto {
  id: string
  floorId: string
  branchId: string | null
  /** Label shown on the map (e.g. "M1", "Bahçe 3"). */
  name: string
  /** Seat capacity (0 = unspecified). */
  seats: number
  /** Optional map coordinates (grid units); 0/0 = auto-flow. */
  posX: number
  posY: number
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/** A table plus its current occupancy (for the floor map). */
export interface PosTableWithStatus extends PosTableDto {
  openOrderId: string | null
  openOrderNo: string | null
  /** Running grand total of the open order (0 when free). */
  openTotal: number
}

/** A floor with its tables + live status — drives the dine-in floor map. */
export interface PosFloorLayoutDto {
  id: string
  name: string
  branchId: string | null
  sortOrder: number
  tables: PosTableWithStatus[]
}

export interface CreatePosFloorRequest {
  name: string
  branchId?: string | null
  sortOrder?: number
  isActive?: boolean
}
export type UpdatePosFloorRequest = Partial<CreatePosFloorRequest>

export interface CreatePosTableRequest {
  floorId: string
  name: string
  seats?: number
  posX?: number
  posY?: number
  sortOrder?: number
  isActive?: boolean
}
export type UpdatePosTableRequest = Partial<CreatePosTableRequest>

export interface TableListQuery {
  branchId?: string
  floorId?: string
}
