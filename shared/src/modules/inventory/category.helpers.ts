// Pure, framework-agnostic helpers over the category contracts. Used by both the
// web and mobile dynamic product form to resolve which custom fields apply to a
// product in a given category.

import type { CategoryFieldDef } from './category.dto'

interface CategoryNode {
  id: string
  parentId: string | null
  name?: string
  fieldDefs: CategoryFieldDef[]
}

// A field definition together with the category it is inherited from.
export interface SourcedFieldDef {
  def: CategoryFieldDef
  sourceCategoryId: string
  sourceName: string
}

/**
 * The **effective** custom field set for a category: its own field definitions
 * merged with those inherited from all ancestors (root → … → self). A child's
 * field with the same `key` overrides the ancestor's. The result is ordered by
 * `sortOrder` (then insertion). This is what the dynamic product form renders.
 */
export function effectiveFieldDefs(
  categoryId: string | null | undefined,
  categories: CategoryNode[],
): CategoryFieldDef[] {
  if (!categoryId) return []
  const byId = new Map(categories.map((c) => [c.id, c]))

  // Build the ancestor chain root → self.
  const chain: CategoryNode[] = []
  let current = byId.get(categoryId) ?? null
  const guard = new Set<string>()
  while (current && !guard.has(current.id)) {
    guard.add(current.id)
    chain.unshift(current)
    current = current.parentId ? byId.get(current.parentId) ?? null : null
  }

  // Merge by key, child (later) overriding ancestor (earlier).
  const merged = new Map<string, CategoryFieldDef>()
  for (const node of chain) {
    for (const def of node.fieldDefs ?? []) {
      if (def?.key) merged.set(def.key, def)
    }
  }

  return [...merged.values()].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  )
}

/**
 * Like {@link effectiveFieldDefs}, but each field carries the category it comes
 * from (the deepest ancestor — or self — that defines its key). Used by the
 * product form to show fields grouped by their source category.
 */
export function effectiveFieldDefsWithSource(
  categoryId: string | null | undefined,
  categories: CategoryNode[],
): SourcedFieldDef[] {
  if (!categoryId) return []
  const byId = new Map(categories.map((c) => [c.id, c]))

  const chain: CategoryNode[] = []
  let current = byId.get(categoryId) ?? null
  const guard = new Set<string>()
  while (current && !guard.has(current.id)) {
    guard.add(current.id)
    chain.unshift(current)
    current = current.parentId ? byId.get(current.parentId) ?? null : null
  }

  const merged = new Map<string, SourcedFieldDef>()
  for (const node of chain) {
    for (const def of node.fieldDefs ?? []) {
      if (def?.key) {
        merged.set(def.key, {
          def,
          sourceCategoryId: node.id,
          sourceName: node.name ?? '',
        })
      }
    }
  }

  return [...merged.values()].sort(
    (a, b) => (a.def.sortOrder ?? 0) - (b.def.sortOrder ?? 0),
  )
}

/** Keys of required fields with no value yet (for submit-time validation). */
export function missingRequiredAttributes(
  fields: CategoryFieldDef[],
  values: Record<string, unknown>,
): string[] {
  return fields
    .filter((f) => f.required)
    .filter((f) => {
      const v = values[f.key]
      if (v == null || v === '') return true
      if (Array.isArray(v)) return v.length === 0
      if (f.type === 'daterange') {
        const r = v as { from?: string; to?: string }
        return !r?.from || !r?.to
      }
      return false
    })
    .map((f) => f.key)
}
