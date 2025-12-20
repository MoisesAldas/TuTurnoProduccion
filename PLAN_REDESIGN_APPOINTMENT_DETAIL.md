# 📋 Plan de Rediseño - Detalle de Cita Cliente

## 🎯 Objetivo
Rediseñar completamente `/dashboard/client/appointments/[id]/page.tsx` con:
1. **100% ancho horizontal** - Sin max-width, aprovechar todo el viewport
2. **Solo componentes shadcn/ui** - Diseño limpio, simple y profesional
3. **Modal multi-paso con transiciones** - Para modificar citas (wizard con animaciones)
4. **Paleta de colores slate** - slate-900 / slate-800 (sin gradientes emerald/teal/cyan)

---

## 🎨 Diseño Propuesto

### **Layout General (100% width)**

```
┌─────────────────────────────────────────────────────────────────┐
│ Header Sticky (100% width, bg-white, border-bottom)            │
│ ← Volver | Detalle de Cita | Badge Status                     │
└─────────────────────────────────────────────────────────────────┘
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Hero Section (100% width, bg-slate-900, text-white)        ││
│ │ Business Name + Services + Total Price                     ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ ┌───────────────────────────────────┬───────────────────────────┐│
│ │ Info Grid (3 columns)             │                         ││
│ │ ┌─────┬─────┬─────┐              │                         ││
│ │ │Date │Time │Prof.│              │ Actions Card            ││
│ │ └─────┴─────┴─────┘              │ • Modificar             ││
│ │ Location (if available)           │ • Cancelar              ││
│ └───────────────────────────────────┴───────────────────────────┘│
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Policy Alert (if can't cancel/reschedule)                  ││
│ └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## 🧩 Componentes shadcn/ui a Usar

| Componente | Uso |
|------------|-----|
| `Card` | Contenedores principales |
| `Button` | Todas las acciones |
| `Badge` | Estado de cita |
| `Alert` | Alertas de políticas |
| `Dialog` | **Modal multi-paso para modificar** |
| `Tabs` (opcional) | Navegación dentro del modal |
| `Calendar` | Selector de fecha |
| `Separator` | Divisores visuales |
| `Avatar` | Foto del profesional |
| `ScrollArea` | Scrollable content |

---

## ✨ Modal Multi-Paso para Modificar

### **Estructura del Modal (Dialog)**

```tsx
<Dialog open={isModifyModalOpen} onOpenChange={setIsModifyModalOpen}>
  <DialogContent className="max-w-4xl h-[80vh]">
    <DialogHeader>
      <DialogTitle>Modificar Cita</DialogTitle>
      <DialogDescription>Paso {currentStep} de 3</DialogDescription>
    </DialogHeader>

    {/* Progress Indicator */}
    <div className="flex gap-2">
      <div className={step >= 1 ? "bg-slate-900" : "bg-slate-200"} />
      <div className={step >= 2 ? "bg-slate-900" : "bg-slate-200"} />
      <div className={step >= 3 ? "bg-slate-900" : "bg-slate-200"} />
    </div>

    {/* Content con AnimatePresence */}
    <motion.div
      key={currentStep}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      {currentStep === 1 && <ServicesStep />}
      {currentStep === 2 && <EmployeeStep />}
      {currentStep === 3 && <DateTimeStep />}
    </motion.div>

    <DialogFooter>
      <Button variant="outline" onClick={handleBack}>Atrás</Button>
      <Button onClick={handleNext}>
        {currentStep === 3 ? 'Guardar Cambios' : 'Continuar'}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### **Pasos del Modal**

| Paso | Título | Componentes | Transición |
|------|--------|-------------|------------|
| **1. Servicios** | "Selecciona servicios" | Checkboxes + Cards | Slide right → |
| **2. Profesional** | "Elige profesional" | Radio + Avatar cards | Slide right → |
| **3. Fecha/Hora** | "Fecha y hora" | Calendar + Time slots | Slide right → |
| **4. Confirmar** | "Confirmar cambios" | Summary card | Fade in |

---

## 🎨 Sistema de Colores (Slate Only)

### **Reemplazos de Color**

| Antes | Después | Uso |
|-------|---------|-----|
| `from-emerald-600 via-teal-600 to-cyan-600` | `bg-slate-900` | Hero section |
| `border-emerald-500` | `border-slate-700` | Borders activos |
| `text-emerald-600` | `text-slate-700` | Textos de acento |
| `bg-emerald-50` | `bg-slate-100` | Fondos suaves |
| `hover:bg-emerald-700` | `hover:bg-slate-800` | Hover states |
| Gradientes en cards | Sólidos slate | Todas las cards |

**Excepciones (mantener semántica):**
- ✅ Red (error/cancelar): `bg-red-50`, `text-red-600`
- ✅ Status badges: yellow (pending), blue (confirmed), green (completed)
- ✅ Info cards individuales: blue (fecha), purple (hora), gray (profesional)

---

## 📐 Cambios de Layout

### **Antes (max-w-5xl centrado)**
```tsx
<div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
```

### **Después (100% width)**
```tsx
<div className="w-full px-4 sm:px-6 lg:px-8">
  {/* Full width container */}
</div>
```

### **Grid Responsivo**
```tsx
// Desktop: 2 columnas (Info | Actions)
// Tablet: 1 columna stack
<div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
```

---

## 🔄 Transiciones con Framer Motion

### **Instalación**
```bash
npm install framer-motion
```

### **Variantes de Animación**
```tsx
const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 20 : -20,
    opacity: 0
  }),
  center: {
    x: 0,
    opacity: 1
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 20 : -20,
    opacity: 0
  })
}
```

---

## 📋 Checklist de Implementación

### **Fase 1: Estructura Base**
- [ ] Eliminar `max-w-5xl`, hacer 100% width
- [ ] Rediseñar Hero section con slate-900 (sin gradiente)
- [ ] Crear grid 2 columnas (Info | Actions)
- [ ] Simplificar cards con shadcn/ui puro

### **Fase 2: Modal Multi-Paso**
- [ ] Crear `<ModifyAppointmentDialog>`
- [ ] Implementar estado de pasos (1-3)
- [ ] Progress indicator visual
- [ ] Separar cada paso en componente

### **Fase 3: Transiciones**
- [ ] Instalar framer-motion
- [ ] AnimatePresence para cambio de pasos
- [ ] Fade in/out para cards
- [ ] Smooth scroll en slots de hora

### **Fase 4: Colores Slate**
- [ ] Reemplazar todos `emerald-*` → `slate-*`
- [ ] Reemplazar todos `teal-*` → `slate-*`
- [ ] Reemplazar todos `cyan-*` → `slate-*`
- [ ] Eliminar gradientes `from-via-to`
- [ ] Mantener status badges (yellow, blue, green, red)

### **Fase 5: Pulido**
- [ ] Responsive testing (mobile, tablet, desktop)
- [ ] Accessibility (ARIA labels, keyboard nav)
- [ ] Loading states
- [ ] Error states

---

## 📦 Nuevos Componentes a Crear

### **1. ModifyAppointmentDialog.tsx**
```tsx
interface ModifyAppointmentDialogProps {
  appointment: Appointment
  isOpen: boolean
  onClose: () => void
  onSave: (data: ModifyData) => Promise<void>
}
```

### **2. StepIndicator.tsx**
```tsx
interface StepIndicatorProps {
  currentStep: number
  totalSteps: number
  labels: string[]
}
```

### **3. ServiceSelectionStep.tsx**
```tsx
// Step 1: Checkboxes for services
```

### **4. EmployeeSelectionStep.tsx**
```tsx
// Step 2: Radio cards for employees
```

### **5. DateTimeSelectionStep.tsx**
```tsx
// Step 3: Calendar + Time slots
```

---

## 🚀 Resultado Esperado

### **Desktop View (100% width)**
```
┌────────────────────────────────────────────────────────────────────────┐
│ ← Volver | Detalle de Cita                          [Confirmada Badge] │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│ ████████████████████████████████████████████████████████████████████   │
│ █ Business Name                                  Total: $XX.XX     █   │
│ █ Service 1, Service 2                                             █   │
│ ████████████████████████████████████████████████████████████████████   │
│                                                                        │
│ ┌──────────────────────────────────────┬───────────────────────────┐  │
│ │ 📅 Fecha: Lunes, 15 de enero         │ ¿Qué deseas hacer?        │  │
│ │ 🕐 Hora: 14:30 - 15:00                │                           │  │
│ │ 👤 Profesional: Juan Pérez            │ ┌─────────────────────┐  │  │
│ │ 📍 Ubicación: Av. Principal 123       │ │ ✏️ Modificar Cita    │  │  │
│ │                                       │ └─────────────────────┘  │  │
│ └──────────────────────────────────────┤ ┌─────────────────────┐  │  │
│                                         │ │ 🗑️ Cancelar Cita     │  │  │
│                                         │ └─────────────────────┘  │  │
│                                         └───────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### **Modal Modificar (AnimatePresence)**
```
┌─────────────────────────────────────────────┐
│ Modificar Cita                        ✕    │
│ Paso 2 de 3: Selecciona profesional        │
│                                             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│ ████████        ████████        ████████   │ <- Progress
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 👤 Juan Pérez                    ✓  │   │ <- Selected
│  └─────────────────────────────────────┘   │
│  ┌─────────────────────────────────────┐   │
│  │ 👤 María García                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│              [Atrás]  [Continuar →]         │
└─────────────────────────────────────────────┘
```

---

## 🎯 Beneficios del Nuevo Diseño

✅ **100% width** - Aprovecha todo el espacio disponible
✅ **Simple y profesional** - Solo shadcn/ui, sin diseño custom
✅ **Mejor UX** - Modal paso a paso guía al usuario
✅ **Animaciones suaves** - Framer Motion para transiciones elegantes
✅ **Colores neutros** - Paleta slate moderna y seria
✅ **Responsive** - Mobile-first, adaptable a cualquier pantalla

---

## ⏱️ Estimación de Tiempo

| Fase | Tiempo Estimado |
|------|-----------------|
| Estructura Base | 30-45 min |
| Modal Multi-Paso | 45-60 min |
| Transiciones | 20-30 min |
| Colores Slate | 15-20 min |
| Testing | 15-20 min |
| **TOTAL** | **~2-3 horas** |

---

## 📝 Notas Finales

- **Mantener toda la lógica existente** (fetchAppointment, validation, etc.)
- **Solo cambiar UI/UX** (layout, componentes, colores, animaciones)
- **Accesibilidad** - ARIA labels, keyboard navigation
- **Performance** - Lazy load de framer-motion si es posible

---

**¿Proceder con la implementación?** 🚀
