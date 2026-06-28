import type {
  CreatePosRegisterRequest,
  PosRegisterDto,
  UpdatePosRegisterRequest,
} from './register.dto'

export interface IPosRegistersService {
  list(): Promise<PosRegisterDto[]>
  get(id: string): Promise<PosRegisterDto>
  create(input: CreatePosRegisterRequest): Promise<PosRegisterDto>
  update(id: string, input: UpdatePosRegisterRequest): Promise<PosRegisterDto>
  remove(id: string): Promise<void>
}
