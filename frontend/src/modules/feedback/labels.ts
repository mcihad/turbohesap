import type { VariantProps } from 'class-variance-authority'

import type { FeedbackPriority, FeedbackStatus } from '@turbohesap/shared'

import { badgeVariants } from '@/components/ui/badge'

type BadgeVariant = VariantProps<typeof badgeVariants>['variant']

export const STATUS_TONE: Record<FeedbackStatus, BadgeVariant> = {
  new: 'secondary',
  in_progress: 'warning',
  done: 'success',
  rejected: 'destructive',
}

export const PRIORITY_TONE: Record<FeedbackPriority, BadgeVariant> = {
  low: 'outline',
  normal: 'secondary',
  high: 'destructive',
}
