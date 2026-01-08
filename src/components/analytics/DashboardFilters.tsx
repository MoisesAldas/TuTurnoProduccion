'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CalendarIcon, Filter, RefreshCw } from 'lucide-react'
import { format, startOfToday, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'
import { es } from 'date-fns/locale'
import type { DashboardFilters, PeriodType } from '@/types/analytics'

interface DashboardFiltersProps {
  filters: DashboardFilters
  onFiltersChange: (filters: DashboardFilters) => void
  onRefresh?: () => void
  loading?: boolean
}

export function DashboardFilters({ filters, onFiltersChange, onRefresh, loading = false }: DashboardFiltersProps) {
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

  // Lista de años (últimos 5 años + año actual + próximo año)
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 7 }, (_, i) => {
    const year = currentYear - 5 + i
    return { value: String(year), label: String(year) }
  })

  const handlePeriodChange = (value: string) => {
    if (!value) return

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
        // Usar mes y año seleccionados
        const monthNum = parseInt(selectedMonth)
        const yearNum = parseInt(selectedYear)
        startDate = startOfMonth(new Date(yearNum, monthNum, 1))
        endDate = endOfMonth(new Date(yearNum, monthNum, 1))
        setTempRange({ from: startDate, to: endDate })
        return
      case 'custom':
        // Keep current range
        return
      default:
        startDate = startOfMonth(new Date())
        endDate = endOfMonth(new Date())
    }

    setTempRange({ from: startDate, to: endDate })
  }

  const handleMonthChange = (value: string) => {
    setSelectedMonth(value)
    // Auto-actualizar el rango cuando cambia el mes
    const monthNum = parseInt(value)
    const yearNum = parseInt(selectedYear)
    const startDate = startOfMonth(new Date(yearNum, monthNum, 1))
    const endDate = endOfMonth(new Date(yearNum, monthNum, 1))
    setTempRange({ from: startDate, to: endDate })
  }

  const handleYearChange = (value: string) => {
    setSelectedYear(value)
    // Auto-actualizar el rango cuando cambia el año
    const monthNum = parseInt(selectedMonth)
    const yearNum = parseInt(value)
    const startDate = startOfMonth(new Date(yearNum, monthNum, 1))
    const endDate = endOfMonth(new Date(yearNum, monthNum, 1))
    setTempRange({ from: startDate, to: endDate })
  }

  const handleApplyFilters = () => {
    onFiltersChange({
      period: tempPeriod,
      startDate: tempRange.from,
      endDate: tempRange.to,
    })
  }

  const handleDateRangeSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range?.from && range?.to) {
      setTempRange({ from: range.from, to: range.to })
    }
  }

  return (
    <Card className="dark:border-gray-700">
      <CardContent className="pt-6">
        <div className="flex flex-wrap items-center gap-3">
          {/* Period Label + Toggle */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Período:</span>
          </div>

          <ToggleGroup
            type="single"
            value={tempPeriod}
            onValueChange={handlePeriodChange}
            className="justify-start"
          >
            <ToggleGroupItem
              value="day"
              className="data-[state=on]:bg-orange-100 data-[state=on]:text-orange-700 dark:data-[state=on]:bg-orange-900/20 dark:data-[state=on]:text-orange-400 text-xs sm:text-sm px-2 sm:px-3"
            >
              Día
            </ToggleGroupItem>
            <ToggleGroupItem
              value="month"
              className="data-[state=on]:bg-orange-100 data-[state=on]:text-orange-700 dark:data-[state=on]:bg-orange-900/20 dark:data-[state=on]:text-orange-400 text-xs sm:text-sm px-2 sm:px-3"
            >
              Mes
            </ToggleGroupItem>
            <ToggleGroupItem
              value="year"
              className="data-[state=on]:bg-orange-100 data-[state=on]:text-orange-700 dark:data-[state=on]:bg-orange-900/20 dark:data-[state=on]:text-orange-400 text-xs sm:text-sm px-2 sm:px-3"
            >
              Año
            </ToggleGroupItem>
            <ToggleGroupItem
              value="specific-month"
              className="data-[state=on]:bg-orange-100 data-[state=on]:text-orange-700 dark:data-[state=on]:bg-orange-900/20 dark:data-[state=on]:text-orange-400 text-xs sm:text-sm px-2 sm:px-3"
            >
              Mes Específico
            </ToggleGroupItem>
            <ToggleGroupItem
              value="custom"
              className="data-[state=on]:bg-orange-100 data-[state=on]:text-orange-700 dark:data-[state=on]:bg-orange-900/20 dark:data-[state=on]:text-orange-400 text-xs sm:text-sm px-2 sm:px-3"
            >
              Personalizado
            </ToggleGroupItem>
          </ToggleGroup>

          {/* Month and Year Selectors for Specific Month */}
          {tempPeriod === 'specific-month' && (
            <>
              <Select value={selectedMonth} onValueChange={handleMonthChange}>
                <SelectTrigger className="w-[140px] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                  <SelectValue placeholder="Seleccionar mes" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  {months.map((month) => (
                    <SelectItem
                      key={month.value}
                      value={month.value}
                      className="dark:text-gray-200 dark:focus:bg-gray-700"
                    >
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedYear} onValueChange={handleYearChange}>
                <SelectTrigger className="w-[100px] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                  <SelectValue placeholder="Año" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  {years.map((year) => (
                    <SelectItem
                      key={year.value}
                      value={year.value}
                      className="dark:text-gray-200 dark:focus:bg-gray-700"
                    >
                      {year.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}

          {/* Custom Date Range Picker */}
          {tempPeriod === 'custom' && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="justify-start text-left font-normal dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {tempRange.from && tempRange.to ? (
                    <>
                      {format(tempRange.from, 'dd/MM/yyyy', { locale: es })} -{' '}
                      {format(tempRange.to, 'dd/MM/yyyy', { locale: es })}
                    </>
                  ) : (
                    <span>Seleccionar rango</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 dark:bg-gray-800 dark:border-gray-700" align="start">
                <Calendar
                  mode="range"
                  selected={{ from: tempRange.from, to: tempRange.to }}
                  onSelect={handleDateRangeSelect}
                  locale={es}
                  numberOfMonths={2}
                  className="dark:bg-gray-800"
                />
              </PopoverContent>
            </Popover>
          )}

          {/* Divider vertical */}
          <div className="hidden lg:block h-8 w-px bg-gray-300 dark:bg-gray-600" />

          {/* Current Range Display */}
          <div className="text-xs text-gray-500 dark:text-gray-400 hidden lg:block">
            {format(tempRange.from, "dd 'de' MMM", { locale: es })} - {format(tempRange.to, "dd 'de' MMM, yyyy", { locale: es })}
          </div>

          {/* Spacer para empujar botones a la derecha */}
          <div className="flex-1 hidden lg:block" />

          {/* Action Buttons */}
          <Button
            onClick={handleApplyFilters}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            Aplicar Filtros
          </Button>

          {onRefresh && (
            <Button
              onClick={onRefresh}
              disabled={loading}
              variant="outline"
              className="dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>

        {/* Mobile Range Display - Solo visible en móvil */}
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-3 lg:hidden pt-3 border-t border-gray-200 dark:border-gray-700">
          <span className="font-medium">Rango:</span>{' '}
          {format(tempRange.from, "dd 'de' MMMM", { locale: es })} - {format(tempRange.to, "dd 'de' MMMM, yyyy", { locale: es })}
        </div>
      </CardContent>
    </Card>
  )
}
