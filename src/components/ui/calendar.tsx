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
      className={cn('p-3 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]', className)}
      classNames={{
        months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
        month: 'space-y-4 w-full',
        caption: 'flex justify-center pt-1 relative items-center w-full mb-4 px-2',
        caption_label: cn(
          'text-sm font-black text-gray-900 tracking-tight uppercase',
          (props.captionLayout === 'dropdown' || props.captionLayout === 'dropdown-buttons') && 'hidden'
        ),
        nav: 'space-x-1 flex items-center',
        nav_button: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-8 w-8 bg-gray-50/50 p-0 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all duration-200'
        ),
        nav_button_previous: 'absolute left-2',
        nav_button_next: 'absolute right-2',
        table: 'w-full border-collapse space-y-1',
        head_row: 'flex w-full justify-between mb-2 px-1',
        head_cell:
          'text-gray-400 rounded-md w-9 font-extrabold text-[10px] uppercase tracking-[0.2em] text-center',
        row: 'flex w-full mt-1.5 justify-between',
        cell: 'text-center text-sm p-0 relative [&:has([aria-selected])]:bg-slate-50 first:[&:has([aria-selected])]:rounded-l-xl last:[&:has([aria-selected])]:rounded-r-xl focus-within:relative focus-within:z-20 transition-all duration-200',
        day: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-9 w-9 p-0 font-extrabold rounded-xl aria-selected:opacity-100 hover:bg-slate-100 transition-all duration-200'
        ),
        day_selected:
          '!bg-slate-900 !text-white hover:!bg-slate-800 focus:!bg-slate-900 shadow-[0_4px_12px_rgba(0,0,0,0.1)] !opacity-100',
        day_today: 'text-slate-900 font-black ring-2 ring-slate-200 ring-offset-2',
        day_outside: 'text-gray-300 opacity-50',
        day_disabled: 'text-gray-200 opacity-50',
        day_range_middle: 'aria-selected:bg-slate-50 aria-selected:text-slate-900',
        day_hidden: 'invisible',
        caption_dropdowns: 'flex gap-1 items-center bg-gray-50/50 p-1 rounded-xl border border-gray-100',
        dropdown: 'rounded-lg border-0 bg-transparent px-2 py-1 text-xs font-black uppercase tracking-tight text-gray-900 focus:outline-none focus:ring-0 cursor-pointer hover:text-gray-600 transition-colors',
        dropdown_month: 'relative inline-flex items-center',
        dropdown_year: 'relative inline-flex items-center',
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeftIcon className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRightIcon className="h-4 w-4" />,
        Dropdown: ({ ...props }) => (
          <select
            className={cn(
              'rounded-lg border-0 bg-transparent px-2 py-1 text-xs font-black uppercase tracking-tight text-gray-900 focus:outline-none focus:ring-0 cursor-pointer hover:bg-gray-100 transition-all appearance-none',
              props.className
            )}
            {...props}
          />
        ),
      }}
      {...props}
    />
  )
}

export { Calendar }