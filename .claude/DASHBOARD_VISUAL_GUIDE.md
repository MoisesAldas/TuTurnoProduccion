# Dashboard Analytics - Visual Design Guide

## Dashboard Layout Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      Page Header                                │
│  "Análisis de Negocio"          [Refresh Button]               │
│  Subtitle description...                                         │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┬──────────────┬──────────────┐
│              │              │              │
│   KPI Card   │   KPI Card   │   KPI Card   │  ← Row 1: KPI Metrics
│   Ingresos   │     Citas    │ Completitud  │
│              │              │              │
└──────────────┴──────────────┴──────────────┘

┌──────────────────────────┬──────────────────────────┐
│                          │                          │
│                          │                          │
│   Revenue Chart          │   Appointments Chart     │  ← Row 2: Analytics
│   (Stacked Bar)          │   (Weekly Bar)           │
│                          │   [Time Selector]        │
│                          │                          │
└──────────────────────────┴──────────────────────────┘

┌──────────────────────────┬──────────────────────────┐
│                          │                          │
│   Payment Methods        │   Top Services           │
│   (Donut + Legend)       │   (Progress Bars)        │  ← Row 3: Breakdown
│                          │                          │
└──────────────────────────┴──────────────────────────┘
```

## KPI Card Anatomy

```
┌─────────────────────────────────────────┐
│                                         │
│  INGRESOS TOTALES            [Icon]    │  ← Label + Icon Box
│  $2,847.50                             │  ← Large Value (30px bold)
│  ↑ +12.5%                              │  ← Trend Badge (green)
│                                         │
└─────────────────────────────────────────┘

Colors:
- Background: white
- Border: #e5e7eb (gray-200)
- Label text: #6b7280 (gray-500), 12px uppercase
- Value text: #111827 (gray-900), 30px bold
- Icon box background: #f3f4f6 (gray-100)
- Trend badge: #10b981 (emerald), 12px
- Hover: shadow-lg transition

Spacing:
- Card padding: 24px (p-6)
- Label to value: 8px gap
- Value to trend: 12px gap
- Icon box: 48x48px (w-12 h-12)
```

## Revenue Chart (Stacked Bar)

```
Ingresos por Empleado

$5000│
$4000│                   [Bar Orange]
$3000│  [Bar]           [Bar]
$2000│  [Bar]           [Bar]
$1000│  [Bar]           [Bar]
    $0┼──────────────────────────
     │ Enero  Febrero  Marzo

Legend: (below chart)
○ Ingresos (Orange-600)

Styling:
- Bar color: #ea580c (orange-600)
- Bar radius: 8px top only
- Gridlines: #f3f4f6 (very light)
- Axis labels: #6b7280 (gray-500)
- Height: 280px
- Tooltip on hover with currency format
```

## Weekday Appointments Chart

```
Citas por Día                        [Semana ▼]

   Count
    30│
    25│      [Bar]
    20│[Bar][Bar]  [Bar][Bar][Bar]
    15│
    10│
     5│
     0┼────────────────────────────
      Dom Lun Mar Mié Jue Vie Sáb

Styling:
- Bar color: #a78bfa (purple-400)
- Gridlines: light gray, dashed
- Axis labels: small, gray
- Selector: dropdown (Week/Month/Year)
- Height: 280px
```

## Payment Methods Donut

```
           Métodos de Pago

        ╭─────────────────╮
       ╱                   ╲
      │                     │
      │      ○ Efectivo     │  ← Legend on right
      │      ○ Transferencia │
      │                     │
       ╲                   ╱
        ╰─────────────────╯

Legend:
● Efectivo         ← Orange-600
  $1,800.00

● Transferencia    ← Amber-600
  $1,047.50

Styling:
- Donut inner radius: 70px
- Donut outer radius: 110px
- Padding angle: 2deg (small gaps)
- Colors: 2 only (orange shades)
- Legend: right side, vertical list
- Font: small, gray
```

## Service Progress Bars

```
Servicios Principales

Corte Cabello                    25%
████████████████████░░░░░░░░░░░░
32 citas

Tintura                          22%
██████████████████░░░░░░░░░░░░░░
28 citas

Pedicura                         19%
████████████████░░░░░░░░░░░░░░░░
24 citas

Styling:
- Track: #e5e7eb (gray-200)
- Fill: #ea580c → #f59e0b (orange gradient)
- Track height: 8px (0.5rem)
- Track radius: full (rounded ends)
- Bar animation: 500ms ease-out
- Label: 12px gray-600
- Spacing between: 16px
```

## Color Swatches

### Primary Brand Colors
```
Orange-600  ████████  #ea580c   ← Primary (charts, bars, accents)
Amber-600   ████████  #f59e0b   ← Secondary (gradients)
Yellow-300  ████████  #fcd34d   ← Light variant
```

### Neutral Colors
```
White       ████████  #ffffff   ← Card backgrounds
Gray-100    ████████  #f3f4f6   ← Icon boxes, light backgrounds
Gray-200    ████████  #e5e7eb   ← Borders, dividers
Gray-500    ████████  #6b7280   ← Labels, secondary text
Gray-900    ████████  #111827   ← Main text, values
```

### Status Colors
```
Emerald-600 ████████  #059669   ← Positive trends (up)
Red-600     ████████  #dc2626   ← Negative trends (down)
Purple-400  ████████  #a78bfa   ← Secondary metric (weekday chart)
```

## Typography Specimens

```
Heading 1: "Análisis de Negocio"
┌─────────────────────────────┐
│ Análisis de Negocio          │
└─────────────────────────────┘
Font: 30px, bold, gray-900

Card Title: "Ingresos por Empleado"
┌─────────────────────────────┐
│ Ingresos por Empleado        │
│ Últimos 3 meses              │  ← Description (14px, gray-600)
└─────────────────────────────┘
Font: 20px, semibold, gray-900

KPI Label: "INGRESOS TOTALES"
┌─────────────────────────────┐
│ INGRESOS TOTALES             │
└─────────────────────────────┘
Font: 12px, uppercase, medium, gray-500

KPI Value: "$2,847.50"
┌─────────────────────────────┐
│ $2,847.50                    │
└─────────────────────────────┘
Font: 30px, bold, gray-900

Progress Label: "32 citas"
┌─────────────────────────────┐
│ 32 citas                     │
└─────────────────────────────┘
Font: 12px, regular, gray-500

Chart Label: "Enero"
┌─────────────────────────────┐
│ Enero                        │
└─────────────────────────────┘
Font: 12px, regular, gray-500
```

## Responsive Behavior

### Desktop (1024px+)
```
┌─────────────┬─────────────┬─────────────┐
│   KPI 1     │   KPI 2     │   KPI 3     │
└─────────────┴─────────────┴─────────────┘
┌──────────────────────┬──────────────────────┐
│      Chart 1         │      Chart 2         │
└──────────────────────┴──────────────────────┘
┌──────────────────────┬──────────────────────┐
│      Chart 3         │      Chart 4         │
└──────────────────────┴──────────────────────┘
```

### Tablet (768px - 1024px)
```
┌─────────────┬─────────────┬─────────────┐
│   KPI 1     │   KPI 2     │   KPI 3     │
└─────────────┴─────────────┴─────────────┘
┌────────────────────────────────────────┐
│            Chart 1                     │
└────────────────────────────────────────┘
┌────────────────────────────────────────┐
│            Chart 2                     │
└────────────────────────────────────────┘
```

### Mobile (<768px)
```
┌──────────────────────┐
│      KPI 1          │
└──────────────────────┘
┌──────────────────────┐
│      KPI 2          │
└──────────────────────┘
┌──────────────────────┐
│      KPI 3          │
└──────────────────────┘
┌──────────────────────┐
│     Chart 1         │
└──────────────────────┘
```

## Interactive States

### Card Hover
```
Before Hover:
┌─────────────────────────────┐
│  KPI Card                   │
│  Shadow: none               │
└─────────────────────────────┘

On Hover:
┌─────────────────────────────┐
│  KPI Card                   │╭─ shadow-lg
│  Shadow: 0 10px 15px        ││  (0.3s ease-out)
└─────────────────────────────┘╰─

Colors unchanged
No border change
No background change
```

### Progress Bar Animation
```
Before:           On Load:
░░░░░░░░░░░░░░░░ ████░░░░░░░░░░░░░
0%                ~50% (animating)

Final:
████████████████░░░░░░░░░░░░░░░░░░░░
25% (duration: 500ms, ease-out)
```

### Time Selector Interaction
```
Initial state:
[Semana ▼]

Hover:
[Semana ▼]  ← Cursor pointer, border color change
 └─ border: gray-400

Active/Selected:
[Mes ▼]     ← Background white, border orange

Focus:
[Mes ▼]     ← Outline: 2px orange-600
```

## Empty & Error States

### Empty State (No Data)
```
┌────────────────────────────────────────┐
│                                        │
│          ⚠ (gray circle)              │
│                                        │
│      Sin datos aún                     │
│                                        │
│   Comienza creando citas y            │
│   registrando pagos...                 │
│                                        │
│      [Ir a Citas]                      │
│      (orange button)                   │
│                                        │
└────────────────────────────────────────┘
```

### Error State
```
┌────────────────────────────────────────┐
│ ⚠ Error al cargar analytics           │
│                                        │
│ Por favor intenta de nuevo o          │
│ contacta soporte.                      │
│                                        │
│           [Reintentar]                 │
│           (outline button)             │
└────────────────────────────────────────┘
Background: #fee2e2 (red-50)
Border: #fecaca (red-200)
Text: #991b1b (red-900)
```

### Loading State
```
        ⟳ (spinning)

   Cargando análisis...

   (spinner orange-600, border orange-200)
```

## Spacing Reference Grid

```
All measurements in pixels (px) / rem

Container padding:     24px (p-6)
Section margin:        24px (space-y-6)
Header divider:        16px bottom (pb-4)
Card inner gap:        4px - 8px
Column gap:            24px (gap-6)
Row gap:               24px (gap-6)

Breakpoints:
sm: 640px    (tablet)
md: 768px    (small laptop)
lg: 1024px   (desktop)
xl: 1280px   (large desktop)

Chart heights:
All: 280px (consistent)
```

## Component Variants

### KPI Card Variants

**Positive Trend:**
```
Value: $2,847.50
Trend: ↑ +12.5%
Badge: emerald-100 text-emerald-700
```

**Negative Trend:**
```
Value: 95 citas
Trend: ↓ -3.2%
Badge: red-100 text-red-700
```

**Neutral:**
```
Value: 94.5%
Trend: → ±0.5%
Badge: gray-100 text-gray-700
```

## Design System Consistency

### All Cards Use:
```
Border:     1px solid #e5e7eb
Radius:     12px (rounded-lg)
Padding:    24px (p-6)
Shadow:     0 (default), 0 10px 15px (hover)
Background: #ffffff
Font:       System fonts (Inter)
```

### All Charts Use:
```
Height:     280px (fixed)
Gridlines:  light gray, dashed
Axes:       12px gray labels
Tooltip:    white bg, gray border
Legend:     below or beside chart
Spacing:    24px container padding
```

### All Progress Bars Use:
```
Track:      #e5e7eb (gray-200)
Fill:       orange gradient
Height:     8px (0.5rem)
Radius:     9999px (full rounded)
Animation:  0.5s ease-out
Spacing:    16px between items
```

## Accessibility Contrast

### Text Colors (4.5:1 minimum for AA)

```
gray-900 on white:      18:1 ✓ AAA
gray-500 on white:      7.4:1 ✓ AAA
orange-600 on white:    5.3:1 ✓ AA
emerald-600 on white:   5.1:1 ✓ AA
red-600 on white:       5.4:1 ✓ AA
```

### Focus Indicators
```
Default: None (focus-visible only)
Focused: 2px solid #ea580c (orange-600)
Offset:  2px
```

## Animation Timing

```
Card hover shadow:      0.3s ease-out
Progress bar fill:      0.5s ease-out
Button hover:           0.2s ease-out
Tooltip fade:           auto (Recharts default)
Chart render:           initial load 200ms
```

## Print Styling (Future)

```
Colors: Convert to grayscale
Cards: Black borders instead of gray
Shadow: Remove all shadows
Charts: Increase line weights
Legend: Always visible, no hover
Typography: Maintain hierarchy
Page breaks: After major sections
```

---

**Last Updated:** 2025-12-01
**Status:** Complete Visual Reference
**Usage:** Design implementation, QA verification, component development
