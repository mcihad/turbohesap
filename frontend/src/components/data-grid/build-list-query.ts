import type { ColumnFiltersState, SortingState } from '@tanstack/react-table'

import {
  isEmptyGroup,
  type FilterGroup,
  type FilterRule,
  type ListQuery,
  type SortSpec,
} from '@turbohesap/shared'

import type { ColumnFilterValue } from './column-filter'

/** colId → the DB field key used server-side (meta.filter.field ?? colId). */
export type FieldMap = Record<string, string>

export function sortingToSpecs(sorting: SortingState, fieldMap: FieldMap): SortSpec[] {
  return sorting.map((s) => ({ field: fieldMap[s.id] ?? s.id, dir: s.desc ? 'desc' : 'asc' }))
}

export function columnFiltersToRules(filters: ColumnFiltersState, fieldMap: FieldMap): FilterRule[] {
  const rules: FilterRule[] = []
  for (const f of filters) {
    const v = f.value as ColumnFilterValue | string | undefined
    if (v == null) continue
    const field = fieldMap[f.id] ?? f.id
    if (typeof v === 'string') {
      if (v) rules.push({ field, op: 'contains', value: v })
    } else if (v.op) {
      rules.push({ field, op: v.op, value: v.value })
    }
  }
  return rules
}

/** AND-combine the quick column-filter rules with the Query Builder group. */
export function combineFilters(
  columnRules: FilterRule[],
  qb: FilterGroup | undefined,
): FilterGroup | undefined {
  const rules: (FilterRule | FilterGroup)[] = [...columnRules]
  if (qb && !isEmptyGroup(qb)) rules.push(qb)
  if (rules.length === 0) return undefined
  return { combinator: 'and', rules }
}

export function buildListQuery(args: {
  sorting: SortingState
  columnFilters: ColumnFiltersState
  queryBuilder: FilterGroup | undefined
  search: string
  pageIndex: number
  pageSize: number
  fieldMap: FieldMap
}): ListQuery {
  const q: ListQuery = {
    page: args.pageIndex + 1,
    pageSize: args.pageSize,
  }
  if (args.search) q.search = args.search
  const sort = sortingToSpecs(args.sorting, args.fieldMap)
  if (sort.length) q.sort = sort
  const filter = combineFilters(columnFiltersToRules(args.columnFilters, args.fieldMap), args.queryBuilder)
  if (filter) q.filter = filter
  return q
}
