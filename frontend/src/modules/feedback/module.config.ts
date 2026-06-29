import { LayoutDashboard, MessageSquareDot } from 'lucide-react'

import { FeedbackPermissions } from '@turbohesap/shared'

import type { AppModule } from '@/modules/types'

// Geri Bildirimler — triage in-app feedback (istek/öneri/hata/soru) with an
// annotated screenshot through a status workflow. Backed by /api/feedback.
export const feedbackModule: AppModule = {
  key: 'feedback',
  label: 'Geri Bildirimler',
  icon: MessageSquareDot,
  home: '/feedback',
  nav: [
    {
      items: [
        { title: 'Gösterge Paneli', icon: LayoutDashboard, to: '/feedback', exact: true },
        {
          title: 'Geri Bildirimler',
          icon: MessageSquareDot,
          to: '/feedback/items',
          keywords: ['geri bildirim', 'istek', 'öneri', 'hata', 'soru', 'feedback'],
          permission: FeedbackPermissions.read,
        },
      ],
    },
  ],
}
