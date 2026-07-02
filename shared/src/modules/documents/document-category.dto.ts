// Evrak (document) categories — a TREE (adjacency list via `parentId`), mirroring
// `inventory/category.dto.ts` exactly. Each category defines a set of **custom
// field definitions** (`fieldDefs`, jsonb) describing the extra attributes a
// document filed under it will carry (öznitelikler). This is a deliberate
// duplicate of the inventory category shape/pattern — not a shared type — since
// each module owns its own full contract (see AGENTS.md §4).
//
// **Gizlilik (privacy):** a category may be marked `isPrivate` with an `ownerId`.
// This hides the category itself from non-owners (unless they hold
// `documents.private.readAll`) and is used only as a **create-time default** for
// documents filed under it — it does not retroactively hide documents already
// inside it. See `document.dto.ts` for the authoritative per-document flag.

export type DocumentFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'money'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'date'
  | 'daterange'
  | 'lookup'

export const DOCUMENT_FIELD_TYPES: DocumentFieldType[] = [
  'text',
  'textarea',
  'number',
  'money',
  'boolean',
  'select',
  'multiselect',
  'date',
  'daterange',
  'lookup',
]

export interface DocumentFieldDef {
  /** Stable key for the attribute (unique within the category). */
  key: string
  label: string
  type: DocumentFieldType
  required: boolean

  options?: string[]
  lookupList?: string

  min?: number
  max?: number
  step?: number
  unit?: string
  currency?: string

  minDate?: string
  maxDate?: string

  defaultValue?: string | number | boolean | string[] | null
  placeholder?: string
  helpText?: string
  sortOrder?: number
}

export interface DocumentCategoryDto {
  id: string
  parentId: string | null
  name: string
  code: string
  description: string
  isActive: boolean
  sortOrder: number
  /** Kişiye özel — hides this category from non-owners (see file header). */
  isPrivate: boolean
  ownerId: string | null
  ownerName: string | null
  /** The document-attribute schema for this category. */
  fieldDefs: DocumentFieldDef[]
  /** Number of documents assigned directly to this category (list/get). */
  documentCount: number
  createdAt: string
  updatedAt: string
}

// Compact reference for embedding (e.g. in a picker).
export interface DocumentCategorySummary {
  id: string
  parentId: string | null
  name: string
  code: string
}

export interface CreateDocumentCategoryRequest {
  name: string
  parentId?: string | null
  code?: string
  description?: string
  isActive?: boolean
  sortOrder?: number
  isPrivate?: boolean
  ownerId?: string | null
  fieldDefs?: DocumentFieldDef[]
}

export type UpdateDocumentCategoryRequest = Partial<CreateDocumentCategoryRequest>
