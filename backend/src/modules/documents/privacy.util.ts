import { ForbiddenException } from '@nestjs/common'

import { DocumentsPermissions } from '@turbohesap/shared'

import type { AccessService } from '../iam/access.service'

// Shared "genuinely enforced" privacy checks used by both
// `document-categories.service.ts` and `documents.service.ts`. Enforcement lives
// here (query/service layer), not the controller guard, so it can't be bypassed
// by omitting a query param — unlike the existing `contacts` `?mine=true`
// convenience filter, which is opt-in only.

export async function hasPrivateReadAll(
  access: AccessService,
  userId: string,
): Promise<boolean> {
  const keys = await access.permissionKeys(userId)
  return keys.includes(DocumentsPermissions.privateReadAll)
}

export async function requirePrivateManage(
  access: AccessService,
  userId: string,
): Promise<void> {
  const keys = await access.permissionKeys(userId)
  if (!keys.includes(DocumentsPermissions.privateManage)) {
    throw new ForbiddenException(
      'Başkasına ait evrak/kategoride gizlilik veya sahip değiştirme yetkiniz yok',
    )
  }
}

/** True if changing `isPrivate`/`ownerId` on a row requires `privateManage`. */
export function privacyChangeNeedsManage(
  currentOwnerId: string | null,
  nextOwnerId: string | null | undefined,
  userId: string,
): boolean {
  const isOwnerOfExisting = currentOwnerId === userId || currentOwnerId == null
  const settingOwnerToSomeoneElse = nextOwnerId != null && nextOwnerId !== userId
  return !isOwnerOfExisting || settingOwnerToSomeoneElse
}
