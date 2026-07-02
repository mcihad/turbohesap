import type {
  CreateLotRequest,
  LotDto,
  LotLinkDto,
  LotListQuery,
  LotTraceDto,
  RegisterLotRequest,
} from './lot.dto'

// Parti/Seri izlenebilirlik servisi. registerConsumption/registerOutput üretim
// emrine lot bağı ekler (lot yoksa oluşturur); trace şecere+recall verir.
export interface ILotsService {
  list(query?: LotListQuery): Promise<LotDto[]>
  create(input: CreateLotRequest): Promise<LotDto>
  registerConsumption(input: RegisterLotRequest): Promise<LotLinkDto>
  registerOutput(input: RegisterLotRequest): Promise<LotLinkDto>
  links(manufacturingOrderId: string): Promise<LotLinkDto[]>
  trace(lotId: string): Promise<LotTraceDto>
}
