import type { AxiosInstance } from 'axios'

import type {
  CreateStockCountRequest,
  SetCountLineRequest,
  StockCountDto,
  StockCountLineDto,
  StockCountListQuery,
  StockCountScanDto,
  SubmitCountEntriesRequest,
} from './stocktake.dto'
import type { IStocktakeService } from './stocktake.service'

const base = '/stocktake/counts'

export class StocktakeApiClient implements IStocktakeService {
  constructor(private readonly http: AxiosInstance) {}

  list = (q?: StockCountListQuery): Promise<StockCountDto[]> =>
    this.http.get<StockCountDto[]>(base, { params: q }).then((r) => r.data)
  get = (id: string): Promise<StockCountDto> =>
    this.http.get<StockCountDto>(`${base}/${id}`).then((r) => r.data)
  create = (i: CreateStockCountRequest): Promise<StockCountDto> =>
    this.http.post<StockCountDto>(base, i).then((r) => r.data)
  remove = (id: string): Promise<void> => this.http.delete(`${base}/${id}`).then(() => undefined)
  start = (id: string): Promise<StockCountDto> =>
    this.http.post<StockCountDto>(`${base}/${id}/start`, {}).then((r) => r.data)
  lines = (id: string): Promise<StockCountLineDto[]> =>
    this.http.get<StockCountLineDto[]>(`${base}/${id}/lines`).then((r) => r.data)
  scans = (id: string): Promise<StockCountScanDto[]> =>
    this.http.get<StockCountScanDto[]>(`${base}/${id}/scans`).then((r) => r.data)
  submitEntries = (id: string, i: SubmitCountEntriesRequest): Promise<StockCountLineDto[]> =>
    this.http.post<StockCountLineDto[]>(`${base}/${id}/entries`, i).then((r) => r.data)
  setLine = (id: string, lineId: string, i: SetCountLineRequest): Promise<StockCountLineDto> =>
    this.http.patch<StockCountLineDto>(`${base}/${id}/lines/${lineId}`, i).then((r) => r.data)
  review = (id: string): Promise<StockCountDto> =>
    this.http.post<StockCountDto>(`${base}/${id}/review`, {}).then((r) => r.data)
  requestRecount = (id: string, lineId: string): Promise<StockCountLineDto> =>
    this.http.post<StockCountLineDto>(`${base}/${id}/lines/${lineId}/recount`, {}).then((r) => r.data)
  approve = (id: string): Promise<StockCountDto> =>
    this.http.post<StockCountDto>(`${base}/${id}/approve`, {}).then((r) => r.data)
  cancel = (id: string): Promise<StockCountDto> =>
    this.http.post<StockCountDto>(`${base}/${id}/cancel`, {}).then((r) => r.data)
}
