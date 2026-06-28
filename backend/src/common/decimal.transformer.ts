import type { ValueTransformer } from 'typeorm'

// Money / precise-numeric transformer for TypeORM `numeric` columns. Postgres
// returns `numeric` as a string (to preserve precision); we expose it as a plain
// JS `number` on the entity and in the DTO. NEVER store money as float — use a
// `numeric(p,s)` column with this transformer (see agy.md §7.1).
export const decimalTransformer: ValueTransformer = {
  to: (value?: number | null): number | null => (value == null ? null : value),
  from: (value?: string | null): number => (value == null ? 0 : Number(value)),
}
