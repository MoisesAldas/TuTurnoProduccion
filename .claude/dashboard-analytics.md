# Dashboard Analytics Component Guide

## Overview

The `DashboardAnalytics` component is a clean, minimalist B2B SaaS dashboard inspired by modern design systems (Linear, Stripe, Vercel). It displays key performance indicators, revenue analytics, and service metrics with an emphasis on clarity and professional aesthetics.

**Component Location:** `src/components/DashboardAnalytics.tsx`

## Design Philosophy

### Core Principles

1. **Minimalism** - Clean white backgrounds, subtle borders, generous whitespace
2. **Typography Hierarchy** - Clear distinction between labels, values, and metadata
3. **Color Restraint** - Orange brand color for primary data, muted grays for UI elements
4. **Subtle Interactions** - Hover shadows, smooth transitions, no jarring animations
5. **Professional Feel** - B2B SaaS aesthetic over consumer app design

### Inspiration References

| Reference | Element | How We Use It |
|-----------|---------|--------------|
| **Linear** | Smooth gradients, polished cards | Subtle shadows, clean borders |
| **Stripe** | Clear hierarchy, professional headers | Typography scale, spacing |
| **Apple** | Minimalism, attention to detail | Generous padding, clean icons |
| **Fresha** | B2B calendar layout | Multi-period charts, visual clarity |

## Component Structure

```
DashboardAnalytics
├── Top Section: KPI Cards (3 columns)
│   ├── KPI Card 1: Total Revenue
│   ├── KPI Card 2: Total Appointments
│   └── KPI Card 3: Completion Rate
├── Middle Section: Charts (2x2 grid)
│   ├── Revenue by Employee (Stacked Bar)
│   └── Appointments by Weekday (Bar)
└── Bottom Section: Analytics (2x1 grid)
    ├── Payment Methods (Donut + Legend)
    └── Top Services (Table + Progress Bars)
```

## Component Props

```typescript
interface DashboardAnalyticsProps {
  businessId: string
  data?: {
    totalRevenue: number                    // Total USD revenue
    totalAppointments: number               // Total appointment count
    completionRate: number                  // Percentage (0-100)
    revenueTrend: number                    // Percentage change (+/-)
    appointmentsTrend: number               // Percentage change (+/-)
    completionTrend: number                 // Percentage change (+/-)
    revenueByEmployee: EmployeeRevenue[]    // 3 months of data
    appointmentsByWeekday: WeeklyAppointments[] // 7 days
    paymentMethods: PaymentMethod[]         // Cash vs Transfer
    topServices: ServiceData[]              // Top 5 services with %
  }
}
```

### Data Structure Examples

**EmployeeRevenue:**
```typescript
{
  name: 'Enero',
  revenue: 1200,
  appointments: 15
}
```

**WeeklyAppointments:**
```typescript
{
  day: 'Lun',
  count: 24
}
```

**PaymentMethod:**
```typescript
{
  name: 'Efectivo',
  value: 1800
}
```

**ServiceData:**
```typescript
{
  name: 'Corte Cabello',
  count: 32,
  percentage: 25
}
```

## Visual Design

### Color Palette

**Brand Colors (Orange Theme):**
```
Primary:     #ea580c  (orange-600)
Secondary:   #f59e0b  (amber-600)
Tertiary:    #fcd34d  (yellow-300)
Accent:      #a78bfa  (purple-400)  ← for secondary metrics
```

**Neutral Colors:**
```
Text Primary:   #111827 (gray-900)
Text Secondary: #6b7280 (gray-500)
Text Tertiary:  #9ca3af (gray-400)
Borders:        #e5e7eb (gray-200)
Backgrounds:    #ffffff (white)
Hover:          #f9fafb (gray-50)
```

**Status Badges:**
```
Positive: #059669 (emerald-600)
Negative: #dc2626 (red-600)
```

### Typography

```
KPI Label:      text-xs uppercase tracking-wide, text-gray-500
KPI Value:      text-3xl font-bold text-gray-900
Card Title:     text-lg font-semibold text-gray-900
Card Desc:      text-sm text-gray-600
Chart Label:    text-sm font-medium text-gray-900
Progress Label: text-xs text-gray-500
```

### Spacing & Borders

```
Container:      p-6 (24px padding)
Card Padding:   p-6 (24px)
Card Header:    pb-4 border-b border-gray-200
Element Gap:    gap-6 between major sections
Grid Gap:       gap-6 between cards
Icon Container: w-12 h-12 rounded-lg bg-gray-100
```

### Shadows & Borders

```
Card Border:    border border-gray-200
Card Hover:     hover:shadow-lg transition-shadow
No Top Shadows: cards use only bottom shadow on hover
Smooth Trans:   transition-shadow duration-300
```

## KPI Card Component

The KPI Card is the smallest visual unit, displaying a single metric with trend indicator.

### Structure
```
┌─────────────────────────┐
│ Label (uppercase gray)  │
│ Big Number              │
│ Trend Badge (+ arrow)   │     Icon (gray bg)
│                         │
└─────────────────────────┘
```

### Features

1. **Trend Indicator** - Green up/red down arrow with percentage
2. **Icon Box** - Small gray rounded container on right
3. **White Card** - Clean border, hover shadow
4. **Responsive** - Stacks to 1 column on mobile, 3 columns on desktop

### Usage

```typescript
<KPICard
  label="Ingresos Totales"
  value="$2,847.50"
  icon={<Eye className="w-6 h-6" />}
  trend={12.5}
  isPositive={true}
/>
```

## Chart Components

### Revenue by Employee (Stacked Bar)

**Purpose:** Show monthly revenue trends across employees/periods

**Features:**
- 3 months of data
- Orange gradient bars
- Clean gridlines (light gray)
- Tooltip with currency formatting
- No legend (single metric)

**Customization:**
```typescript
<Bar
  dataKey="revenue"
  fill="#ea580c"
  radius={[8, 8, 0, 0]}  // Top rounded corners
  name="Ingresos"
/>
```

### Appointments by Weekday (Bar)

**Purpose:** Show weekly appointment distribution

**Features:**
- 7 days of week
- Purple bars (secondary accent)
- Time range selector (Week/Month/Year dropdown)
- Clean tooltips
- No legend needed

**Time Range Selector:**
```typescript
<select
  value={timeRange}
  onChange={(e) => setTimeRange(e.target.value as any)}
  className="text-xs px-2 py-1 border border-gray-300..."
>
  <option value="week">Semana</option>
  <option value="month">Mes</option>
  <option value="year">Año</option>
</select>
```

### Payment Methods (Donut)

**Purpose:** Show payment method distribution (cash vs transfer)

**Features:**
- Donut chart (not full pie - cleaner look)
- Inner radius: 70, Outer radius: 110
- 2-3 segments only
- Legend on the right
- Color-coded legend items with amounts

**Chart Details:**
```typescript
<Pie
  data={data.paymentMethods}
  cx="50%"
  cy="50%"
  innerRadius={70}        // Creates donut effect
  outerRadius={110}
  paddingAngle={2}        // Small space between segments
  dataKey="value"
>
```

**Legend Template:**
```
┌─ Legend ─┐
│ ○ Efectivo       │
│   $1,800.00      │
│                  │
│ ○ Transferencia  │
│   $1,047.50      │
└──────────┘
```

### Top Services (Progress Bars)

**Purpose:** Show top 5 services with visual percentages

**Features:**
- No chart - simple table with progress bars
- Colored bars matching service rank
- Percentage on right
- Count below bar
- 5 services maximum

**Visual Structure:**
```
Corte Cabello            25%
████████████████████░░░░░░
32 citas

Tintura                  22%
███████████████████░░░░░░░░
28 citas
```

**Color Progression:**
```
Service 1: #ea580c (orange-600)
Service 2: #f97316 (orange-500)
Service 3: #fb923c (orange-400)
Service 4: #fbbf24 (amber-300)
Service 5: #fcd34d (yellow-300)
```

## Responsive Grid System

### Desktop (lg: 1024px+)
```
KPI Cards:   1 row × 3 columns
Charts:      2 rows × 2 columns each
Analytics:   1 row × 2 columns
```

### Tablet (md: 768px - 1023px)
```
KPI Cards:   1 row × 3 columns
Charts:      2 rows × 1 column (stacked)
Analytics:   2 rows × 1 column (stacked)
```

### Mobile (< 768px)
```
KPI Cards:   3 rows × 1 column (stacked)
Charts:      2 rows × 1 column (full width)
Analytics:   2 rows × 1 column (full width)
```

## Integration with Business Dashboard

### Step 1: Import Component

```typescript
import DashboardAnalytics from '@/components/DashboardAnalytics'
```

### Step 2: Fetch Data

```typescript
// Fetch analytics data from Supabase
const { data, error } = await supabase
  .from('appointments')
  .select(`
    total_price,
    appointment_date,
    status,
    employees (first_name, last_name),
    appointment_services (
      services (name),
      price
    )
  `)
  .eq('business_id', businessId)
```

### Step 3: Transform to Component Format

```typescript
const analyticsData = {
  totalRevenue: payments.reduce((sum, p) => sum + p.amount, 0),
  totalAppointments: appointments.length,
  completionRate: (completed / appointments.length) * 100,
  revenueTrend: 12.5,
  appointmentsTrend: 8.3,
  completionTrend: 2.1,
  revenueByEmployee: groupByMonth(payments),
  appointmentsByWeekday: groupByWeekday(appointments),
  paymentMethods: groupByMethod(payments),
  topServices: groupByService(services).slice(0, 5),
}
```

### Step 4: Render

```typescript
<DashboardAnalytics businessId={business.id} data={analyticsData} />
```

## Accessibility Features

### ARIA Labels

All interactive elements include ARIA labels:
```typescript
<select aria-label="Seleccionar rango de tiempo">
  <option>Semana</option>
</select>
```

### Color Contrast

- All text meets WCAG AA standards (4.5:1)
- Status indicators include icons + color (not color alone)
- Trend badges use arrows + color

### Keyboard Navigation

- All selects keyboard accessible
- Cards respond to hover with visible change
- Focus states visible on interactive elements

## Performance Optimizations

### Client-Side Rendering

```typescript
const [mounted, setMounted] = useState(false)

useEffect(() => {
  setMounted(true)
}, [])

if (!mounted) return null  // Prevent hydration mismatch
```

### Chart Optimization

- Recharts auto-optimizes based on responsive container
- No re-renders on prop changes (use useMemo for data)
- Tooltips lazy-load on interaction

### Memoization Example

```typescript
const analyticsData = useMemo(() => ({
  totalRevenue: calculateRevenue(payments),
  // ... other calculations
}), [payments])
```

## Theme Customization

### Changing Primary Color

If replacing orange with another color:

1. **KPI Icons:** Change `text-gray-600` to your color
2. **Bar Charts:** Change `fill="#ea580c"` to your hex
3. **Service Bars:** Update `SERVICE_COLORS` array
4. **Payment Colors:** Update `PAYMENT_COLORS` array

```typescript
const PAYMENT_COLORS = ['#your-primary', '#your-secondary']
const SERVICE_COLORS = [
  '#your-primary',
  '#your-shade-1',
  '#your-shade-2',
  '#your-shade-3',
  '#your-shade-4',
]
```

### Dark Mode Support

To add dark mode:

```typescript
// Add class conditionally
<Card className={`
  border border-gray-200 dark:border-gray-700
  bg-white dark:bg-gray-900
  hover:shadow-lg dark:hover:shadow-2xl
`}>
```

## Common Customizations

### 1. Change Chart Heights

```typescript
<ResponsiveContainer width="100%" height={280}>  {/* ← Change this */}
  <BarChart data={data}>
```

### 2. Add Different Time Periods

```typescript
const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year' | 'quarter'>('month')

// Filter data based on timeRange
const filteredData = useMemo(() => {
  return data.filter(item => {
    if (timeRange === 'week') return isInCurrentWeek(item.date)
    if (timeRange === 'month') return isInCurrentMonth(item.date)
    // ... etc
  })
}, [timeRange, data])
```

### 3. Add Export Functionality

```typescript
const exportToCSV = () => {
  const csv = convertDataToCSV(data)
  downloadCSV(csv, `analytics-${new Date().toISOString()}.csv`)
}

// In card header
<Button onClick={exportToCSV} size="sm" variant="outline">
  Descargar
</Button>
```

### 4. Real-Time Data Updates

```typescript
useEffect(() => {
  const interval = setInterval(() => {
    fetchAnalyticsData() // Re-fetch every minute
  }, 60000)

  return () => clearInterval(interval)
}, [])
```

## Troubleshooting

### Hydration Mismatch

**Problem:** Component renders differently on server vs client

**Solution:** Use `mounted` state check (already implemented)

```typescript
const [mounted, setMounted] = useState(false)
useEffect(() => setMounted(true), [])
if (!mounted) return null
```

### Charts Not Rendering

**Problem:** Recharts ResponsiveContainer needs parent with height

**Solution:** Always use ResponsiveContainer with explicit height

```typescript
<ResponsiveContainer width="100%" height={280}>
  <BarChart data={data}>
```

### Tooltip Formatting

**Problem:** Currency values not formatted correctly

**Solution:** Use formatter prop

```typescript
<Tooltip
  formatter={(value) => `$${value.toFixed(2)}`}
/>
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS 14+, Android 11+)

## Dependencies

- `recharts` - Charting library
- `shadcn/ui` - Card, Badge components
- `lucide-react` - Icons
- Next.js 14+ - Framework

## File Checklist

- [x] Component created: `src/components/DashboardAnalytics.tsx`
- [x] Documentation written: `.claude/dashboard-analytics.md`
- [ ] Integration in business dashboard page
- [ ] Data fetching logic
- [ ] Real-time updates with Supabase Realtime
- [ ] Export functionality
- [ ] Dark mode support

## Future Enhancements

1. **Time Range Filters** - Week/Month/Year/Custom date range
2. **Comparison Charts** - YoY, MoM metrics
3. **Export Functionality** - CSV, PDF reports
4. **Real-Time Updates** - Supabase Realtime subscription
5. **Custom Metrics** - Business-specific KPIs
6. **Drill-Down Details** - Click charts for detailed view
7. **Email Reports** - Scheduled analytics emails
8. **Dark Mode** - Full dark theme support

## Related Documentation

- [Design System](./design-system.md) - Color palette, typography
- [B2B Calendar System](./b2b-calendar-system.md) - Appointment data
- [Database Schema](../Database/) - Data structure reference

---

**Last Updated:** 2025-12-01
**Component Status:** Production Ready
