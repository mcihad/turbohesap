import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge class names with Tailwind-aware conflict resolution.
 * Use everywhere instead of template strings so later classes win predictably.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
