import { InvoicesPermissions } from '@turbohesap/shared'

import type { PermissionDef } from '../../common/permission.types'

export const INVOICES_PERMISSION_DEFS: PermissionDef[] = [
  { key: InvoicesPermissions.read, description: 'Faturaları görüntüleme', group: 'Fatura' },
  { key: InvoicesPermissions.write, description: 'Fatura oluşturma, düzenleme, kesme ve iptal', group: 'Fatura' },
]
