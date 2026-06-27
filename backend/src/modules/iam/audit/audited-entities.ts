// Configuration for the audit subscriber.

// Entities NEVER audited (would recurse or are pure infra/noise).
export const IGNORED_AUDIT_ENTITIES = new Set<string>([
  'AuditLog',
  'ErrorLog',
  'RefreshToken',
])

// Column names whose values are redacted in the recorded diff.
export const REDACTED_AUDIT_FIELDS = new Set<string>([
  'passwordHash',
  'password',
  'token',
  'secret',
])

// Updates that touch ONLY these columns are skipped (bookkeeping, not a
// meaningful business change) — e.g. the lastLoginAt bump on every login.
export const NOISE_AUDIT_FIELDS = new Set<string>(['lastLoginAt'])

// Maps an entity class name to its owning app module key. Add new modules' audited
// entities here so their audit/error rows are labelled with the right module.
export const ENTITY_MODULE_MAP: Record<string, string> = {
  User: 'iam',
  Role: 'iam',
  Permission: 'iam',
  SalesChannel: 'sales',
  Branch: 'org',
  LookupItem: 'lookups',
  Category: 'inventory',
  Product: 'inventory',
  ProductVariant: 'inventory',
  ProductPackaging: 'inventory',
  ProductStock: 'inventory',
  ProductChannelPrice: 'inventory',
}

export function moduleForEntity(entityName: string): string | null {
  return ENTITY_MODULE_MAP[entityName] ?? null
}
