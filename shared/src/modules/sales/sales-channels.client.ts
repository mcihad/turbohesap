import type { AxiosInstance } from 'axios'

import type {
  CreateSalesChannelRequest,
  SalesChannelDto,
  UpdateSalesChannelRequest,
} from './sales-channel.dto'
import type { ISalesChannelsService } from './sales-channels.service'

// Axios implementation of ISalesChannelsService → /api/sales/channels.
export class SalesChannelsApiClient implements ISalesChannelsService {
  constructor(private readonly http: AxiosInstance) {}

  async list(): Promise<SalesChannelDto[]> {
    return (await this.http.get<SalesChannelDto[]>('/sales/channels')).data
  }

  async get(id: string): Promise<SalesChannelDto> {
    return (await this.http.get<SalesChannelDto>(`/sales/channels/${id}`)).data
  }

  async create(input: CreateSalesChannelRequest): Promise<SalesChannelDto> {
    return (await this.http.post<SalesChannelDto>('/sales/channels', input)).data
  }

  async update(
    id: string,
    input: UpdateSalesChannelRequest,
  ): Promise<SalesChannelDto> {
    return (
      await this.http.patch<SalesChannelDto>(`/sales/channels/${id}`, input)
    ).data
  }

  async remove(id: string): Promise<void> {
    await this.http.delete(`/sales/channels/${id}`)
  }
}
