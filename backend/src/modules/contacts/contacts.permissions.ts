import { ContactsPermissions } from '@turbohesap/shared'

import type { PermissionDef } from '../../common/permission.types'

// Module permission catalog (shared keys + Turkish descriptions). Persons &
// addresses reuse the `contacts.*` keys (they are sub-resources of a contact).
export const CONTACTS_PERMISSION_DEFS: PermissionDef[] = [
  { key: ContactsPermissions.contactsRead, description: 'Carileri görüntüleme', group: 'Cari' },
  { key: ContactsPermissions.contactsWrite, description: 'Cari ekleme, düzenleme ve silme', group: 'Cari' },
  { key: ContactsPermissions.transactionsRead, description: 'Cari hareketleri (ekstre) görüntüleme', group: 'Cari' },
  { key: ContactsPermissions.transactionsWrite, description: 'Cari hareket ekleme, düzenleme ve silme', group: 'Cari' },
  { key: ContactsPermissions.activitiesRead, description: 'Etkinlikleri görüntüleme', group: 'Cari' },
  { key: ContactsPermissions.activitiesWrite, description: 'Etkinlik ekleme, düzenleme ve silme', group: 'Cari' },
  { key: ContactsPermissions.opportunitiesRead, description: 'Fırsatları görüntüleme', group: 'Cari' },
  { key: ContactsPermissions.opportunitiesWrite, description: 'Fırsat ekleme, düzenleme ve silme', group: 'Cari' },
  { key: ContactsPermissions.pipelinesRead, description: 'Satış hatlarını görüntüleme', group: 'Cari' },
  { key: ContactsPermissions.pipelinesWrite, description: 'Satış hattı ve aşama yönetimi', group: 'Cari' },
  { key: ContactsPermissions.notificationsRead, description: 'Bildirimleri görüntüleme', group: 'Cari' },
  { key: ContactsPermissions.integrationsRead, description: 'Entegrasyonları görüntüleme', group: 'Cari' },
  { key: ContactsPermissions.integrationsWrite, description: 'Entegrasyon yapılandırma ve mesaj/AI kullanımı', group: 'Cari' },
]
