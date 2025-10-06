# 🎨 TuTurno Design System

## Design Philosophy: B2B SaaS Premium

**Categoría:** B2B SaaS (Business-to-Business Software as a Service)

TuTurno es una **aplicación premium de Silicon Valley** para gestión de citas empresariales.

### Core Philosophy

**"Professional, yet delightful. Serious, yet approachable. Modern, yet timeless."**

### Design Inspirations

| Brand | What We Take |
|-------|--------------|
| **Apple** | Clean aesthetics, minimalist interfaces, attention to detail |
| **Linear** | Smooth gradients, subtle animations, polished interactions |
| **Stripe** | Professional headers, clear hierarchy, business-focused |
| **Vercel** | Micro-animations, smooth transitions, modern typography |
| **Fresha** | B2B calendar layout, multi-employee view, appointment blocks |
| **Calendly** | Time slot selection, scheduling flow, confirmation screens |

---

## Color Palette (Dual Theme System)

### 👤 CLIENT Theme (Green)

**Primary Color:** `#059669` (emerald-600)

```css
/* Gradient */
background: linear-gradient(to right, #059669, #0d9488, #0891b2);
/* Tailwind */
className="from-emerald-600 via-teal-600 to-cyan-600"
```

**Use Cases:**
- Client dashboard sidebar
- Client action buttons
- Client email templates
- Client booking confirmations

### 🏢 BUSINESS Theme (Orange)

**Primary Color:** `#ea580c` (orange-600)

```css
/* Gradient */
background: linear-gradient(to right, #ea580c, #f59e0b, #eab308);
/* Tailwind */
className="from-orange-600 via-amber-600 to-yellow-600"
```

**Use Cases:**
- Business dashboard sidebar
- Business action buttons
- Business email templates
- Appointment management UI

### 🎨 Contextual Colors (Universal)

```tsx
const colors = {
  success: '#22c55e',   // green-500
  warning: '#f59e0b',   // amber-500
  error: '#f43f5e',     // rose-500
  info: '#3b82f6',      // blue-500
}

// Appointment Status Colors
const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  confirmed: 'bg-green-100 text-green-800 border-green-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  completed: 'bg-gray-100 text-gray-800 border-gray-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  no_show: 'bg-orange-100 text-orange-800 border-orange-200'
}
```

### Logo Color (Universal)

**Color:** `#000000` (black - always)

```tsx
<span className="text-xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
  TuTurno
</span>
```

---

## Standard Components

### Primary Buttons

```tsx
// CLIENT Button (Green Gradient)
<Button className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600
  hover:from-emerald-700 hover:via-teal-700 hover:to-cyan-700
  text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
  Reservar Cita
</Button>

// BUSINESS Button (Orange Gradient)
<Button className="bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600
  hover:from-orange-700 hover:via-amber-700 hover:to-yellow-700
  text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
  Crear Cita
</Button>
```

### Cards Premium

```tsx
// CLIENT Card
<Card className="overflow-hidden border-gray-200 hover:shadow-lg transition-all duration-200">
  <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b">
    <CardTitle className="flex items-center text-xl">
      <Calendar className="w-6 h-6 mr-3 text-emerald-600" />
      Mis Próximas Citas
    </CardTitle>
  </CardHeader>
  <CardContent className="p-6">
    {/* Content */}
  </CardContent>
</Card>

// BUSINESS Card
<Card className="overflow-hidden border-gray-200 hover:shadow-lg transition-all duration-200">
  <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b">
    <CardTitle className="flex items-center text-xl">
      <Users className="w-6 h-6 mr-3 text-orange-600" />
      Equipo de Empleados
    </CardTitle>
  </CardHeader>
</Card>
```

### Badges & Status Indicators

```tsx
// Active Badge
<Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
  Activo
</Badge>

// Walk-in Indicator
<span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
  👤 Walk-in
</span>

// Status Badge
<Badge className={statusColors[appointment.status]}>
  {statusLabels[appointment.status]}
</Badge>
```

### Glassmorphism Effects

```tsx
// Backdrop Blur Card
<div className="bg-white/90 backdrop-blur-md border border-white/40 shadow-lg rounded-lg p-6">
  {/* Content */}
</div>

// Modal Overlay
<div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50">
  {/* Modal */}
</div>
```

### Loading States

```tsx
// Spinner (Business Orange)
<div className="animate-spin w-8 h-8 border-4 border-orange-200 border-t-orange-600 rounded-full" />

// Skeleton
<div className="animate-pulse space-y-4">
  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
</div>
```

---

## Typography & Spacing

### Typography Scale

```tsx
// Headings
const typography = {
  h1: 'text-3xl font-bold',        // 48px - Page titles
  h2: 'text-2xl font-semibold',    // 32px - Section titles
  h3: 'text-xl font-semibold',     // 24px - Card titles
  h4: 'text-lg font-medium',       // 20px - Subsections
  body: 'text-base',               // 16px - Main text
  small: 'text-sm text-gray-500',  // 14px - Captions
  xs: 'text-xs text-gray-400'      // 12px - Labels
}
```

### Spacing System

```tsx
// Layout Containers
const containers = {
  page: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  content: 'max-w-4xl mx-auto',
  form: 'max-w-2xl mx-auto'
}

// Internal Spacing
const spacing = {
  section: 'py-8 sm:py-12',
  card: 'p-6 sm:p-8',
  grid: 'gap-4 sm:gap-6',
  stack: 'space-y-4'
}

// Border Radius
const radius = {
  sm: 'rounded',      // 4px
  md: 'rounded-lg',   // 8px
  lg: 'rounded-xl',   // 12px
  full: 'rounded-full'
}
```

### Responsive Breakpoints

```tsx
// Mobile-first approach
const breakpoints = {
  sm: '640px',   // Tablet
  md: '768px',   // Small laptop
  lg: '1024px',  // Desktop
  xl: '1280px',  // Large desktop
  '2xl': '1536px'
}

// Usage
<div className="
  grid
  grid-cols-1        /* Mobile: 1 column */
  md:grid-cols-2     /* Tablet: 2 columns */
  lg:grid-cols-3     /* Desktop: 3 columns */
  gap-4 md:gap-6
">
```

---

## Interactive States

### Hover Effects

```tsx
// Lift & Shadow
className="hover:shadow-xl hover:scale-105 hover:-translate-y-1 transition-all duration-300"

// Card Hover
className="hover:shadow-2xl transition-all duration-500 hover:scale-105 hover:-translate-y-2"

// Button Hover (already in gradient buttons above)
className="hover:from-orange-700 hover:via-amber-700 hover:to-yellow-700"
```

### Focus States

```tsx
// Form Inputs
className="focus:ring-2 focus:ring-orange-500 focus:border-orange-500"

// Buttons
className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
```

### Active/Selected States

```tsx
// Active Link (Sidebar)
const isActive = pathname === item.href

<Link className={`${
  isActive
    ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg'
    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
}`}>

// Selected Item
const isSelected = selectedIds.includes(item.id)

<div className={`border-2 ${
  isSelected
    ? 'border-orange-600 bg-orange-50'
    : 'border-gray-200 hover:border-gray-300'
}`}>
```

### Micro-Animations

```tsx
// Group Hover (Icon rotate)
<div className="group">
  <ChevronRight className="group-hover:rotate-12 group-hover:scale-110 transition-transform" />
</div>

// Entrance Animation (Intersection Observer)
const [visible, setVisible] = useState(false)

<div className={`transition-all duration-700 ${
  visible
    ? 'opacity-100 translate-y-0'
    : 'opacity-0 translate-y-8'
}`}>
```

---

## Form Patterns

### Multi-Step Forms (Wizard)

```tsx
// Progress Bar
<div className="flex gap-2 mb-6">
  {steps.map((step, index) => (
    <div
      key={index}
      className={`flex-1 h-2 rounded-full transition-all ${
        index < currentStep
          ? 'bg-gradient-to-r from-orange-600 to-amber-600'  // Completed
          : index === currentStep
          ? 'bg-orange-400'                                   // Current
          : 'bg-gray-200'                                     // Upcoming
      }`}
    />
  ))}
</div>

// Step Navigation
<div className="flex gap-3">
  {currentStep > 1 && (
    <Button variant="outline" onClick={handlePrevious}>
      <ChevronLeft className="w-4 h-4 mr-2" />
      Anterior
    </Button>
  )}

  {currentStep < totalSteps ? (
    <Button onClick={handleNext} disabled={!validateStep(currentStep)}>
      Siguiente
      <ChevronRight className="w-4 h-4 ml-2" />
    </Button>
  ) : (
    <Button onClick={handleSubmit}>
      <Check className="w-4 h-4 mr-2" />
      Confirmar
    </Button>
  )}
</div>
```

### Two-Column Layout (Forms)

```tsx
<div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
  {/* Sidebar - Sticky Progress */}
  <div className="lg:col-span-4">
    <div className="lg:sticky lg:top-8">
      {/* Vertical progress indicator */}
      {steps.map((step, index) => (
        <div className={`flex items-center gap-3 mb-4 ${
          index === currentStep ? 'scale-110' : ''
        }`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            index < currentStep
              ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white'
              : index === currentStep
              ? 'bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 text-white'
              : 'bg-gray-100 text-gray-400'
          }`}>
            {index < currentStep ? <Check /> : index + 1}
          </div>
          <span className={index === currentStep ? 'font-bold' : ''}>
            {step.title}
          </span>
        </div>
      ))}
    </div>
  </div>

  {/* Form Content */}
  <div className="lg:col-span-8">
    {/* Current step content */}
  </div>
</div>
```

---

## Empty States

```tsx
<div className="text-center py-12">
  {/* Icon Circle */}
  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
    <CalendarOff className="w-8 h-8 text-gray-400" />
  </div>

  {/* Title */}
  <h3 className="text-lg font-medium text-gray-900 mb-2">
    No hay citas programadas
  </h3>

  {/* Description */}
  <p className="text-gray-500 mb-6 max-w-sm mx-auto">
    Comienza agregando tu primera cita o espera a que los clientes reserven.
  </p>

  {/* CTA */}
  <Button className="bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600">
    <Plus className="w-4 h-4 mr-2" />
    Crear Primera Cita
  </Button>
</div>
```

---

## Notifications & Feedback

### Toast Notifications (shadcn/ui)

```tsx
import { useToast } from '@/hooks/use-toast'

const { toast } = useToast()

// Success
toast({
  title: '¡Cita creada exitosamente!',
  description: `Cita para ${clientName} confirmada para el ${date}.`,
})

// Error
toast({
  variant: 'destructive',
  title: 'Error al crear la cita',
  description: 'Por favor intenta de nuevo o contacta soporte.',
})

// Warning
toast({
  title: 'Atención',
  description: 'Este horario ya tiene una cita programada.',
  variant: 'default', // Yellow styling
})
```

**Installation:**
```bash
npx shadcn@latest add toast
```

**Layout Integration:**
```tsx
// Add to layout.tsx
import { Toaster } from '@/components/ui/toaster'

export default function Layout({ children }) {
  return (
    <div>
      {children}
      <Toaster />
    </div>
  )
}
```

---

## Accessibility

### ARIA Labels

```tsx
<button aria-label="Crear nueva cita">
  <Plus className="w-4 h-4" />
</button>

<input
  type="text"
  aria-describedby="email-error"
  aria-invalid={!!errors.email}
/>
{errors.email && (
  <p id="email-error" className="text-red-500 text-sm">
    {errors.email.message}
  </p>
)}
```

### Keyboard Navigation

```tsx
// Tab Index
<div className="space-y-2">
  <button tabIndex={0}>Primera opción</button>
  <button tabIndex={0}>Segunda opción</button>
  <button tabIndex={-1} disabled>Deshabilitada</button>
</div>

// Focus Trapping in Modals
import { FocusTrap } from '@headlessui/react'

<FocusTrap>
  <div className="modal">
    {/* Modal content */}
  </div>
</FocusTrap>
```

### Screen Reader Support

```tsx
<div role="status" aria-live="polite" className="sr-only">
  {loading ? 'Cargando citas...' : 'Citas cargadas'}
</div>

<nav aria-label="Navegación principal">
  {/* Navigation items */}
</nav>
```

---

## Performance Best Practices

### Image Optimization

```tsx
import Image from 'next/image'

// Business Logo (500x500)
<Image
  src={business.logo_url}
  alt={business.name}
  width={500}
  height={500}
  quality={98}
  className="rounded-lg"
  priority // For above-the-fold images
/>

// Cover Image (2000x1000)
<Image
  src={business.cover_url}
  alt={`${business.name} cover`}
  width={2000}
  height={1000}
  quality={98}
  className="w-full h-48 object-cover"
/>
```

### Component Optimization

```tsx
import { memo, useMemo, useCallback } from 'react'

// Memoize expensive calculations
const totalPrice = useMemo(() => {
  return services.reduce((sum, service) => sum + service.price, 0)
}, [services])

// Memoize callbacks
const handleClick = useCallback(() => {
  onSelect(item.id)
}, [item.id, onSelect])

// Memoize components
const AppointmentCard = memo(({ appointment }) => {
  return <div>{/* Card content */}</div>
})
```

---

## Design Tokens Reference

```typescript
// .claude/design-tokens.ts (future implementation)
export const tokens = {
  colors: {
    client: {
      primary: '#059669',
      gradient: 'linear-gradient(to right, #059669, #0d9488, #0891b2)',
    },
    business: {
      primary: '#ea580c',
      gradient: 'linear-gradient(to right, #ea580c, #f59e0b, #eab308)',
    },
  },
  spacing: {
    xs: '0.25rem',  // 4px
    sm: '0.5rem',   // 8px
    md: '1rem',     // 16px
    lg: '1.5rem',   // 24px
    xl: '2rem',     // 32px
  },
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
    },
    fontSize: {
      xs: '0.75rem',   // 12px
      sm: '0.875rem',  // 14px
      base: '1rem',    // 16px
      lg: '1.125rem',  // 18px
      xl: '1.25rem',   // 20px
    },
  },
}
```

---

## When to Use Each Theme

| Feature | Theme | Reason |
|---------|-------|--------|
| Client Dashboard | 🟢 Green | User-facing, consumer app feel |
| Client Booking Flow | 🟢 Green | Calm, trustworthy for bookings |
| Client Emails | 🟢 Green | Consistent with dashboard |
| Business Dashboard | 🟠 Orange | Professional, energetic |
| Appointment Management | 🟠 Orange | B2B SaaS, action-oriented |
| Business Emails | 🟠 Orange | Brand recognition |
| Public Business Pages | 🟠 Orange | Business identity |
| Marketing/Landing | 🟢/🟠 Both | Dual audience messaging |

---

**Related Documentation:**
- [B2B Calendar System](./b2b-calendar-system.md) - Full calendar implementation
- [Email System](./email-system.md) - Email templates and architecture
- [Database Schema](./database.md) - Database structure and policies
