import type {
  CreateSubcontractDispatchRequest,
  ReceiveSubcontractDispatchRequest,
  SubcontractDispatchDto,
  SubcontractDispatchListQuery,
  SubcontractStockQuery,
  SubcontractStockRow,
} from './subcontract.dto'

// Fason sevk belgesi servisi. send = sevk (fasoncuya gönder), receive = mamul +
// kalan malzeme teslim al + fason ücretini Üretim Emrine işle, cancel = geri al.
export interface ISubcontractDispatchesService {
  list(query?: SubcontractDispatchListQuery): Promise<SubcontractDispatchDto[]>
  get(id: string): Promise<SubcontractDispatchDto>
  create(input: CreateSubcontractDispatchRequest): Promise<SubcontractDispatchDto>
  send(id: string): Promise<SubcontractDispatchDto>
  receive(id: string, input: ReceiveSubcontractDispatchRequest): Promise<SubcontractDispatchDto>
  cancel(id: string): Promise<SubcontractDispatchDto>
  /** Stock currently held at subcontractors (sent − returned). */
  stockAtSubcontractor(query?: SubcontractStockQuery): Promise<SubcontractStockRow[]>
}
