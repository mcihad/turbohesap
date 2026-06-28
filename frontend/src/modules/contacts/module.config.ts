import {
  LayoutDashboard,
  Users,
  FolderTree,
  Target,
  KanbanSquare,
  PieChart,
  CalendarCheck,
  Settings2,
  Sparkles,
  Bell,
  SlidersHorizontal,
  Upload,
  Plug,
} from 'lucide-react'

import { ContactsPermissions } from '@turbohesap/shared'

import type { AppModule } from '@/modules/types'

export const contactsModule: AppModule = {
  key: 'contacts',
  label: 'Cari',
  icon: Users,
  home: '/contacts',
  nav: [
    {
      items: [
        { title: 'Gösterge Paneli', icon: LayoutDashboard, to: '/contacts', exact: true },
        {
          title: 'CRM Panosu',
          icon: PieChart,
          to: '/contacts/crm-dashboard',
          keywords: ['crm', 'pano', 'analiz', 'huni', 'forecast', 'tahmin'],
          permission: ContactsPermissions.opportunitiesRead,
        },
        {
          title: 'Bugün',
          icon: CalendarCheck,
          to: '/contacts/my-work',
          keywords: ['bugün', 'işlerim', 'görev', 'ajanda', 'today', 'tasks'],
          permission: ContactsPermissions.activitiesRead,
        },
        {
          title: 'Bildirimler',
          icon: Bell,
          to: '/contacts/notifications',
          keywords: ['bildirim', 'notification', 'hatırlatma', 'uyarı'],
          permission: ContactsPermissions.notificationsRead,
        },
        {
          title: 'Cariler',
          icon: Users,
          to: '/contacts/contacts',
          keywords: ['cari', 'müşteri', 'tedarikçi', 'customer', 'supplier', 'contact'],
          permission: ContactsPermissions.contactsRead,
        },
        {
          title: 'Adaylar',
          icon: Sparkles,
          to: '/contacts/leads',
          keywords: ['aday', 'lead', 'potansiyel', 'müşteri adayı'],
          permission: ContactsPermissions.contactsRead,
        },
        {
          title: 'Cari Grupları',
          icon: FolderTree,
          to: '/contacts/groups',
          keywords: ['grup', 'group', 'kategori'],
          permission: ContactsPermissions.contactsRead,
        },
        {
          title: 'Satış Hattı',
          icon: KanbanSquare,
          to: '/contacts/pipeline',
          keywords: ['satış hattı', 'pipeline', 'kanban', 'pano', 'fırsat'],
          permission: ContactsPermissions.opportunitiesRead,
        },
        {
          title: 'Fırsatlar',
          icon: Target,
          to: '/contacts/opportunities',
          keywords: ['fırsat', 'opportunity', 'satış', 'pipeline', 'crm'],
          permission: ContactsPermissions.opportunitiesRead,
        },
        {
          title: 'Cari İçe Aktar',
          icon: Upload,
          to: '/contacts/contacts-import',
          keywords: ['içe aktar', 'import', 'csv', 'toplu'],
          permission: ContactsPermissions.contactsWrite,
        },
        {
          title: 'Satış Hattı Ayarları',
          icon: Settings2,
          to: '/contacts/pipelines/settings',
          keywords: ['aşama', 'stage', 'pipeline', 'ayar', 'satış hattı'],
          permission: ContactsPermissions.pipelinesWrite,
        },
        {
          title: 'CRM Özel Alanları',
          icon: SlidersHorizontal,
          to: '/contacts/crm-fields',
          keywords: ['özel alan', 'custom field', 'alan', 'ayar'],
          permission: ContactsPermissions.pipelinesWrite,
        },
        {
          title: 'Entegrasyonlar',
          icon: Plug,
          to: '/contacts/integrations',
          keywords: ['entegrasyon', 'integration', 'e-posta', 'whatsapp', 'telegram', 'sms', 'ai'],
          permission: ContactsPermissions.integrationsWrite,
        },
      ],
    },
  ],
}
