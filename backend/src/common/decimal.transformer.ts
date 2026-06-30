import type { ValueTransformer } from 'typeorm'

// Money / precise-numeric transformer for TypeORM `numeric` columns. Postgres
// returns `numeric` as a string (to preserve precision); we expose it as a plain
// JS `number` on the entity and in the DTO. NEVER store money as float — use a
// `numeric(p,s)` column with this transformer (see agy.md §7.1).
export const decimalTransformer: ValueTransformer = {
  to: (value?: number | null): number | null => (value == null ? null : value),
  from: (value?: string | null): number => (value == null ? 0 : Number(value)),
}

// Like `decimalTransformer` but preserves NULL as `null` (instead of coercing to
// 0). Use on genuinely-optional numeric columns where "no value" must stay
// distinct from zero — e.g. a vehicle's odometer/fuel liters before any reading.
export const nullableDecimalTransformer: ValueTransformer = {
  to: (value?: number | null): number | null => (value == null ? null : value),
  from: (value?: string | null): number | null => (value == null ? null : Number(value)),
}
