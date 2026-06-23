import * as React from 'react'

import { cn } from '@/lib/utils'

/** Inline keyboard key hint, e.g. <Kbd>⌘</Kbd> <Kbd>K</Kbd>. */
function Kbd({ className, ...props }: React.ComponentProps<'kbd'>) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        'pointer-events-none inline-flex h-5 min-w-5 select-none items-center justify-center gap-1 rounded border bg-muted px-1.5 font-mono text-[0.6875rem] font-medium text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}

export { Kbd }
