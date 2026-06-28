import { ContactsPermissions } from '@turbohesap/shared'
import type { MobileModule } from '../types'

export const contactsModule: MobileModule = {
  key: 'contacts',
  label: 'Cari',
  icon: 'users',
  home: 'contacts.home',
  permission: ContactsPermissions.contactsRead,
  items: [
    {
      key: 'contacts.crm',
      title: 'Satış Paneli',
      icon: 'bar-chart-2',
      description: 'CRM kontrol paneli',
      permission: ContactsPermissions.opportunitiesRead,
    },
    {
      key: 'contacts.my-work',
      title: 'Bugün',
      icon: 'sun',
      description: 'Bugünkü işlerim ve açık fırsatlar',
      permission: ContactsPermissions.activitiesRead,
    },
    {
      key: 'contacts.contacts',
      title: 'Cariler',
      icon: 'users',
      description: 'Müşteri ve tedarikçiler',
      permission: ContactsPermissions.contactsRead,
    },
    {
      key: 'contacts.leads',
      title: 'Adaylar',
      icon: 'user-plus',
      description: 'Potansiyel müşteriler (lead)',
      permission: ContactsPermissions.contactsRead,
    },
    {
      key: 'contacts.notifications',
      title: 'Bildirimler',
      icon: 'bell',
      description: 'CRM bildirimleri',
      permission: ContactsPermissions.notificationsRead,
    },
    {
      key: 'contacts.integrations',
      title: 'Entegrasyonlar',
      icon: 'sliders',
      description: 'E-posta, Telegram, WhatsApp, SMS ve AI',
      permission: ContactsPermissions.integrationsWrite,
    },
    {
      key: 'contacts.pipeline',
      title: 'Satış Hattı',
      icon: 'columns',
      description: 'Fırsat panosu (Kanban)',
      permission: ContactsPermissions.opportunitiesRead,
    },
    {
      key: 'contacts.groups',
      title: 'Cari Grupları',
      icon: 'folder',
      description: 'Cari grup ağacı',
      permission: ContactsPermissions.contactsRead,
    },
    {
      key: 'contacts.opportunities',
      title: 'Fırsatlar',
      icon: 'target',
      description: 'Satış fırsatları',
      permission: ContactsPermissions.opportunitiesRead,
    },
  ],
}
