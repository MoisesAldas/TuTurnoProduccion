'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
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
      case 'custom':
        // Keep current range
        return
      default:
        startDate = startOfMonth(new Date())
        endDate = endOfMonth(new Date())
    }

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
        <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3">
          {/* Period Toggle */}
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
              className="data-[state=on]:bg-orange-100 data-[state=on]:text-orange-700 dark:data-[state=on]:bg-orange-900/20 dark:data-[state=on]:text-orange-400"
            >
              Día
            </ToggleGroupItem>
            <ToggleGroupItem
              value="month"
              className="data-[state=on]:bg-orange-100 data-[state=on]:text-orange-700 dark:data-[state=on]:bg-orange-900/20 dark:data-[state=on]:text-orange-400"
            >
              Mes
            </ToggleGroupItem>
            <ToggleGroupItem
              value="year"
              className="data-[state=on]:bg-orange-100 data-[state=on]:text-orange-700 dark:data-[state=on]:bg-orange-900/20 dark:data-[state=on]:text-orange-400"
            >
              Año
            </ToggleGroupItem>
            <ToggleGroupItem
              value="custom"
              className="data-[state=on]:bg-orange-100 data-[state=on]:text-orange-700 dark:data-[state=on]:bg-orange-900/20 dark:data-[state=on]:text-orange-400"
            >
              Personalizado
            </ToggleGroupItem>
          </ToggleGroup>

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

          {/* Apply Button */}
          <Button
            onClick={handleApplyFilters}
            className=" bg-orange-600 hover:bg-orange-600 text-white"
          >
            Aplicar Filtros
          </Button>

          {/* Refresh Button - pegado a la derecha */}
          {onRefresh && (
            <Button
              onClick={onRefresh}
              disabled={loading}
              variant="outline"
              className="sm:ml-auto dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          )}

          {/* Current Range Display (on mobile, show below) */}
          <div className="text-xs text-gray-500 dark:text-gray-400 w-full sm:w-auto">
            {format(tempRange.from, "dd 'de' MMMM", { locale: es })} -{' '}
            {format(tempRange.to, "dd 'de' MMMM, yyyy", { locale: es })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
