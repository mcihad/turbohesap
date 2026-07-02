import { In, type Repository } from 'typeorm'

import type { User } from '../iam/entities/user.entity'

// Local copy of `contacts/user-name.util.ts` — kept per-module (a two-line
// utility) rather than a cross-module import, per AGENTS.md §4 separation.

/** Human display name for a user: "First Last" or the username fallback. */
export function displayName(u: Pick<User, 'firstName' | 'lastName' | 'username'>): string {
  const full = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim()
  return full || u.username
}

/** Resolve a set of user ids to display names in one query. */
export async function ownerNameMap(
  users: Repository<User>,
  ids: Array<string | null | undefined>,
): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((x): x is string => !!x))]
  const map = new Map<string, string>()
  if (unique.length === 0) return map
  const rows = await users.find({ where: { id: In(unique) } })
  for (const u of rows) map.set(u.id, displayName(u))
  return map
}
