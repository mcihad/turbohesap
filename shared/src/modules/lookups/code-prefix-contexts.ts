// Central registry of code-prefix usage contexts — SINGLE SOURCE OF TRUTH.
// A `context` string only means something once some form actually renders
// <CodePrefixInput context="...">; without a registry there was no way to
// discover what strings exist, so admins had to guess/copy them by hand.
// Add (or reuse) an entry here whenever you wire <CodePrefixInput> into a new
// form — the admin "Kod Önekleri" page's context picker offers exactly these,
// so context values are typo-proof and self-documenting instead of free text.
//
// A context can be registered here BEFORE any form actually consumes it —
// that just means admins can pre-configure prefixes for it ahead of the UI
// wiring (e.g. cari/fatura/irsaliye below: registered now, <CodePrefixInput>
// integration into those forms is a separate follow-up).
export const CodePrefixContexts = {
  inventoryProducts: 'inventory.products',
  contactsContacts: 'contacts.contacts',
  invoicesInvoices: 'invoices.invoices',
  ordersDeliveries: 'orders.deliveries',
} as const

export type CodePrefixContext = (typeof CodePrefixContexts)[keyof typeof CodePrefixContexts]

export const CODE_PREFIX_CONTEXT_LABELS: Record<CodePrefixContext, string> = {
  [CodePrefixContexts.inventoryProducts]: 'Ürün / Stok kodu',
  [CodePrefixContexts.contactsContacts]: 'Cari kodu',
  [CodePrefixContexts.invoicesInvoices]: 'Fatura no',
  [CodePrefixContexts.ordersDeliveries]: 'İrsaliye no',
}

export function codePrefixContextLabel(context: string): string {
  return (CODE_PREFIX_CONTEXT_LABELS as Record<string, string>)[context] ?? context
}
