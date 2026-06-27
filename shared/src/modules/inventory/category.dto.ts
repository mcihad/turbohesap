// Inventory categories — a TREE of product categories (adjacency list via
// `parentId`). Beyond the usual catalog fields, each category defines a set of
// **custom field definitions** (`fieldDefs`, stored as jsonb) that describe the
// extra attributes a product in that category will carry. The dynamic product
// form (built later) renders inputs from these definitions.

// ── Custom field definitions (the per-category product attribute schema) ──────

// The kind of input a custom field renders as.
export type CategoryFieldType =
  | 'text' // single-line text
  | 'textarea' // multi-line text
  | 'number' // numeric
  | 'money' // numeric amount + currency
  | 'boolean' // checkbox / switch
  | 'select' // single choice (from `options` or a lookup list)
  | 'multiselect' // multiple choices
  | 'date' // single date
  | 'daterange' // a date interval (from/to)
  | 'lookup' // single choice bound to a lookups list (`lookupList`)

export const CATEGORY_FIELD_TYPES: CategoryFieldType[] = [
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

// One custom field definition. Type-specific config is optional and only used by
// the relevant types — the later product form reads these to build + validate the
// dynamic input.
export interface CategoryFieldDef {
  /** Stable key for the attribute (unique within the category). */
  key: string
  /** Display label. */
  label: string
  type: CategoryFieldType
  /** Whether the product form must provide a value. */
  required: boolean

  // select / multiselect — inline options (value list).
  options?: string[]
  // lookup / (select bound to a list) — the lookups list name to pull from.
  lookupList?: string

  // number / money — numeric bounds + step + unit/currency.
  min?: number
  max?: number
  step?: number
  unit?: string
  currency?: string

  // date / daterange — ISO bounds (inclusive).
  minDate?: string
  maxDate?: string

  /** Default value (shape depends on `type`). */
  defaultValue?: string | number | boolean | string[] | null
  placeholder?: string
  helpText?: string
  /** Order within the category's field list. */
  sortOrder?: number
}

// ── Category DTO + requests ───────────────────────────────────────────────────

export interface CategoryDto {
  id: string
  /** Parent category id, or null for a root. */
  parentId: string | null
  name: string
  /** Optional short code. */
  code: string
  description: string
  /** Image URL (a file picker will populate this later). */
  imageUrl: string
  isActive: boolean
  sortOrder: number
  /** The product-attribute schema for this category. */
  fieldDefs: CategoryFieldDef[]
  createdAt: string
  updatedAt: string
}

// Compact reference for embedding (e.g. on a product or in a picker).
export interface CategorySummary {
  id: string
  parentId: string | null
  name: string
  code: string
}

export interface CreateCategoryRequest {
  name: string
  parentId?: string | null
  code?: string
  description?: string
  imageUrl?: string
  isActive?: boolean
  sortOrder?: number
  fieldDefs?: CategoryFieldDef[]
}

export type UpdateCategoryRequest = Partial<CreateCategoryRequest>
