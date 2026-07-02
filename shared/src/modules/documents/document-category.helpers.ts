// Pure, framework-agnostic helpers over the document-category contracts — a
// deliberate duplicate of `inventory/category.helpers.ts`'s logic (ancestor→self
// fieldDefs merge, cycle-safe) operating over `DocumentFieldDef` instead.

import type { DocumentFieldDef } from './document-category.dto'

interface DocumentCategoryNode {
  id: string
  parentId: string | null
  name?: string
  fieldDefs: DocumentFieldDef[]
}

// A field definition together with the category it is inherited from.
export interface SourcedDocumentFieldDef {
  def: DocumentFieldDef
  sourceCategoryId: string
  sourceName: string
}

/**
 * The **effective** custom field set for a category: its own field definitions
 * merged with those inherited from all ancestors (root → … → self). A child's
 * field with the same `key` overrides the ancestor's. Ordered by `sortOrder`.
 */
export function effectiveDocumentFieldDefs(
  categoryId: string | null | undefined,
  categories: DocumentCategoryNode[],
): DocumentFieldDef[] {
  if (!categoryId) return []
  const byId = new Map(categories.map((c) => [c.id, c]))

  const chain: DocumentCategoryNode[] = []
  let current = byId.get(categoryId) ?? null
  const guard = new Set<string>()
  while (current && !guard.has(current.id)) {
    guard.add(current.id)
    chain.unshift(current)
    current = current.parentId ? byId.get(current.parentId) ?? null : null
  }

  const merged = new Map<string, DocumentFieldDef>()
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
 * Like {@link effectiveDocumentFieldDefs}, but each field carries the category it
 * comes from. Used by the document form to group fields by source category.
 */
export function effectiveDocumentFieldDefsWithSource(
  categoryId: string | null | undefined,
  categories: DocumentCategoryNode[],
): SourcedDocumentFieldDef[] {
  if (!categoryId) return []
  const byId = new Map(categories.map((c) => [c.id, c]))

  const chain: DocumentCategoryNode[] = []
  let current = byId.get(categoryId) ?? null
  const guard = new Set<string>()
  while (current && !guard.has(current.id)) {
    guard.add(current.id)
    chain.unshift(current)
    current = current.parentId ? byId.get(current.parentId) ?? null : null
  }

  const merged = new Map<string, SourcedDocumentFieldDef>()
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
export function missingRequiredDocumentAttributes(
  fields: DocumentFieldDef[],
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
