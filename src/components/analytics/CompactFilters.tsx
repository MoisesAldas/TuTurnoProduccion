'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CalendarIcon, RefreshCw } from 'lucide-react'
import { format, startOfToday, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'
import { es } from 'date-fns/locale'
import type { DashboardFilters, PeriodType } from '@/types/analytics'
import { cn } from '@/lib/utils'

interface CompactFiltersProps {
  filters: DashboardFilters
  onFiltersChange: (filters: DashboardFilters) => void
  onRefresh?: () => void
  loading?: boolean
  compact?: boolean
}

export function CompactFilters({ 
  filters, 
  onFiltersChange, 
  onRefresh, 
  loading = false,
  compact = false 
}: CompactFiltersProps) {
  const [tempPeriod, setTempPeriod] = useState<PeriodType>(filters.period)
  const [tempRange, setTempRange] = useState<{ from: Date; to: Date }>({
    from: filters.startDate,
    to: filters.endDate,
  })

  // Estados para mes y año específicos
  const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth()))
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()))

  // Lista de meses
  const months = [
    { value: '0', label: 'Enero' },
    { value: '1', label: 'Febrero' },
    { value: '2', label: 'Marzo' },
    { value: '3', label: 'Abril' },
    { value: '4', label: 'Mayo' },
    { value: '5', label: 'Junio' },
    { value: '6', label: 'Julio' },
    { value: '7', label: 'Agosto' },
    { value: '8', label: 'Septiembre' },
    { value: '9', label: 'Octubre' },
    { value: '10', label: 'Noviembre' },
    { value: '11', label: 'Diciembre' },
  ]

  // Lista de años
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 7 }, (_, i) => {
    const year = currentYear - 5 + i
    return { value: String(year), label: String(year) }
  })

  const handlePeriodChange = (value: string) => {
    const period = value as PeriodType
    setTempPeriod(period)

    let startDate: Date
    let endDate: Date

    switch (period) {
      case 'day':
        startDate = startOfToday()
        endDate = startOfToday()
        break
      case 'month':
        startDate = startOfMonth(new Date())
        endDate = endOfMonth(new Date())
        break
      case 'year':
        startDate = startOfYear(new Date())
        endDate = endOfYear(new Date())
        break
      case 'specific-month':
        const monthNum = parseInt(selectedMonth)
        const yearNum = parseInt(selectedYear)
        startDate = startOfMonth(new Date(yearNum, monthNum, 1))
        endDate = endOfMonth(new Date(yearNum, monthNum, 1))
        setTempRange({ from: startDate, to: endDate })
        // Auto-apply for specific month
        onFiltersChange({ period, startDate, endDate })
        return
      case 'specific-year':
        const specificYear = parseInt(selectedYear)
        startDate = startOfYear(new Date(specificYear, 0, 1))
        endDate = endOfYear(new Date(specificYear, 0, 1))
        setTempRange({ from: startDate, to: endDate })
        // Auto-apply for specific year
        onFiltersChange({ period, startDate, endDate })
        return
      case 'custom':
        return
      default:
        startDate = startOfMonth(new Date())
        endDate = endOfMonth(new Date())
    }

    setTempRange({ from: startDate, to: endDate })
    // Auto-apply for quick periods
    onFiltersChange({ period, startDate, endDate })
  }

  const handleMonthChange = (value: string) => {
    setSelectedMonth(value)
    const monthNum = parseInt(value)
    const yearNum = parseInt(selectedYear)
    const startDate = startOfMonth(new Date(yearNum, monthNum, 1))
    const endDate = endOfMonth(new Date(yearNum, monthNum, 1))
    setTempRange({ from: startDate, to: endDate })
    onFiltersChange({ period: 'specific-month', startDate, endDate })
  }

  const handleYearChange = (value: string) => {
    setSelectedYear(value)
    
    // If in specific-year mode, update the year range
    if (tempPeriod === 'specific-year') {
      const yearNum = parseInt(value)
      const startDate = startOfYear(new Date(yearNum, 0, 1))
      const endDate = endOfYear(new Date(yearNum, 0, 1))
      setTempRange({ from: startDate, to: endDate })
      onFiltersChange({ period: 'specific-year', startDate, endDate })
    } else {
      // If in specific-month mode, update the month range
      const monthNum = parseInt(selectedMonth)
      const yearNum = parseInt(value)
      const startDate = startOfMonth(new Date(yearNum, monthNum, 1))
      const endDate = endOfMonth(new Date(yearNum, monthNum, 1))
      setTempRange({ from: startDate, to: endDate })
      onFiltersChange({ period: 'specific-month', startDate, endDate })
    }
  }

  const handleDateRangeSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range?.from && range?.to) {
      setTempRange({ from: range.from, to: range.to })
      onFiltersChange({ period: 'custom', startDate: range.from, endDate: range.to })
    }
  }

  return (
    <div className={cn(
      "flex items-center gap-2 flex-wrap",
      compact && "justify-end"
    )}>
      {/* Period Selector */}
      <Select value={tempPeriod} onValueChange={handlePeriodChange}>
        <SelectTrigger className={cn(
          "w-full sm:w-[160px] transition-all flex-shrink-0",
          compact && "bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700"
        )}>
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="day">Hoy</SelectItem>
          <SelectItem value="month">Este mes</SelectItem>
          <SelectItem value="year">Este año</SelectItem>
          <SelectItem value="specific-month">Mes específico</SelectItem>
          <SelectItem value="specific-year">Año específico</SelectItem>
          <SelectItem value="custom">Personalizado</SelectItem>
        </SelectContent>
      </Select>

      {/* Month and Year for Specific Month */}
      {tempPeriod === 'specific-month' && (
        <>
          <Select value={selectedMonth} onValueChange={handleMonthChange}>
            <SelectTrigger className={cn(
              "w-full sm:w-[130px] flex-shrink-0",
              compact && "bg-gray-800 border-gray-700 text-gray-200"
            )}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedYear} onValueChange={handleYearChange}>
            <SelectTrigger className={cn(
              "w-full sm:w-[100px] flex-shrink-0",
              compact && "bg-gray-800 border-gray-700 text-gray-200"
            )}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year.value} value={year.value}>
                  {year.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}

      {/* Year selector for Specific Year */}
      {tempPeriod === 'specific-year' && (
        <Select value={selectedYear} onValueChange={handleYearChange}>
          <SelectTrigger className={cn(
            "w-full sm:w-[100px] flex-shrink-0",
            compact && "bg-gray-800 border-gray-700 text-gray-200"
          )}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year.value} value={year.value}>
                {year.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Custom Date Range */}
      {tempPeriod === 'custom' && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full sm:w-auto justify-start text-left font-normal flex-shrink-0",
                compact && "bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {tempRange.from && tempRange.to ? (
                <>
                  <span className="hidden sm:inline">{format(tempRange.from, 'dd/MM/yy')} - {format(tempRange.to, 'dd/MM/yy')}</span>
                  <span className="sm:hidden">{format(tempRange.from, 'dd/MM')} - {format(tempRange.to, 'dd/MM')}</span>
                </>
              ) : (
                <span>Seleccionar</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={{ from: tempRange.from, to: tempRange.to }}
              onSelect={handleDateRangeSelect}
              locale={es}
              numberOfMonths={1}
              className="sm:block"
              captionLayout="dropdown-buttons"
              fromYear={2020}
              toYear={2030}
            />
          </PopoverContent>
        </Popover>
      )}

      {/* Refresh Button */}
      {onRefresh && (
        <Button
          onClick={onRefresh}
          disabled={loading}
          size={compact ? "icon" : "default"}
          className={cn(
            "bg-orange-600 hover:bg-orange-700 text-white border-0 flex-shrink-0",
            compact && "bg-orange-600 hover:bg-orange-700",
            !compact && "w-full sm:w-auto"
          )}
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin", !compact && "sm:mr-0")} />
          {!compact && <span className="ml-2 sm:hidden">Actualizar</span>}
        </Button>
      )}
    </div>
  )
}
