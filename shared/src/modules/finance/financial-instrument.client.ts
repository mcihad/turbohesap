import type { AxiosInstance } from 'axios'

import type {
  CreateFinancialInstrumentRequest,
  FinancialInstrumentDto,
  InstrumentListQuery,
  SettleInstrumentRequest,
  UpdateFinancialInstrumentRequest,
} from './financial-instrument.dto'
import type { IFinancialInstrumentsService } from './financial-instrument.service'

// Axios implementation → /api/finance/instruments.
export class FinancialInstrumentsApiClient implements IFinancialInstrumentsService {
  constructor(private readonly http: AxiosInstance) {}

  async list(query?: InstrumentListQuery): Promise<FinancialInstrumentDto[]> {
    return (
      await this.http.get<FinancialInstrumentDto[]>('/finance/instruments', { params: query })
    ).data
  }

  async get(id: string): Promise<FinancialInstrumentDto> {
    return (await this.http.get<FinancialInstrumentDto>(`/finance/instruments/${id}`)).data
  }

  async create(input: CreateFinancialInstrumentRequest): Promise<FinancialInstrumentDto> {
    return (await this.http.post<FinancialInstrumentDto>('/finance/instruments', input)).data
  }

  async update(
    id: string,
    input: UpdateFinancialInstrumentRequest,
  ): Promise<FinancialInstrumentDto> {
    return (
      await this.http.patch<FinancialInstrumentDto>(`/finance/instruments/${id}`, input)
    ).data
  }

  async remove(id: string): Promise<void> {
    await this.http.delete(`/finance/instruments/${id}`)
  }

  async depositForCollection(id: string): Promise<FinancialInstrumentDto> {
    return (
      await this.http.post<FinancialInstrumentDto>(
        `/finance/instruments/${id}/deposit-for-collection`,
      )
    ).data
  }

  async collect(id: string, input: SettleInstrumentRequest): Promise<FinancialInstrumentDto> {
    return (
      await this.http.post<FinancialInstrumentDto>(`/finance/instruments/${id}/collect`, input)
    ).data
  }

  async pay(id: string, input: SettleInstrumentRequest): Promise<FinancialInstrumentDto> {
    return (
      await this.http.post<FinancialInstrumentDto>(`/finance/instruments/${id}/pay`, input)
    ).data
  }

  async reverse(id: string): Promise<FinancialInstrumentDto> {
    return (
      await this.http.post<FinancialInstrumentDto>(`/finance/instruments/${id}/reverse`)
    ).data
  }

  async bounce(id: string): Promise<FinancialInstrumentDto> {
    return (
      await this.http.post<FinancialInstrumentDto>(`/finance/instruments/${id}/bounce`)
    ).data
  }

  async endorse(id: string): Promise<FinancialInstrumentDto> {
    return (
      await this.http.post<FinancialInstrumentDto>(`/finance/instruments/${id}/endorse`)
    ).data
  }

  async pledge(id: string): Promise<FinancialInstrumentDto> {
    return (
      await this.http.post<FinancialInstrumentDto>(`/finance/instruments/${id}/pledge`)
    ).data
  }

  async cancel(id: string): Promise<FinancialInstrumentDto> {
    return (
      await this.http.post<FinancialInstrumentDto>(`/finance/instruments/${id}/cancel`)
    ).data
  }
}
