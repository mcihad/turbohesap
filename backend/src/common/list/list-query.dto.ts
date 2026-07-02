import { Transform } from 'class-transformer'
import { IsInt, IsOptional, IsString, Min } from 'class-validator'
import { BadRequestException } from '@nestjs/common'

import { isFilterGroup, type FilterGroup, type ListQuery, type SortSpec } from '@turbohesap/shared'

const VALID_OPS = new Set([
  'eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains', 'startsWith', 'endsWith',
  'in', 'notIn', 'between', 'isNull', 'isNotNull', 'isTrue', 'isFalse',
])
const MAX_DEPTH = 5
const MAX_RULES = 50

function validateGroup(node: unknown, depth: number, counter: { n: number }): void {
  if (depth > MAX_DEPTH) throw new BadRequestException('Filtre çok derin')
  if (typeof node !== 'object' || node === null) throw new BadRequestException('Geçersiz filtre düğümü')
  const g = node as FilterGroup
  if (g.combinator !== undefined) {
    if (g.combinator !== 'and' && g.combinator !== 'or') throw new BadRequestException('Geçersiz combinator')
    if (!Array.isArray(g.rules)) throw new BadRequestException('Geçersiz filtre grubu')
    for (const child of g.rules) validateGroup(child, depth + 1, counter)
    return
  }
  // leaf rule
  const r = node as { field?: unknown; op?: unknown }
  if (typeof r.field !== 'string' || typeof r.op !== 'string' || !VALID_OPS.has(r.op)) {
    throw new BadRequestException('Geçersiz filtre kuralı')
  }
  if (++counter.n > MAX_RULES) throw new BadRequestException('Çok fazla filtre kuralı')
}

/** JSON-parse + shape-validate the `filter` query param into a FilterGroup. */
function parseFilter(raw: unknown): FilterGroup | undefined {
  if (raw == null || raw === '') return undefined
  if (typeof raw !== 'string') return undefined
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new BadRequestException('Geçersiz filtre (JSON)')
  }
  if (!isFilterGroup(parsed as FilterGroup)) throw new BadRequestException('Filtre bir grup olmalı')
  validateGroup(parsed, 1, { n: 0 })
  return parsed as FilterGroup
}

function parseSort(raw: unknown): SortSpec[] | undefined {
  if (raw == null || raw === '') return undefined
  if (typeof raw !== 'string') return undefined
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new BadRequestException('Geçersiz sıralama (JSON)')
  }
  if (!Array.isArray(parsed)) throw new BadRequestException('Sıralama bir dizi olmalı')
  return parsed
    .filter(
      (s): s is SortSpec =>
        !!s && typeof (s as SortSpec).field === 'string' &&
        ((s as SortSpec).dir === 'asc' || (s as SortSpec).dir === 'desc'),
    )
    .slice(0, 5)
}

/**
 * Reusable base for validated, server-paginated list endpoints. Grid-specific
 * query DTOs extend this and add their own flat scalar params (role, status…).
 */
export class ListQueryDto implements ListQuery {
  @IsOptional()
  @Transform(({ value }) => (value == null ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  page?: number

  @IsOptional()
  @Transform(({ value }) => (value == null ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  pageSize?: number

  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @Transform(({ value }) => parseSort(value))
  sort?: SortSpec[]

  @IsOptional()
  @Transform(({ value }) => parseFilter(value))
  filter?: FilterGroup
}
