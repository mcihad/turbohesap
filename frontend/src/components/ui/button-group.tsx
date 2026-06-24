import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * ButtonGroup — segments a row of `Button`s into a single connected control
 * (shared borders, rounded only on the ends). Works best with `variant="outline"`
 * buttons. Just wrap them:
 *
 *   <ButtonGroup>
 *     <Button variant="outline">Gün</Button>
 *     <Button variant="outline">Hafta</Button>
 *     <Button variant="outline">Ay</Button>
 *   </ButtonGroup>
 */
function ButtonGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      role="group"
      data-slot="button-group"
      className={cn(
        'inline-flex items-center',
        '[&>*]:rounded-none [&>*:first-child]:rounded-l-md [&>*:last-child]:rounded-r-md',
        '[&>*:not(:first-child)]:-ml-px',
        '[&>*]:focus-visible:relative [&>*]:focus-visible:z-10',
        className,
      )}
      {...props}
    />
  )
}

export { ButtonGroup }
