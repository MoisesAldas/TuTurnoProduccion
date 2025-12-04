# Dashboard Analytics Integration Guide

## Quick Start

### 1. Basic Integration (5 minutes)

```typescript
'use client'

import DashboardAnalytics from '@/components/DashboardAnalytics'
import { useAnalyticsData } from '@/hooks/useAnalyticsData'

export default function DashboardPage() {
  const { data, loading, error } = useAnalyticsData('your-business-id')

  if (loading) return <div>Cargando analytics...</div>
  if (error) return <div>Error: {error.message}</div>

  return <DashboardAnalytics businessId="your-business-id" data={data} />
}
```

### 2. With Business Context

```typescript
'use client'

import DashboardAnalytics from '@/components/DashboardAnalytics'
import { useAnalyticsData } from '@/hooks/useAnalyticsData'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabaseClient'
import { useEffect, useState } from 'react'

export default function BusinessDashboard() {
  const { authState } = useAuth()
  const [businessId, setBusinessId] = useState<string | null>(null)
  const supabase = createClient()
  const { data, loading, error } = useAnalyticsData(businessId || '')

  useEffect(() => {
    if (!authState.user) return

    const fetchBusiness = async () => {
      const { data: business } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', authState.user.id)
        .single()

      if (business) {
        setBusinessId(business.id)
      }
    }

    fetchBusiness()
  }, [authState.user])

  if (!businessId || loading) return <div>Cargando...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div className="bg-gray-50 min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard de Análisis</h1>
        <DashboardAnalytics businessId={businessId} data={data} />
      </div>
    </div>
  )
}
```

## Data Flow Architecture

```
┌─────────────────────────────────────┐
│     Business Dashboard Page         │
│  (src/app/dashboard/business)       │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│    useAnalyticsData Hook            │
│  (src/hooks/useAnalyticsData.ts)    │
│  - Fetches from Supabase            │
│  - Calculates trends                │
│  - Aggregates data                  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   DashboardAnalytics Component      │
│  (src/components/DashboardAnalytics.tsx)
│  - Renders KPI cards                │
│  - Displays charts                  │
│  - Shows metrics                    │
└─────────────────────────────────────┘
```

## Hook Detailed Reference

### useAnalyticsData Hook

**Location:** `src/hooks/useAnalyticsData.ts`

**Signature:**
```typescript
function useAnalyticsData(businessId: string): UseAnalyticsDataResult

interface UseAnalyticsDataResult {
  data: AnalyticsData | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}
```

**Data Structure:**
```typescript
interface AnalyticsData {
  totalRevenue: number              // USD
  totalAppointments: number         // Count
  completionRate: number            // 0-100%
  revenueTrend: number              // %, can be negative
  appointmentsTrend: number         // %, can be negative
  completionTrend: number           // %, can be negative
  revenueByEmployee: EmployeeRevenue[]
  appointmentsByWeekday: WeeklyAppointments[]
  paymentMethods: PaymentMethod[]
  topServices: ServiceData[]
}
```

### What It Fetches

**1. Current Month Revenue & Trends**
```sql
SELECT amount, payment_date
FROM payments
WHERE invoices.appointments.business_id = $1
  AND payment_date >= CURRENT_MONTH_START
  AND payment_date <= TODAY
```

**Calculates:**
- Total revenue (sum of all amounts)
- Trend % compared to previous month

**2. Current Month Appointments & Trends**
```sql
SELECT id, status, appointment_date
FROM appointments
WHERE business_id = $1
  AND appointment_date >= CURRENT_MONTH_START
  AND appointment_date <= TODAY
```

**Calculates:**
- Total count
- Completion count (status = 'completed')
- Completion rate (%)
- Trend % compared to previous month

**3. Revenue by Month (Last 3 Months)**
```sql
SELECT amount, payment_date, invoices.appointments.employee_id
FROM payments
WHERE invoices.appointments.business_id = $1
  AND payment_date >= 3_MONTHS_AGO
```

**Returns:** 3 data points (Enero, Febrero, Marzo)

**4. Appointments by Weekday (Current Week)**
```sql
SELECT appointment_date
FROM appointments
WHERE business_id = $1
  AND appointment_date >= WEEK_START
  AND appointment_date <= TODAY
```

**Returns:** 7 data points (Dom-Sáb)

**5. Payment Methods Breakdown**
```sql
SELECT payment_method, amount
FROM payments
WHERE invoices.appointments.business_id = $1
  AND payment_date >= CURRENT_MONTH_START
```

**Groups by:** payment_method ('cash' or 'transfer')

**6. Top 5 Services**
```sql
SELECT services.name, COUNT(*) as count
FROM appointment_services
JOIN appointments ON appointment_services.appointment_id = appointments.id
WHERE appointments.business_id = $1
  AND appointments.status IN ('confirmed', 'completed', 'in_progress')
  AND appointments.appointment_date >= 3_MONTHS_AGO
GROUP BY services.id
ORDER BY count DESC
LIMIT 5
```

## Component Props Reference

### DashboardAnalytics Props

```typescript
interface DashboardAnalyticsProps {
  businessId: string    // Required: used for data loading context
  data?: AnalyticsData  // Optional: if not provided, shows defaults
}
```

### Using Default Data (Development/Testing)

```typescript
// No data prop = uses internal defaults
<DashboardAnalytics businessId={businessId} />

// With custom data
<DashboardAnalytics businessId={businessId} data={customData} />
```

**Default Values (when no data provided):**
```typescript
{
  totalRevenue: 2847.5,
  totalAppointments: 127,
  completionRate: 94.5,
  revenueTrend: 12.5,
  appointmentsTrend: 8.3,
  completionTrend: 2.1,
  revenueByEmployee: [
    { name: 'Enero', revenue: 1200, appointments: 15 },
    { name: 'Febrero', revenue: 1450, appointments: 18 },
    { name: 'Marzo', revenue: 1680, appointments: 22 },
  ],
  appointmentsByWeekday: [
    { day: 'Dom', count: 18 },
    // ... Sun-Sat
  ],
  paymentMethods: [
    { name: 'Efectivo', value: 1800 },
    { name: 'Transferencia', value: 1047.5 },
  ],
  topServices: [
    { name: 'Corte Cabello', count: 32, percentage: 25 },
    // ... top 5
  ],
}
```

## Real-Time Updates

### Option 1: Poll Every Minute

```typescript
export function useAnalyticsData(businessId: string) {
  const [data, setData] = useState(null)
  const { refetch } = useAnalyticsData(businessId)

  useEffect(() => {
    // Initial load
    refetch()

    // Poll every 60 seconds
    const interval = setInterval(() => {
      refetch()
    }, 60000)

    return () => clearInterval(interval)
  }, [refetch])

  return { data }
}
```

### Option 2: Supabase Realtime Subscription

```typescript
useEffect(() => {
  if (!businessId) return

  // Subscribe to payments changes
  const paymentChannel = supabase
    .channel(`payments:business_id=eq.${businessId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'payments',
        filter: `invoices.appointments.business_id=eq.${businessId}`,
      },
      () => {
        // Refetch analytics when payment changes
        fetchAnalyticsData()
      }
    )
    .subscribe()

  // Subscribe to appointments changes
  const appointmentChannel = supabase
    .channel(`appointments:business_id=eq.${businessId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'appointments',
        filter: `business_id=eq.${businessId}`,
      },
      () => {
        // Refetch analytics when appointment changes
        fetchAnalyticsData()
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(paymentChannel)
    supabase.removeChannel(appointmentChannel)
  }
}, [businessId])
```

## Customization Examples

### 1. Add Time Range Selector

```typescript
const [dateRange, setDateRange] = useState({
  start: new Date(new Date().setMonth(new Date().getMonth() - 1)),
  end: new Date(),
})

const analyticsData = useAnalyticsData(businessId, {
  startDate: dateRange.start,
  endDate: dateRange.end,
})

// In component
<div className="flex gap-4 mb-6">
  <input
    type="date"
    value={dateRange.start.toISOString().split('T')[0]}
    onChange={(e) =>
      setDateRange({
        ...dateRange,
        start: new Date(e.target.value),
      })
    }
  />
  <input
    type="date"
    value={dateRange.end.toISOString().split('T')[0]}
    onChange={(e) =>
      setDateRange({
        ...dateRange,
        end: new Date(e.target.value),
      })
    }
  />
</div>

<DashboardAnalytics businessId={businessId} data={analyticsData.data} />
```

### 2. Add Comparison Mode (vs Previous Period)

```typescript
interface AnalyticsWithComparison extends AnalyticsData {
  comparisionPeriod: {
    totalRevenue: number
    totalAppointments: number
    completionRate: number
  }
}

// Modify hook to return comparison data
// Then display side-by-side in component
<div className="grid grid-cols-2 gap-4">
  <div>
    <h3 className="text-sm font-medium text-gray-600">Este Período</h3>
    <KPICard {...currentData} />
  </div>
  <div>
    <h3 className="text-sm font-medium text-gray-600">Período Anterior</h3>
    <KPICard {...comparisonData} />
  </div>
</div>
```

### 3. Add Export to PDF

```typescript
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

const exportToPDF = async () => {
  const element = document.getElementById('dashboard-analytics')
  const canvas = await html2canvas(element)
  const image = canvas.toDataURL('image/png')

  const pdf = new jsPDF('l', 'mm', 'a4')
  pdf.addImage(image, 'PNG', 10, 10)
  pdf.save(`analytics-${new Date().toISOString().split('T')[0]}.pdf`)
}

// Add button to UI
<Button onClick={exportToPDF} variant="outline">
  Descargar PDF
</Button>
```

### 4. Add Employee Performance Drill-Down

```typescript
const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null)

// Fetch detailed employee metrics
const employeeDetails = useEmployeeAnalytics(businessId, selectedEmployee)

<div id="dashboard-analytics">
  <DashboardAnalytics businessId={businessId} data={data} />

  {selectedEmployee && (
    <EmployeeDetailPanel
      employeeId={selectedEmployee}
      data={employeeDetails}
    />
  )}
</div>
```

## Error Handling

### Display Error States

```typescript
function DashboardPage() {
  const { data, loading, error, refetch } = useAnalyticsData(businessId)

  if (error) {
    return (
      <div className="p-6 border border-red-200 bg-red-50 rounded-lg">
        <h3 className="font-semibold text-red-900 mb-2">
          Error al cargar analytics
        </h3>
        <p className="text-sm text-red-700 mb-4">{error.message}</p>
        <Button onClick={refetch} size="sm" variant="outline">
          Reintentar
        </Button>
      </div>
    )
  }

  return <DashboardAnalytics businessId={businessId} data={data} />
}
```

### Retry with Exponential Backoff

```typescript
const retryFetch = async (
  fn: () => Promise<any>,
  maxRetries = 3,
  delay = 1000
) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, i)))
    }
  }
}

// Use in hook
const result = await retryFetch(() => supabase.from('payments').select(...))
```

## Performance Tips

### 1. Memoize Transformed Data

```typescript
const analyticsData = useMemo(() => {
  if (!rawData) return null

  return {
    totalRevenue: calculateRevenue(rawData.payments),
    totalAppointments: rawData.appointments.length,
    // ... other calculations
  }
}, [rawData])
```

### 2. Lazy Load Charts

```typescript
const [visibleCharts, setVisibleCharts] = useState({
  revenue: true,
  appointments: false,
  payment: false,
  services: false,
})

// Render charts conditionally
{visibleCharts.revenue && <RevenueChart data={data} />}
```

### 3. Database Query Optimization

In `useAnalyticsData.ts`:

```typescript
// Use JOIN instead of nested selects
const { data } = await supabase
  .from('payments')
  .select(`
    amount,
    payment_method,
    invoices!inner (
      appointments!inner (
        id,
        business_id,
        status
      )
    )
  `)
  .eq('invoices.appointments.business_id', businessId)
```

## Testing

### Mock Data for Testing

```typescript
const mockAnalyticsData = {
  totalRevenue: 5000,
  totalAppointments: 50,
  completionRate: 95,
  revenueTrend: 10,
  appointmentsTrend: 5,
  completionTrend: 2,
  revenueByEmployee: [
    { name: 'Enero', revenue: 1500, appointments: 15 },
    { name: 'Febrero', revenue: 1700, appointments: 18 },
    { name: 'Marzo', revenue: 1800, appointments: 20 },
  ],
  appointmentsByWeekday: Array(7).fill(null).map((_, i) => ({
    day: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][i],
    count: Math.floor(Math.random() * 30),
  })),
  paymentMethods: [
    { name: 'Efectivo', value: 3000 },
    { name: 'Transferencia', value: 2000 },
  ],
  topServices: [
    { name: 'Service 1', count: 20, percentage: 40 },
    { name: 'Service 2', count: 15, percentage: 30 },
    { name: 'Service 3', count: 10, percentage: 20 },
    { name: 'Service 4', count: 5, percentage: 10 },
  ],
}

// In component
<DashboardAnalytics businessId="test" data={mockAnalyticsData} />
```

### Unit Test Example

```typescript
import { render, screen } from '@testing-library/react'
import DashboardAnalytics from '@/components/DashboardAnalytics'

describe('DashboardAnalytics', () => {
  it('should render KPI cards', () => {
    render(
      <DashboardAnalytics
        businessId="test-id"
        data={mockAnalyticsData}
      />
    )

    expect(screen.getByText('Ingresos Totales')).toBeInTheDocument()
    expect(screen.getByText('$5,000.00')).toBeInTheDocument()
  })

  it('should display revenue trend', () => {
    render(
      <DashboardAnalytics
        businessId="test-id"
        data={mockAnalyticsData}
      />
    )

    expect(screen.getByText('+12.5%')).toBeInTheDocument()
  })
})
```

## Troubleshooting

### Issue: Hook returns null data indefinitely

**Cause:** businessId not set or empty

**Solution:**
```typescript
// Check businessId before calling hook
if (!businessId) {
  return <div>Selecciona un negocio primero</div>
}

const { data, loading } = useAnalyticsData(businessId)
```

### Issue: Charts not rendering

**Cause:** Recharts needs responsive container with height

**Solution:** Already handled in component, but verify:
```typescript
<ResponsiveContainer width="100%" height={280}>
  <BarChart data={data}>
```

### Issue: Stale data after new appointment

**Cause:** Hook doesn't refresh automatically

**Solution:** Use refetch or set up real-time subscription
```typescript
const { refetch } = useAnalyticsData(businessId)

// After appointment creation
const { error } = await createAppointment(data)
if (!error) {
  refetch() // Refresh analytics
}
```

## Next Steps

1. Integrate with business dashboard page
2. Add time range selector
3. Set up real-time updates
4. Add PDF export
5. Create employee performance drill-down
6. Add comparison mode (vs previous period)

---

**Last Updated:** 2025-12-01
**Status:** Ready for Integration
