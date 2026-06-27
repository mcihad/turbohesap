import type { BranchType } from '@turbohesap/shared'

// Turkish labels for branch types (UI only — the wire value is the key).
export const BRANCH_TYPE_LABELS: Record<BranchType, string> = {
  headquarter: 'Merkez',
  branch: 'Şube',
  store: 'Mağaza',
  warehouse: 'Depo',
  office: 'Ofis',
  factory: 'Fabrika',
}

export function branchTypeLabel(type: BranchType): string {
  return BRANCH_TYPE_LABELS[type] ?? type
}
