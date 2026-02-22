'use client'

import * as React from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { DayPicker } from 'react-day-picker'

import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
        month: 'space-y-4',
        caption: 'flex justify-between pt-1 relative items-center px-2',
        caption_label: 'hidden', // Hide to prevent duplication with dropdowns
        caption_dropdowns: 'flex gap-2 justify-center flex-1',
        vhidden: 'hidden', // Hide aria labels for accessibility
        dropdown: 'appearance-none px-2 py-1.5 rounded-xl border border-gray-200 text-xs font-black bg-white hover:bg-primary/5 hover:border-primary/20 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary cursor-pointer transition-all uppercase tracking-widest text-center',
        dropdown_month: 'min-w-[120px]',
        dropdown_year: 'min-w-[100px]',
        dropdown_icon: 'ml-1 text-primary',
        nav: 'space-x-1 flex items-center',
        nav_button: cn(
          buttonVariants({ variant: 'outline' }),
          'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100'
        ),
        nav_button_previous: '',
        nav_button_next: '',
        table: 'w-full border-collapse space-y-1',
        head_row: 'flex',
        head_cell: 'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]',
        row: 'flex w-full mt-2',
        cell: 'text-center text-sm p-0 relative focus-within:relative focus-within:z-20',
        day: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-full transition-all'
        ),
        day_selected: 'bg-primary text-white hover:bg-primary hover:text-white focus:bg-primary focus:text-white rounded-full shadow-md font-black',
        day_today: 'bg-primary/10 text-primary font-black rounded-full',
        day_outside: 'text-muted-foreground opacity-50',
        day_disabled: 'text-muted-foreground opacity-50',
        day_range_middle: 'aria-selected:bg-accent aria-selected:text-accent-foreground',
        day_hidden: 'invisible',
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeftIcon className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRightIcon className="h-4 w-4" />,
      }}
      {...props}
    />
  )
}

export { Calendar }
