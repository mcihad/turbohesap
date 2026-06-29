import { FeedbackPermissions } from '@turbohesap/shared'

import type { PermissionDef } from '../../common/permission.types'

export const FEEDBACK_PERMISSION_DEFS: PermissionDef[] = [
  { key: FeedbackPermissions.create, description: 'Geri bildirim gönderme (buton + form)', group: 'feedback' },
  { key: FeedbackPermissions.read, description: 'Tüm geri bildirimleri görüntüleme', group: 'feedback' },
  { key: FeedbackPermissions.manage, description: 'Geri bildirim durumunu değiştirme ve silme', group: 'feedback' },
]
