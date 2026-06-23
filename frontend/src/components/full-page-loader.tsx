import { Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'

/** Centered full-viewport spinner for auth/route transitions. */
export function FullPageLoader({
  label,
  className,
}: {
  label?: string
  className?: string
}) {
  return (
    <div
      data-slot="full-page-loader"
      className={cn(
        'flex min-h-svh flex-col items-center justify-center gap-3 bg-background text-muted-foreground',
        className,
      )}
    >
      <Loader2 className="size-6 animate-spin" />
      {label ? <p className="text-sm">{label}</p> : null}
    </div>
  )
}
