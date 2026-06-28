import type { AxiosInstance } from 'axios'

import type {
  CreatePosRegisterRequest,
  PosRegisterDto,
  UpdatePosRegisterRequest,
} from './register.dto'
import type { IPosRegistersService } from './registers.service'

const base = '/pos/registers'

export class PosRegistersApiClient implements IPosRegistersService {
  constructor(private readonly http: AxiosInstance) {}

  async list(): Promise<PosRegisterDto[]> {
    return (await this.http.get<PosRegisterDto[]>(base)).data
  }
  async get(id: string): Promise<PosRegisterDto> {
    return (await this.http.get<PosRegisterDto>(`${base}/${id}`)).data
  }
  async create(input: CreatePosRegisterRequest): Promise<PosRegisterDto> {
    return (await this.http.post<PosRegisterDto>(base, input)).data
  }
  async update(id: string, input: UpdatePosRegisterRequest): Promise<PosRegisterDto> {
    return (await this.http.patch<PosRegisterDto>(`${base}/${id}`, input)).data
  }
  async remove(id: string): Promise<void> {
    await this.http.delete(`${base}/${id}`)
  }
}
