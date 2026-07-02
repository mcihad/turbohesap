// Generic server-side list query model — shared by the DataGrid (server mode),
// its typed column filters, and the reusable QueryBuilder, and consumed by the
// backend `applyListQuery` engine. This is the single source of truth for the
// operator set and which operators each value-type allows, so the frontend
// editors and the backend validator never drift.
//
// Wire format (GET): `page`/`pageSize`/`search` are plain params; `sort` and
// `filter` are JSON-stringified into single params (see encode/decodeListQuery).

import type { Page, PageQuery } from './pagination'

export type FilterOperator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'in'
  | 'notIn'
  | 'between'
  | 'isNull'
  | 'isNotNull'
  | 'isTrue'
  | 'isFalse'

/** A single leaf condition: a field, an operator, and (usually) a value. */
export interface FilterRule {
  field: string
  op: FilterOperator
  /** Scalar for most ops; array for in/notIn; [a,b] for between; omitted for is* ops. */
  value?: unknown
}

/** A boolean group of rules/sub-groups — recursive, so trees nest arbitrarily. */
export interface FilterGroup {
  combinator: 'and' | 'or'
  rules: (FilterRule | FilterGroup)[]
}

export interface SortSpec {
  field: string
  dir: 'asc' | 'desc'
}

/** The full server list request. Extends the pagination envelope's query. */
export interface ListQuery extends PageQuery {
  sort?: SortSpec[]
  search?: string
  filter?: FilterGroup
}

/** Value-type of a filterable field — drives which editor and which operators. */
export type FilterValueType = 'text' | 'number' | 'date' | 'daterange' | 'boolean' | 'enum' | 'uuid'

/**
 * Allowed operators per value-type. Single source of truth reused by the
 * frontend operator pickers AND the backend validator (an operator outside its
 * type's list is rejected/skipped server-side).
 */
export const OPERATORS_BY_TYPE: Record<FilterValueType, FilterOperator[]> = {
  text: ['contains', 'startsWith', 'endsWith', 'eq', 'ne', 'in', 'isNull', 'isNotNull'],
  number: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'between', 'isNull', 'isNotNull'],
  date: ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'between', 'isNull', 'isNotNull'],
  daterange: ['between'],
  boolean: ['isTrue', 'isFalse'],
  enum: ['eq', 'ne', 'in', 'notIn', 'isNull', 'isNotNull'],
  uuid: ['eq', 'ne', 'in', 'notIn', 'isNull', 'isNotNull'],
}

/** Operators that take no value (unary). */
export const NULLARY_OPERATORS: FilterOperator[] = ['isNull', 'isNotNull', 'isTrue', 'isFalse']

export function isFilterGroup(node: FilterRule | FilterGroup): node is FilterGroup {
  return (node as FilterGroup).combinator !== undefined && Array.isArray((node as FilterGroup).rules)
}

export function emptyGroup(): FilterGroup {
  return { combinator: 'and', rules: [] }
}

/** True when a group has no effective rules (so callers can omit it from the query). */
export function isEmptyGroup(g: FilterGroup | undefined): boolean {
  if (!g || g.rules.length === 0) return true
  return g.rules.every((r) => (isFilterGroup(r) ? isEmptyGroup(r) : false))
}

/** Encode a ListQuery into flat string params for an axios GET `params` bag. */
export function encodeListQuery(q: ListQuery): Record<string, string> {
  const out: Record<string, string> = {}
  if (q.page != null) out.page = String(q.page)
  if (q.pageSize != null) out.pageSize = String(q.pageSize)
  if (q.search) out.search = q.search
  if (q.sort && q.sort.length) out.sort = JSON.stringify(q.sort)
  if (q.filter && !isEmptyGroup(q.filter)) out.filter = JSON.stringify(q.filter)
  return out
}

/** Decode flat string params (e.g. from a URL) back into a ListQuery. */
export function decodeListQuery(params: Record<string, string | undefined>): ListQuery {
  const q: ListQuery = {}
  if (params.page) q.page = Number(params.page)
  if (params.pageSize) q.pageSize = Number(params.pageSize)
  if (params.search) q.search = params.search
  if (params.sort) {
    try {
      q.sort = JSON.parse(params.sort) as SortSpec[]
    } catch {
      /* ignore malformed */
    }
  }
  if (params.filter) {
    try {
      q.filter = JSON.parse(params.filter) as FilterGroup
    } catch {
      /* ignore malformed */
    }
  }
  return q
}

export type { Page }
