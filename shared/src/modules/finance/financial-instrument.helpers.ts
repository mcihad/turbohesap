// Pure "due status" helper for çek/senet — a deliberate duplicate of
// `documents/document.helpers.ts`'s `computeExpiryStatus` (no cross-module
// import, per AGENTS.md §4: each module owns its own full contract).

export type InstrumentDueStatus = 'active' | 'due_soon' | 'overdue'

export function computeInstrumentDueStatus(
  dueDate: string,
  today: Date = new Date(),
  dueSoonDays = 7,
): InstrumentDueStatus {
  const days = Math.floor((new Date(dueDate).getTime() - today.getTime()) / 86_400_000)
  if (days < 0) return 'overdue'
  if (days <= dueSoonDays) return 'due_soon'
  return 'active'
}
