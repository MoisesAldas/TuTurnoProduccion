# StatsCard Component

Componente reutilizable para mostrar estadísticas con el estilo de diseño de TuTurno.

## 🎨 Características

- ✅ **Dark mode completo**
- ✅ **8 variantes de color predefinidas**
- ✅ **Hover effects profesionales**
- ✅ **Responsive design**
- ✅ **Type-safe con TypeScript**
- ✅ **Iconos de Lucide**
- ✅ **Gradientes suaves**

## 📦 Uso Básico

```tsx
import { StatsCard } from '@/components/StatsCard'
import { Users, Calendar, DollarSign, CheckCircle2 } from 'lucide-react'

export default function MyPage() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsCard
        title="Total Clientes"
        value={150}
        description="Todos los registros"
        icon={Users}
        variant="orange"
      />

      <StatsCard
        title="Activos"
        value={120}
        description="Clientes habilitados"
        icon={CheckCircle2}
        variant="green"
      />

      <StatsCard
        title="Citas Hoy"
        value={25}
        description="Citas programadas"
        icon={Calendar}
        variant="blue"
      />

      <StatsCard
        title="Ingresos"
        value="$1,250.00"
        description="Total del mes"
        icon={DollarSign}
        variant="revenue"
      />
    </div>
  )
}
```

## 🎨 Variantes Predefinidas

### 1. **orange** (Default - Business Theme)
```tsx
<StatsCard variant="orange" ... />
```
- Gradiente: Orange → Amber
- Uso: Total de entidades, métricas principales

### 2. **green** (Success Theme)
```tsx
<StatsCard variant="green" ... />
```
- Gradiente: Emerald → Green
- Uso: Activos, completados, éxitos

### 3. **blue** (Info Theme)
```tsx
<StatsCard variant="blue" ... />
```
- Gradiente: Blue → Cyan
- Uso: Información, contactos, comunicación

### 4. **yellow** (Warning Theme)
```tsx
<StatsCard variant="yellow" ... />
```
- Gradiente: Yellow → Amber
- Uso: Pendientes, advertencias, atención

### 5. **purple** (Accent Theme)
```tsx
<StatsCard variant="purple" ... />
```
- Gradiente: Purple → Pink
- Uso: Servicios, características especiales

### 6. **revenue** (Money Theme)
```tsx
<StatsCard variant="revenue" ... />
```
- Gradiente: Green → Emerald
- Uso: Ingresos, pagos, finanzas

### 7. **gray** (Neutral Theme)
```tsx
<StatsCard variant="gray" ... />
```
- Gradiente: Gray → Gray
- Uso: Métricas neutrales, archivados

### 8. **red** (Danger Theme)
```tsx
<StatsCard variant="red" ... />
```
- Gradiente: Red → Pink
- Uso: Cancelaciones, errores, alertas críticas

## 🎯 Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `title` | `string` | ✅ | - | Título del card |
| `value` | `string \| number` | ✅ | - | Valor principal (número o texto) |
| `description` | `string` | ✅ | - | Descripción debajo del valor |
| `icon` | `LucideIcon` | ✅ | - | Ícono de Lucide React |
| `variant` | `StatsCardVariant` | ❌ | `'orange'` | Variante de color predefinida |
| `gradientFrom` | `string` | ❌ | - | Gradiente desde (custom) |
| `gradientTo` | `string` | ❌ | - | Gradiente hasta (custom) |
| `iconColor` | `string` | ❌ | - | Color del ícono (custom) |

## 🔧 Colores Personalizados

Si necesitas colores específicos que no están en las variantes, puedes usar props custom:

```tsx
<StatsCard
  title="Custom"
  value={100}
  description="Mi métrica"
  icon={Star}
  gradientFrom="from-teal-100 dark:from-teal-900"
  gradientTo="to-cyan-100 dark:to-cyan-900"
  iconColor="text-teal-600 dark:text-teal-400"
/>
```

## 💡 Ejemplos Reales

### Dashboard de Clientes

```tsx
const stats = {
  total: 150,
  active: 120,
  withPhone: 100,
  withEmail: 80,
}

return (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <StatsCard
      title="Total Clientes"
      value={stats.total}
      description="Todos los registros"
      icon={Users}
      variant="orange"
    />
    <StatsCard
      title="Activos"
      value={stats.active}
      description="Clientes habilitados"
      icon={CheckCircle2}
      variant="green"
    />
    <StatsCard
      title="Con Teléfono"
      value={stats.withPhone}
      description="Contacto telefónico"
      icon={Phone}
      variant="blue"
    />
    <StatsCard
      title="Con Email"
      value={stats.withEmail}
      description="Contacto por email"
      icon={Mail}
      variant="purple"
    />
  </div>
)
```

### Dashboard de Citas

```tsx
const stats = {
  total: 250,
  completed: 180,
  pending: 50,
  totalRevenue: 3500.50,
}

return (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <StatsCard
      title="Total Citas"
      value={stats.total}
      description="Todas las citas"
      icon={Calendar}
      variant="orange"
    />
    <StatsCard
      title="Completadas"
      value={stats.completed}
      description="Finalizadas exitosamente"
      icon={CheckCircle2}
      variant="green"
    />
    <StatsCard
      title="Pendientes"
      value={stats.pending}
      description="Por confirmar/completar"
      icon={Clock}
      variant="yellow"
    />
    <StatsCard
      title="Ingresos Totales"
      value={`$${stats.totalRevenue.toFixed(2)}`}
      description="Solo citas completadas"
      icon={DollarSign}
      variant="revenue"
    />
  </div>
)
```

### Dashboard de Empleados

```tsx
const stats = {
  total: 15,
  active: 12,
  onVacation: 2,
  avgRating: 4.8,
}

return (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    <StatsCard
      title="Total Empleados"
      value={stats.total}
      description="Todos los empleados"
      icon={Users}
      variant="orange"
    />
    <StatsCard
      title="Activos"
      value={stats.active}
      description="Trabajando actualmente"
      icon={CheckCircle2}
      variant="green"
    />
    <StatsCard
      title="De Vacaciones"
      value={stats.onVacation}
      description="Ausentes temporalmente"
      icon={Plane}
      variant="blue"
    />
    <StatsCard
      title="Rating Promedio"
      value={stats.avgRating.toFixed(1)}
      description="Satisfacción de clientes"
      icon={Star}
      variant="yellow"
    />
  </div>
)
```

## 📱 Responsive

El componente es responsive por defecto. Usa el grid layout recomendado:

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* Cards aquí */}
</div>
```

- **Mobile** (<640px): 1 columna
- **Tablet** (640px+): 2 columnas
- **Desktop** (1024px+): 4 columnas

## 🌙 Dark Mode

El componente soporta dark mode automáticamente. Todas las variantes incluyen colores para modo oscuro.

## 🎨 Personalización Avanzada

Si necesitas modificar el componente base:

```tsx
// src/components/StatsCard.tsx
<Card className="overflow-hidden border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300">
  {/* Modifica clases aquí */}
</Card>
```

## 📚 Archivos Relacionados

- `src/components/StatsCard.tsx` - Componente principal
- `src/components/StatsCard.variants.ts` - Variantes de color predefinidas
- `src/components/StatsCard.README.md` - Esta documentación

## 🚀 Mejoras Futuras

- [ ] Agregar loading skeleton state
- [ ] Agregar trend indicator (↑ ↓)
- [ ] Agregar percentage change
- [ ] Agregar click handler opcional
- [ ] Agregar tooltip opcional

---

**✨ Componente creado siguiendo la línea de diseño de TuTurno**
