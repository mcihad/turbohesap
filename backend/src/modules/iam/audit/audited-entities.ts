// Configuration for the audit subscriber.

// Entities NEVER audited (would recurse or are pure infra/noise).
export const IGNORED_AUDIT_ENTITIES = new Set<string>([
  'AuditLog',
  'ErrorLog',
  'RefreshToken',
  // Per-user UI prefs / grid state — high-churn noise, not business data.
  'UserSetting',
  // Per-user CRM notifications — high-churn, not business data.
  'Notification',
  // Integration connections hold secrets — never audit their values.
  'IntegrationConnection',
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
  StockMovement: 'inventory',
  StockMovementType: 'inventory',
  FileEntity: 'files',
  CashAccount: 'finance',
  BankAccount: 'finance',
  FinanceTransaction: 'finance',
  Contact: 'contacts',
  ContactGroup: 'contacts',
  ContactPerson: 'contacts',
  ContactAddress: 'contacts',
  ContactTransaction: 'contacts',
  Activity: 'contacts',
  Opportunity: 'contacts',
  Pipeline: 'contacts',
  PipelineStage: 'contacts',
  CrmFieldDefEntity: 'contacts',
  Invoice: 'invoices',
  InvoiceLine: 'invoices',
  InvoicePayment: 'invoices',
}

export function moduleForEntity(entityName: string): string | null {
  return ENTITY_MODULE_MAP[entityName] ?? null
}
