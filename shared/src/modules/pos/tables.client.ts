import type { AxiosInstance } from 'axios'

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
import type { IPosTablesService } from './tables.service'

const floors = '/pos/floors'
const tables = '/pos/tables'

export class PosTablesApiClient implements IPosTablesService {
  constructor(private readonly http: AxiosInstance) {}

  async listFloors(branchId?: string): Promise<PosFloorDto[]> {
    return (await this.http.get<PosFloorDto[]>(floors, { params: { branchId } })).data
  }
  async createFloor(input: CreatePosFloorRequest): Promise<PosFloorDto> {
    return (await this.http.post<PosFloorDto>(floors, input)).data
  }
  async updateFloor(id: string, input: UpdatePosFloorRequest): Promise<PosFloorDto> {
    return (await this.http.patch<PosFloorDto>(`${floors}/${id}`, input)).data
  }
  async removeFloor(id: string): Promise<void> {
    await this.http.delete(`${floors}/${id}`)
  }

  async listTables(query?: TableListQuery): Promise<PosTableDto[]> {
    return (await this.http.get<PosTableDto[]>(tables, { params: query })).data
  }
  async createTable(input: CreatePosTableRequest): Promise<PosTableDto> {
    return (await this.http.post<PosTableDto>(tables, input)).data
  }
  async updateTable(id: string, input: UpdatePosTableRequest): Promise<PosTableDto> {
    return (await this.http.patch<PosTableDto>(`${tables}/${id}`, input)).data
  }
  async removeTable(id: string): Promise<void> {
    await this.http.delete(`${tables}/${id}`)
  }

  async layout(branchId?: string): Promise<PosFloorLayoutDto[]> {
    return (await this.http.get<PosFloorLayoutDto[]>(`${floors}/layout`, { params: { branchId } })).data
  }
}
