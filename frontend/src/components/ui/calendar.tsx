import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DayPicker, getDefaultClassNames } from 'react-day-picker'
import { tr } from 'date-fns/locale'

import { cn } from '@/lib/utils'
import { buttonVariants } from './button'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

// Token-driven calendar built on react-day-picker (v10). Supports single/range
// selection via the standard DayPicker props (`mode`, `selected`, `onSelect`).
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const d = getDefaultClassNames()
  return (
    <DayPicker
      data-slot="calendar"
      locale={tr}
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: cn(d.months, 'relative flex flex-col gap-4 sm:flex-row'),
        month: cn(d.month, 'flex flex-col gap-4'),
        month_caption: cn(d.month_caption, 'flex h-8 items-center justify-center'),
        caption_label: cn(d.caption_label, 'text-sm font-medium capitalize'),
        nav: cn(d.nav, 'absolute inset-x-0 top-0 flex items-center justify-between'),
        button_previous: cn(
          buttonVariants({ variant: 'outline', size: 'icon-sm' }),
          'opacity-70 hover:opacity-100',
        ),
        button_next: cn(
          buttonVariants({ variant: 'outline', size: 'icon-sm' }),
          'opacity-70 hover:opacity-100',
        ),
        month_grid: cn(d.month_grid, 'w-full border-collapse'),
        weekdays: cn(d.weekdays, 'flex'),
        weekday: cn(
          d.weekday,
          'w-9 rounded-md text-xs font-normal text-muted-foreground',
        ),
        week: cn(d.week, 'mt-1 flex w-full'),
        day: cn(
          d.day,
          'relative size-9 p-0 text-center text-sm focus-within:relative focus-within:z-20',
        ),
        day_button: cn(
          buttonVariants({ variant: 'ghost' }),
          'size-9 rounded-md p-0 font-normal',
        ),
        selected: cn(
          d.selected,
          '[&>button]:bg-primary [&>button]:text-primary-foreground [&>button:hover]:bg-primary [&>button:hover]:text-primary-foreground',
        ),
        range_start: cn(d.range_start, 'rounded-l-md bg-accent'),
        range_end: cn(d.range_end, 'rounded-r-md bg-accent'),
        range_middle: cn(
          d.range_middle,
          'rounded-none bg-accent text-accent-foreground [&>button]:!bg-transparent [&>button]:!text-accent-foreground [&>button:hover]:!bg-accent',
        ),
        today: cn(d.today, '[&>button]:font-semibold [&>button]:text-primary'),
        outside: cn(d.outside, 'text-muted-foreground/40'),
        disabled: cn(d.disabled, 'text-muted-foreground/30'),
        hidden: cn(d.hidden, 'invisible'),
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: cls }) => {
          const Icon = orientation === 'left' ? ChevronLeft : ChevronRight
          return <Icon className={cn('size-4', cls)} />
        },
      }}
      {...props}
    />
  )
}

export { Calendar }
