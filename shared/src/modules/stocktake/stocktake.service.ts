import type {
  CreateStockCountRequest,
  SetCountLineRequest,
  StockCountDto,
  StockCountLineDto,
  StockCountListQuery,
  StockCountScanDto,
  SubmitCountEntriesRequest,
} from './stocktake.dto'

// Contract for the stocktake resource (/api/stocktake/counts).
export interface IStocktakeService {
  list(query?: StockCountListQuery): Promise<StockCountDto[]>
  get(id: string): Promise<StockCountDto>
  create(input: CreateStockCountRequest): Promise<StockCountDto>
  remove(id: string): Promise<void>
  /** draft → counting (lines already snapshotted at create). */
  start(id: string): Promise<StockCountDto>
  lines(id: string): Promise<StockCountLineDto[]>
  scans(id: string): Promise<StockCountScanDto[]>
  /** Submit a batch of counted observations (scan/manual). */
  submitEntries(id: string, input: SubmitCountEntriesRequest): Promise<StockCountLineDto[]>
  /** Manually set a single line's counted qty / reason. */
  setLine(id: string, lineId: string, input: SetCountLineRequest): Promise<StockCountLineDto>
  /** counting → review (compute variances, flag recounts over the threshold). */
  review(id: string): Promise<StockCountDto>
  /** Send a line back to counting for a recount. */
  requestRecount(id: string, lineId: string): Promise<StockCountLineDto>
  /** review → approved: post Sayım Fazlası/Eksiği movements (segregation enforced). */
  approve(id: string): Promise<StockCountDto>
  /** Reverse posted adjustments + mark cancelled. */
  cancel(id: string): Promise<StockCountDto>
}
