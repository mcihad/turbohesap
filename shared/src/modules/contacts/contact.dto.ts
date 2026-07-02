// Contacts (Cari) — the unified party model. One `Contact` carries a `role`
// (customer / supplier / both / lead), like Odoo's res.partner but with explicit
// roles, plus shared sub-entities (people, addresses) in the ERPNext style. The
// running balance (Cari Bakiye) is COMPUTED from the transaction ledger
// (Σ debit − Σ credit), never stored here. Money fields are plain `number` in the
// DTO; the backend stores them as `numeric` (see agy.md §7.1).

import type { ListQuery } from '../../core/list-query'

// ── enums ─────────────────────────────────────────────────────────────────────
export type ContactType = 'company' | 'individual' // Kurumsal / Bireysel
export const CONTACT_TYPES: ContactType[] = ['company', 'individual']

export type ContactRole = 'customer' | 'supplier' | 'both' | 'lead' // Müşteri/Tedarikçi/Her ikisi/Aday
export const CONTACT_ROLES: ContactRole[] = ['customer', 'supplier', 'both', 'lead']

/** Sign of a balance: 'debit' = the contact owes us (borçlu), 'credit' = we owe them (alacaklı). */
export type BalanceSide = 'debit' | 'credit'

export type AddressType = 'billing' | 'shipping' | 'office' | 'other' // Fatura/Sevkiyat/Ofis/Diğer
export const ADDRESS_TYPES: AddressType[] = ['billing', 'shipping', 'office', 'other']

// ── Contact Group (Cari Grubu) — a NestedSet-style tree ───────────────────────
export interface ContactGroupDto {
  id: string
  parentId: string | null
  name: string
  code: string
  isActive: boolean
  /** Number of contacts directly in this group (list/get). */
  contactCount: number
  createdAt: string
  updatedAt: string
}
export interface CreateContactGroupRequest {
  name: string
  parentId?: string | null
  code?: string
  isActive?: boolean
}
export type UpdateContactGroupRequest = Partial<CreateContactGroupRequest>

// ── Contact (Cari) ────────────────────────────────────────────────────────────
export interface ContactDto {
  id: string
  /** Cari kodu, e.g. "120.01.0001". */
  code: string
  contactType: ContactType
  role: ContactRole
  /** Ünvan (company) or full name (individual). */
  name: string
  /** Vergi Dairesi (company). */
  taxOffice: string | null
  /** Vergi No / VKN — 10 digits (company). */
  taxNumber: string | null
  /** TCKN — 11 digits (individual). */
  nationalId: string | null
  email: string | null
  phone: string | null
  mobile: string | null
  website: string | null
  /** ISO 4217 — default TRY. */
  currencyCode: string
  openingBalance: number
  /** Which side the opening balance sits on. */
  openingBalanceSide: BalanceSide
  /** Risk Limiti. 0 = no limit. */
  creditLimit: number
  /** Vade (gün). */
  paymentTermDays: number
  groupId: string | null
  /** Embedded group reference (list/get convenience). */
  group: ContactGroupSummary | null
  /** Sorumlu kullanıcı (sales owner). */
  ownerId: string | null
  owner: { id: string; name: string } | null
  /** Lead (aday) alanları — kaynak ve durum (lookup destekli serbest metin). */
  leadSource: string | null
  leadStatus: string | null
  tags: string[]
  iban: string | null
  bankName: string | null
  branchId: string | null
  notes: string | null
  /** Custom field values (keyed by field def key). */
  attributes: Record<string, unknown>
  isActive: boolean
  /** COMPUTED: openingBalance(±) + Σ debit − Σ credit. */
  balance: number
  /** COMPUTED: side of `balance` (borçlu/alacaklı). */
  balanceSide: BalanceSide
  /** COMPUTED counts for the detail header. */
  personCount: number
  addressCount: number
  openOpportunityCount: number
  createdAt: string
  updatedAt: string
}

/** Compact reference for embedding/pickers. */
export interface ContactSummary {
  id: string
  code: string
  name: string
  role: ContactRole
}
export interface ContactGroupSummary {
  id: string
  name: string
}

export interface CreateContactRequest {
  contactType: ContactType
  role: ContactRole
  name: string
  code?: string
  taxOffice?: string | null
  taxNumber?: string | null
  nationalId?: string | null
  email?: string | null
  phone?: string | null
  mobile?: string | null
  website?: string | null
  currencyCode?: string
  openingBalance?: number
  openingBalanceSide?: BalanceSide
  creditLimit?: number
  paymentTermDays?: number
  groupId?: string | null
  ownerId?: string | null
  leadSource?: string | null
  leadStatus?: string | null
  tags?: string[]
  iban?: string | null
  bankName?: string | null
  branchId?: string | null
  notes?: string | null
  attributes?: Record<string, unknown>
  isActive?: boolean
}
export type UpdateContactRequest = Partial<CreateContactRequest>

/** Optional filters for the contact list. Server-scoped scalars + generic
 *  pagination/sort/filter tree (`ListQuery`). */
export interface ContactListQuery extends ListQuery {
  role?: ContactRole
  groupId?: string
  ownerId?: string
  /** Only the current user's contacts. */
  mine?: boolean
  /** Filter contacts carrying this tag. */
  tag?: string
  activeOnly?: boolean
}

/** Convert a lead contact into a customer/supplier, optionally spawning a deal. */
export interface ConvertLeadRequest {
  /** New role after conversion (default 'customer'). */
  toRole?: ContactRole
  /** Also create an opportunity for the converted contact. */
  createOpportunity?: boolean
  opportunity?: {
    name: string
    pipelineId?: string
    stageId?: string
    amount?: number
    expectedCloseDate?: string | null
  }
}

// ── Contact Person (İlgili Kişi) ──────────────────────────────────────────────
export interface ContactPersonDto {
  id: string
  contactId: string
  firstName: string
  lastName: string
  /** Görevi / pozisyon. */
  title: string | null
  department: string | null
  email: string | null
  phone: string | null
  mobile: string | null
  isPrimary: boolean
  notes: string | null
  createdAt: string
  updatedAt: string
}
export interface CreateContactPersonRequest {
  contactId: string
  firstName: string
  lastName?: string
  title?: string | null
  department?: string | null
  email?: string | null
  phone?: string | null
  mobile?: string | null
  isPrimary?: boolean
  notes?: string | null
}
export type UpdateContactPersonRequest = Partial<Omit<CreateContactPersonRequest, 'contactId'>>

// ── Address (Adres) ───────────────────────────────────────────────────────────
export interface ContactAddressDto {
  id: string
  contactId: string
  addressType: AddressType
  title: string | null
  line1: string
  line2: string | null
  /** İlçe. */
  district: string | null
  /** İl. */
  city: string
  postalCode: string | null
  country: string
  phone: string | null
  isPrimaryBilling: boolean
  isPrimaryShipping: boolean
  createdAt: string
  updatedAt: string
}
export interface CreateContactAddressRequest {
  contactId: string
  addressType: AddressType
  line1: string
  title?: string | null
  line2?: string | null
  district?: string | null
  city: string
  postalCode?: string | null
  country?: string
  phone?: string | null
  isPrimaryBilling?: boolean
  isPrimaryShipping?: boolean
}
export type UpdateContactAddressRequest = Partial<Omit<CreateContactAddressRequest, 'contactId'>>
