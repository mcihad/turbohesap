// Permission keys for the Contacts (Cari) module — the single source of truth
// shared by the backend guard/catalog and the frontend/mobile gating.
//
// Sub-resources of a contact (persons, addresses) reuse the `contacts.*` keys;
// transactions (cari ekstre), activities (CRM etkinlik) and opportunities
// (satış fırsatı) have their own read/write keys so they can be granted
// independently.
export const ContactsPermissions = {
  contactsRead: 'contacts.contacts.read',
  contactsWrite: 'contacts.contacts.write',
  transactionsRead: 'contacts.transactions.read',
  transactionsWrite: 'contacts.transactions.write',
  activitiesRead: 'contacts.activities.read',
  activitiesWrite: 'contacts.activities.write',
  opportunitiesRead: 'contacts.opportunities.read',
  opportunitiesWrite: 'contacts.opportunities.write',
  pipelinesRead: 'contacts.pipelines.read',
  pipelinesWrite: 'contacts.pipelines.write',
  notificationsRead: 'contacts.notifications.read',
  integrationsRead: 'contacts.integrations.read',
  integrationsWrite: 'contacts.integrations.write',
} as const

export type ContactsPermission =
  (typeof ContactsPermissions)[keyof typeof ContactsPermissions]
