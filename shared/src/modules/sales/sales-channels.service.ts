import type {
  CreateSalesChannelRequest,
  SalesChannelDto,
  UpdateSalesChannelRequest,
} from './sales-channel.dto'

// Contract for the sales channels resource (/api/sales/channels).
export interface ISalesChannelsService {
  list(): Promise<SalesChannelDto[]>
  get(id: string): Promise<SalesChannelDto>
  create(input: CreateSalesChannelRequest): Promise<SalesChannelDto>
  update(id: string, input: UpdateSalesChannelRequest): Promise<SalesChannelDto>
  remove(id: string): Promise<void>
}
