'use client'

import { useState, useEffect } from 'react'
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
  const [selectedMonth, setSelectedMonth] = useState<string>(String(filters.startDate.getMonth()))
  const [selectedYear, setSelectedYear] = useState<string>(String(filters.startDate.getFullYear()))

  // Sync internal state when filters prop changes externally (e.g. restored from URL on navigation)
  useEffect(() => {
    setTempPeriod(filters.period)
    setTempRange({ from: filters.startDate, to: filters.endDate })
    setSelectedMonth(String(filters.startDate.getMonth()))
    setSelectedYear(String(filters.startDate.getFullYear()))
  }, [filters.period, filters.startDate, filters.endDate])

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
      "flex flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto",
      compact && "sm:justify-end px-2"
    )}>
      {/* Selector de Período */}
      <Select value={tempPeriod} onValueChange={handlePeriodChange}>
        <SelectTrigger className={cn(
          "flex-1 min-w-[140px] sm:w-[160px] sm:flex-none transition-all font-bold h-10 rounded-xl border-gray-200 shadow-sm",
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

      {/* Botón de Actualizar (Movido arriba para mobile) */}
      {onRefresh && (
        <Button
          onClick={onRefresh}
          disabled={loading}
          size="icon"
          className={cn(
            "bg-orange-600 hover:bg-orange-700 text-white border-0 flex-shrink-0 rounded-full shadow-lg shadow-orange-600/20 h-10 w-10 transition-all active:scale-90",
            loading && "grayscale opacity-80"
          )}
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </Button>
      )}

      {/* Mes y Año (Solo para Mes específico) */}
      {tempPeriod === 'specific-month' && (
        <div className="flex items-center gap-1.5 w-full sm:w-auto animate-in fade-in slide-in-from-top-1 duration-200">
          <Select value={selectedMonth} onValueChange={handleMonthChange}>
            <SelectTrigger className={cn(
              "flex-1 sm:w-[130px] sm:flex-none font-bold h-10 rounded-xl border-gray-200 shadow-sm",
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
              "flex-1 sm:w-[100px] sm:flex-none font-bold h-10 rounded-xl border-gray-200 shadow-sm",
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
        </div>
      )}

      {/* Año (Solo para Año específico) */}
      {tempPeriod === 'specific-year' && (
        <Select value={selectedYear} onValueChange={handleYearChange}>
          <SelectTrigger className={cn(
            "flex-1 sm:w-[100px] sm:flex-none font-bold h-10 rounded-xl border-gray-200 shadow-sm",
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

      {/* Rango Personalizado */}
      {tempPeriod === 'custom' && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "flex-1 sm:w-auto justify-start text-left font-bold h-10 px-4 rounded-xl border-gray-200 shadow-sm transition-all",
                compact && "bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {tempRange.from && tempRange.to ? (
                <>
                  <span className="hidden sm:inline">{format(tempRange.from, 'dd/MM/yy')} - {format(tempRange.to, 'dd/MM/yy')}</span>
                  <span className="sm:hidden text-xs">{format(tempRange.from, 'dd/MM')} - {format(tempRange.to, 'dd/MM')}</span>
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
    </div>
  )
}
