// Custom fields for CRM entities (Contact & Opportunity). Reuses the inventory
// CategoryFieldDef shape + DynamicAttributeFields renderer. Definitions are
// stored per entity; values live in each record's `attributes` jsonb bag.

import type { CategoryFieldDef } from '../inventory/category.dto'

export type CrmFieldEntity = 'contact' | 'opportunity'
export const CRM_FIELD_ENTITIES: CrmFieldEntity[] = ['contact', 'opportunity']

export type CrmFieldDef = CategoryFieldDef

export interface CrmFieldDefsDto {
  entity: CrmFieldEntity
  fields: CrmFieldDef[]
}

export interface SetCrmFieldDefsRequest {
  fields: CrmFieldDef[]
}

// ── Bulk operations ──
export interface BulkContactRequest {
  ids: string[]
  op: 'assignOwner' | 'addTag' | 'removeTag' | 'setActive' | 'setGroup'
  /** ownerId | tag | 'true'|'false' | groupId depending on op. */
  value: string | null
}

export interface BulkOpportunityRequest {
  ids: string[]
  op: 'assignOwner' | 'move'
  /** ownerId | stageId. */
  value: string | null
}

export interface BulkResultDto {
  updated: number
}

/** Bulk import contacts (from CSV mapping on the client). */
export interface ImportContactsRequest {
  contacts: Array<{
    name: string
    contactType?: 'company' | 'individual'
    role?: 'customer' | 'supplier' | 'both' | 'lead'
    code?: string
    taxNumber?: string | null
    email?: string | null
    phone?: string | null
    mobile?: string | null
    city?: string | null
  }>
}

export interface ImportResultDto {
  created: number
  skipped: number
  errors: string[]
}
