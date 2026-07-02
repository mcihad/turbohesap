import type {
  CreateFinancialInstrumentRequest,
  FinancialInstrumentDto,
  InstrumentListQuery,
  SettleInstrumentRequest,
  UpdateFinancialInstrumentRequest,
} from './financial-instrument.dto'

// Contract for the çek/senet portfolio (/api/finance/instruments). CRUD is only
// allowed while `status === 'open'`. `collect`/`pay`/`reverse` post/undo atomic
// finance+cari ledger entries (mirrors `invoices.addPayment`/`cancel`);
// `depositForCollection`/`bounce`/`endorse`/`pledge`/`cancel` only change status.
export interface IFinancialInstrumentsService {
  list(query?: InstrumentListQuery): Promise<FinancialInstrumentDto[]>
  get(id: string): Promise<FinancialInstrumentDto>
  create(input: CreateFinancialInstrumentRequest): Promise<FinancialInstrumentDto>
  update(id: string, input: UpdateFinancialInstrumentRequest): Promise<FinancialInstrumentDto>
  remove(id: string): Promise<void>

  /** received: open → in_collection (bankaya/factoringe verildi). */
  depositForCollection(id: string): Promise<FinancialInstrumentDto>
  /** received: (open|in_collection) → collected — ATOMIC finance IN + cari alacak. */
  collect(id: string, input: SettleInstrumentRequest): Promise<FinancialInstrumentDto>
  /** issued: open → paid — ATOMIC finance OUT + cari borç. */
  pay(id: string, input: SettleInstrumentRequest): Promise<FinancialInstrumentDto>
  /** (collected|paid) → open — ATOMIC, deletes the posted finance/cari rows. */
  reverse(id: string): Promise<FinancialInstrumentDto>
  /** karşılıksız — status-only. */
  bounce(id: string): Promise<FinancialInstrumentDto>
  /** received: ciro edildi — status-only (MVP, no ledger entry). */
  endorse(id: string): Promise<FinancialInstrumentDto>
  /** received: teminata verildi — status-only. */
  pledge(id: string): Promise<FinancialInstrumentDto>
  /** open → cancelled — status-only. */
  cancel(id: string): Promise<FinancialInstrumentDto>
}
