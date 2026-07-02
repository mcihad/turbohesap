import type {
  BomDto,
  BomListQuery,
  CreateBomRequest,
  UpdateBomRequest,
} from './bom.dto'

export interface IBomsService {
  list(query?: BomListQuery): Promise<BomDto[]>
  get(id: string): Promise<BomDto>
  create(input: CreateBomRequest): Promise<BomDto>
  update(id: string, input: UpdateBomRequest): Promise<BomDto>
  remove(id: string): Promise<void>
}
