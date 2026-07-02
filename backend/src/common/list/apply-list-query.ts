import { Brackets, type SelectQueryBuilder, type WhereExpressionBuilder } from 'typeorm'

import {
  OPERATORS_BY_TYPE,
  isFilterGroup,
  type FilterGroup,
  type FilterOperator,
  type FilterRule,
  type FilterValueType,
  type ListQuery,
  type SortSpec,
} from '@turbohesap/shared'

/**
 * Injection-safety contract:
 *  - SQL column identifiers come ONLY from `spec.fields[*].column` (developer-
 *    authored). The request's `rule.field` is used solely as a lookup KEY into
 *    the allowlist — never interpolated into SQL.
 *  - All values are TypeORM named bind params; `%`/`_` are escaped for ILIKE.
 *  - Sort direction is coerced to the literal 'ASC'|'DESC'.
 *  - Filter tree depth and total rule count are capped; pageSize is clamped.
 */
export interface FieldSpec {
  /** Raw SQL column expression, e.g. `c.name` or `(p.attributes ->> 'x')::numeric`. */
  column: string
  type: FilterValueType
  filterable?: boolean
  sortable?: boolean
}

export interface ListSpec {
  fields: Record<string, FieldSpec>
  /** Columns OR-searched by the `search` term (ILIKE). */
  searchColumns?: string[]
  defaultSort?: SortSpec[]
  maxPageSize?: number
  defaultPageSize?: number
}

const MAX_DEPTH = 5
const MAX_RULES = 50

function escapeLike(v: string): string {
  return v.replace(/[\\%_]/g, (m) => `\\${m}`)
}

/**
 * Apply a ListQuery's filter/search/sort/pagination onto a TypeORM query
 * builder, guarded by `spec`. Returns the resolved {page,pageSize}; the caller
 * runs `getManyAndCount()` and builds the `Page<Dto>` envelope.
 */
export function applyListQuery<E extends import('typeorm').ObjectLiteral>(
  qb: SelectQueryBuilder<E>,
  query: ListQuery,
  spec: ListSpec,
): { page: number; pageSize: number } {
  const maxPageSize = spec.maxPageSize ?? 100
  const defaultPageSize = spec.defaultPageSize ?? 20
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(maxPageSize, Math.max(1, Number(query.pageSize) || defaultPageSize))

  let paramSeq = 0
  const nextParam = () => `alq_${paramSeq++}`
  let ruleCount = 0

  // ── filter tree → nested Brackets ──────────────────────────────────────────
  const applyNode = (
    w: WhereExpressionBuilder,
    node: FilterRule | FilterGroup,
    combine: 'and' | 'or',
    isFirst: boolean,
    depth: number,
  ): void => {
    if (depth > MAX_DEPTH || ruleCount >= MAX_RULES) return

    if (isFilterGroup(node)) {
      if (node.rules.length === 0) return
      const bracket = new Brackets((wb) => {
        node.rules.forEach((child, i) => applyNode(wb, child, node.combinator, i === 0, depth + 1))
      })
      applyWhere(w, combine, isFirst, bracket)
      return
    }

    // leaf rule
    const field = spec.fields[node.field]
    if (!field || field.filterable === false) return
    if (!OPERATORS_BY_TYPE[field.type].includes(node.op)) return
    ruleCount++

    const col = field.column
    const frag = buildFragment(col, node.op, node.value, nextParam)
    if (frag) applyWhere(w, combine, isFirst, frag.sql, frag.params)
  }

  if (query.filter && query.filter.rules.length) {
    qb.andWhere(
      new Brackets((wb) => {
        query.filter!.rules.forEach((child, i) =>
          applyNode(wb, child, query.filter!.combinator, i === 0, 1),
        )
      }),
    )
  }

  // ── search (ILIKE OR over searchColumns) ────────────────────────────────────
  if (query.search && spec.searchColumns?.length) {
    const s = `%${escapeLike(query.search)}%`
    const p = nextParam()
    qb.andWhere(
      new Brackets((wb) => {
        spec.searchColumns!.forEach((c, i) => {
          const clause = `${c} ILIKE :${p}`
          if (i === 0) wb.where(clause, { [p]: s })
          else wb.orWhere(clause, { [p]: s })
        })
      }),
    )
  }

  // ── sort (allowlisted, sortable) ────────────────────────────────────────────
  const sorts = (query.sort ?? []).filter((s) => {
    const f = spec.fields[s.field]
    return f && f.sortable !== false
  })
  const effectiveSorts = sorts.length ? sorts : spec.defaultSort ?? []
  effectiveSorts.forEach((s, i) => {
    const col = spec.fields[s.field]?.column
    const dir: 'ASC' | 'DESC' = s.dir === 'desc' ? 'DESC' : 'ASC'
    if (!col) return
    if (i === 0) qb.orderBy(col, dir)
    else qb.addOrderBy(col, dir)
  })

  qb.skip((page - 1) * pageSize).take(pageSize)
  return { page, pageSize }
}

/** Apply a fragment or Brackets to the builder honoring first/and/or. */
function applyWhere(
  w: WhereExpressionBuilder,
  combine: 'and' | 'or',
  isFirst: boolean,
  sqlOrBracket: string | Brackets,
  params?: Record<string, unknown>,
): void {
  if (isFirst) w.where(sqlOrBracket as string, params)
  else if (combine === 'or') w.orWhere(sqlOrBracket as string, params)
  else w.andWhere(sqlOrBracket as string, params)
}

/** Build a parameterized SQL fragment for one operator. */
function buildFragment(
  col: string,
  op: FilterOperator,
  value: unknown,
  nextParam: () => string,
): { sql: string; params?: Record<string, unknown> } | null {
  switch (op) {
    case 'eq': {
      const p = nextParam()
      return { sql: `${col} = :${p}`, params: { [p]: value } }
    }
    case 'ne': {
      const p = nextParam()
      return { sql: `${col} <> :${p}`, params: { [p]: value } }
    }
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      const p = nextParam()
      const sym = op === 'gt' ? '>' : op === 'gte' ? '>=' : op === 'lt' ? '<' : '<='
      return { sql: `${col} ${sym} :${p}`, params: { [p]: value } }
    }
    case 'contains':
    case 'startsWith':
    case 'endsWith': {
      const p = nextParam()
      const s = escapeLike(String(value ?? ''))
      const pattern = op === 'contains' ? `%${s}%` : op === 'startsWith' ? `${s}%` : `%${s}`
      return { sql: `${col} ILIKE :${p}`, params: { [p]: pattern } }
    }
    case 'in':
    case 'notIn': {
      const arr = Array.isArray(value) ? value : [value]
      if (arr.length === 0) return null
      const p = nextParam()
      return { sql: `${col} ${op === 'in' ? 'IN' : 'NOT IN'} (:...${p})`, params: { [p]: arr } }
    }
    case 'between': {
      const arr = Array.isArray(value) ? value : []
      if (arr.length !== 2) return null
      const a = nextParam()
      const b = nextParam()
      return { sql: `${col} BETWEEN :${a} AND :${b}`, params: { [a]: arr[0], [b]: arr[1] } }
    }
    case 'isNull':
      return { sql: `${col} IS NULL` }
    case 'isNotNull':
      return { sql: `${col} IS NOT NULL` }
    case 'isTrue':
      return { sql: `${col} = true` }
    case 'isFalse':
      return { sql: `${col} = false` }
    default:
      return null
  }
}
