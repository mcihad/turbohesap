import type { AxiosInstance } from 'axios'

import type {
  CreateLotRequest,
  LotDto,
  LotLinkDto,
  LotListQuery,
  LotTraceDto,
  RegisterLotRequest,
} from './lot.dto'
import type { ILotsService } from './lot.service'

export class LotsApiClient implements ILotsService {
  constructor(private readonly http: AxiosInstance) {}
  async list(query?: LotListQuery): Promise<LotDto[]> {
    return (await this.http.get<LotDto[]>('/production/lots', { params: query })).data
  }
  async create(input: CreateLotRequest): Promise<LotDto> {
    return (await this.http.post<LotDto>('/production/lots', input)).data
  }
  async registerConsumption(input: RegisterLotRequest): Promise<LotLinkDto> {
    return (await this.http.post<LotLinkDto>('/production/lots/consume', input)).data
  }
  async registerOutput(input: RegisterLotRequest): Promise<LotLinkDto> {
    return (await this.http.post<LotLinkDto>('/production/lots/produce', input)).data
  }
  async links(manufacturingOrderId: string): Promise<LotLinkDto[]> {
    return (await this.http.get<LotLinkDto[]>('/production/lot-links', { params: { manufacturingOrderId } })).data
  }
  async trace(lotId: string): Promise<LotTraceDto> {
    return (await this.http.get<LotTraceDto>(`/production/lots/${lotId}/trace`)).data
  }
}
