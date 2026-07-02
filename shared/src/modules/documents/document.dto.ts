// Evrak (document) — the generic, reusable "any kind of paper/document" record.
// A document may or may not have an actual file attached (see `/api/files` with
// `entityType='Document'`); it always carries category-driven attributes, free
// tags, jsonb metadata (reserved for future OCR/processing), optional time-bound
// (süreli) tracking, and an optional polymorphic link to the entity it's about
// (`relatedEntityType`/`relatedEntityId` — e.g. a `FinancialInstrument`, an
// `Asset`/vehicle for muayene/sigorta, …). Other modules point AT a document by
// id; this module never depends on them (see AGENTS.md §4).

export type DocumentExpiryStatus = 'none' | 'active' | 'expiring_soon' | 'expired'

export type DocumentOcrStatus = 'pending' | 'processing' | 'done' | 'failed'

export interface DocumentDto {
  id: string
  categoryId: string | null
  categoryName: string | null
  title: string
  code: string
  description: string
  /** Schema-driven values, keyed by the category's `fieldDefs` keys. */
  attributes: Record<string, unknown>
  tags: string[]
  /** Free-form, reserved for future OCR/processing pipelines. */
  metadata: Record<string, unknown>
  ocrText: string | null
  ocrStatus: DocumentOcrStatus | null

  /** Süreli evrak mı? */
  isTimeBound: boolean
  issueDate: string | null
  expiryDate: string | null
  reminderDaysBefore: number | null
  /** COMPUTED at read time from `expiryDate` — never stored. */
  expiryStatus: DocumentExpiryStatus

  /** Kişiye özel — see `document-category.dto.ts` header for the privacy model. */
  isPrivate: boolean
  ownerId: string | null
  ownerName: string | null

  /** Polymorphic link to the business entity this document is about. */
  relatedEntityType: string | null
  relatedEntityId: string | null

  /** Attached file count via `/api/files` (entityType='Document'). */
  fileCount: number

  createdById: string | null
  createdByName: string | null
  createdAt: string
  updatedAt: string
}

export interface DocumentSummary {
  id: string
  categoryId: string | null
  title: string
  code: string
}

export interface CreateDocumentRequest {
  categoryId?: string | null
  title: string
  code?: string
  description?: string
  attributes?: Record<string, unknown>
  tags?: string[]
  metadata?: Record<string, unknown>
  isTimeBound?: boolean
  issueDate?: string | null
  expiryDate?: string | null
  reminderDaysBefore?: number | null
  isPrivate?: boolean
  ownerId?: string | null
  relatedEntityType?: string | null
  relatedEntityId?: string | null
}

export type UpdateDocumentRequest = Partial<CreateDocumentRequest>

export interface DocumentListQuery {
  categoryId?: string
  tag?: string
  isPrivate?: boolean
  /** Only the caller's own documents. */
  mine?: boolean
  expiryStatus?: DocumentExpiryStatus
  relatedEntityType?: string
  relatedEntityId?: string
  search?: string
}

export interface RenameDocumentTagRequest {
  from: string
  to: string
}
