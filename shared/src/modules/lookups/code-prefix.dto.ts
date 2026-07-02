// Code prefixes — a small "prefix + running counter" numbering system used to
// generate codes like stok kodu "ST-0007". Each (context, prefix) pair owns its
// own sequential counter. `context` names the usage (e.g. "inventory.products")
// so different forms can offer different prefix choices. See docs/lookups.md.

export interface CodePrefixDto {
  id: string
  /** Usage context, e.g. "inventory.products" — <module>.<resource> by convention. */
  context: string
  /** e.g. "ST-" or "STK-". */
  prefix: string
  /** Zero-padding width for the numeric part, e.g. 4 → "0007". */
  padding: number
  /** The NEXT number to be issued — not yet consumed. */
  nextNumber: number
  /** false = consume immediately on pick ("kaydetmeden artır"); true = defer consume to the parent form's save ("kaydettikten sonra artır"). */
  incrementOnSave: boolean
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
  /** Computed, never stored: prefix + nextNumber, zero-padded — for display only. */
  previewCode: string
}

export interface CreateCodePrefixRequest {
  context: string
  prefix: string
  padding?: number
  nextNumber?: number
  incrementOnSave?: boolean
  isActive?: boolean
  sortOrder?: number
}

export interface UpdateCodePrefixRequest {
  context?: string
  prefix?: string
  padding?: number
  /** Admin correction (e.g. after a data import) — advancing/rewinding the counter. */
  nextNumber?: number
  incrementOnSave?: boolean
  isActive?: boolean
  sortOrder?: number
}

export interface PeekCodeResponse {
  /** The code that WOULD be issued next — does not advance the counter. */
  code: string
}

export interface ConsumeCodeResponse {
  /** The code just issued — the counter has already advanced. */
  code: string
}
