# 🎨 TuTurno - Design Guidelines & Consistency Standards

> **Última actualización:** 2025-01-XX
> **Sección de referencia:** `/dashboard/business/services`
> **Objetivo:** Mantener consistencia visual y UX en todas las secciones del dashboard

---

## 📋 Tabla de Contenidos

1. [Principios de Diseño](#-principios-de-diseño)
2. [Componentes shadcn/ui](#-componentes-shadcnui)
3. [Patrones Responsive](#-patrones-responsive)
4. [Headers Sticky](#-headers-sticky)
5. [Modales](#-modales)
6. [Diálogos de Confirmación](#-diálogos-de-confirmación)
7. [Formularios](#-formularios)
8. [Paleta de Colores](#-paleta-de-colores)
9. [Tipografía](#-tipografía)
10. [Checklist de Implementación](#-checklist-de-implementación)

---

## 🎯 Principios de Diseño

### 1. **Mobile-First**
- Diseñar primero para mobile
- Escalar progresivamente a desktop
- Nunca asumir que habrá espacio horizontal

### 2. **Modales sobre Páginas**
- ✅ **Usar modales** para: Crear, Editar, formularios simples
- ❌ **Evitar páginas completas** para: Formularios cortos (< 10 campos)
- **Razón:** Mantiene contexto, más rápido, mejor UX

### 3. **Consistencia Visual**
- Mismo estilo en toda la aplicación
- Patrones repetibles y predecibles
- Sin sorpresas para el usuario

### 4. **shadcn/ui Siempre**
- ✅ Usar componentes de shadcn/ui
- ✅Solo usar componentes de shadcn/ui solo esos con dark mode
- ❌ Evitar `alert()`, `confirm()` nativos
- ❌ Evitar estilos inline o custom sin justificación

---

## 🧩 Componentes shadcn/ui

### Componentes Esenciales

```tsx
// Diálogos y Modales
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// Formularios
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

// UI Elements
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
```

---

## 📱 Patrones Responsive

### Grid Layouts

```tsx
// Cards Grid - 1 col mobile, 2 col tablet, 3 col desktop
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

// Statistics Cards - Stack mobile, 4 cols desktop
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

// Form Fields - Stack mobile, 2 cols desktop
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
```

### Flex Layouts

```tsx
// Header - Vertical mobile, horizontal desktop
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">

// Botones - Reverse mobile (primary on top), normal desktop
<div className="flex flex-col-reverse sm:flex-row gap-2">

// Estado section - Stack mobile, horizontal desktop
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
```

### Visibility Classes

```tsx
// Ocultar en mobile, mostrar en desktop
className="hidden sm:flex"
className="hidden sm:block"
className="hidden lg:block"

// Full width mobile, auto desktop
className="w-full sm:w-auto"
```

### Spacing Responsive

```tsx
// Padding
className="p-4 sm:p-6 lg:p-8"
className="px-4 sm:px-6 lg:px-8"

// Gap
className="gap-2 sm:gap-3"
className="space-y-3 sm:space-y-4"

// Text Size
className="text-xs sm:text-sm"
className="text-lg sm:text-xl"
className="text-xl sm:text-2xl"
```

---

## 📌 Headers Sticky

### Estructura Estándar

```tsx
<div className="min-h-screen bg-gray-50">
  {/* Sticky Header */}
  <div className="bg-white border-b sticky top-0 z-10">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Título y descripción */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Título de la Sección
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Descripción breve
          </p>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Badge del negocio - solo desktop */}
          {business && (
            <Badge className="hidden sm:flex bg-orange-100 text-orange-700 border-orange-200">
              <Building className="w-4 h-4 mr-2" />
              {business.name}
            </Badge>
          )}

          {/* Botón principal */}
          <Button
            onClick={() => setModalOpen(true)}
            className="w-full sm:w-auto bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 shadow-md hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Acción
          </Button>
        </div>
      </div>
    </div>
  </div>

  {/* Main Content */}
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
    {/* Contenido aquí */}
  </div>
</div>
```

### Reglas del Header

1. ✅ Siempre `sticky top-0 z-10`
2. ✅ Background blanco con `border-b`
3. ✅ Max-width consistente: `max-w-7xl`
4. ✅ Layout vertical en mobile, horizontal en desktop
5. ✅ Badge del negocio oculto en mobile
6. ✅ Botón principal full-width en mobile

---

## 🪟 Modales

### Estructura Base

```tsx
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
    <DialogHeader>
      <DialogTitle className="text-lg sm:text-xl font-bold text-gray-900">
        Título del Modal
      </DialogTitle>
      <DialogDescription className="text-sm">
        Descripción breve de la acción
      </DialogDescription>
    </DialogHeader>

    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4 mt-4">
      {/* Campos del formulario */}

      {/* Botones */}
      <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
        <Button type="button" variant="outline" className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" className="flex-1 bg-gradient-to-r from-orange-600 to-amber-600">
          Guardar
        </Button>
      </div>
    </form>
  </DialogContent>
</Dialog>
```

### Reglas de Modales

1. ✅ Ancho: `max-w-[95vw] sm:max-w-2xl` (95% mobile, 2xl desktop)
2. ✅ Alto: `max-h-[90vh] overflow-y-auto` (scroll si es necesario)
3. ✅ Padding: `p-4 sm:p-6` (menos en mobile)
4. ✅ Título: `text-lg sm:text-xl` (más pequeño en mobile)
5. ✅ Botones: `flex-col-reverse sm:flex-row` (primario arriba en mobile)
6. ✅ Espaciado: `space-y-3 sm:space-y-4` (más compacto en mobile)

### Modal de Edición con Eliminar

```tsx
<div className="flex flex-col sm:flex-row gap-2 pt-2">
  {/* Botón Eliminar - izquierda en desktop, abajo en mobile */}
  <Button
    variant="outline"
    onClick={() => setDeleteDialogOpen(true)}
    className="text-red-600 hover:bg-red-50 order-3 sm:order-1"
  >
    <Trash2 className="w-3.5 h-3.5 mr-2" />
    Eliminar
  </Button>

  <div className="flex-1 hidden sm:block" />

  {/* Cancelar */}
  <Button variant="outline" className="order-2">
    Cancelar
  </Button>

  {/* Guardar - arriba en mobile, derecha en desktop */}
  <Button type="submit" className="order-1 sm:order-3">
    Guardar Cambios
  </Button>
</div>
```

---

## ⚠️ Diálogos de Confirmación

### AlertDialog para Acciones Destructivas

```tsx
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

{/* Delete Confirmation Dialog */}
<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
      <AlertDialogDescription>
        Esta acción eliminará permanentemente este elemento. Esta acción no se puede deshacer.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction
        onClick={handleDelete}
        className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
      >
        Eliminar
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Cuándo Usar AlertDialog

- ✅ Eliminar elementos
- ✅ Acciones irreversibles
- ✅ Confirmaciones importantes
- ❌ **NUNCA usar** `alert()` o `confirm()` nativos

---

## 📝 Formularios

### Campo de Texto Estándar

```tsx
<div className="space-y-1.5">
  <Label htmlFor="field_name" className="text-sm font-semibold text-gray-700">
    Nombre del Campo <span className="text-orange-600">*</span>
  </Label>
  <Input
    id="field_name"
    {...register('field_name')}
    placeholder="Placeholder descriptivo..."
    className="h-10 focus:border-orange-500 focus:ring-orange-500"
  />
  {errors.field_name && (
    <div className="flex items-start gap-1.5 p-1.5 bg-red-50 border border-red-200 rounded">
      <AlertCircle className="w-3.5 h-3.5 text-red-600 mt-0.5 flex-shrink-0" />
      <p className="text-xs text-red-700">{errors.field_name.message}</p>
    </div>
  )}
</div>
```

### Campo con Icono

```tsx
<div className="space-y-1.5">
  <Label htmlFor="price" className="text-sm font-semibold text-gray-700">
    Precio <span className="text-orange-600">*</span>
  </Label>
  <div className="relative">
    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
    <Input
      id="price"
      type="number"
      {...register('price')}
      className="pl-10 h-10 focus:border-orange-500 focus:ring-orange-500"
      placeholder="0.00"
    />
  </div>
</div>
```

### Textarea

```tsx
<div className="space-y-1.5">
  <Label htmlFor="description" className="text-sm font-semibold text-gray-700">
    Descripción
  </Label>
  <Textarea
    id="description"
    {...register('description')}
    placeholder="Describe brevemente (opcional)"
    rows={2}
    className="focus:border-orange-500 focus:ring-orange-500 text-sm"
  />
</div>
```

### Select/Dropdown

```tsx
<div className="space-y-1.5">
  <Label htmlFor="duration" className="text-sm font-semibold text-gray-700">
    Duración <span className="text-orange-600">*</span>
  </Label>
  <Select value={value} onValueChange={(val) => setValue('duration', val)}>
    <SelectTrigger className="w-full h-10 focus:border-orange-500 focus:ring-orange-500">
      <div className="flex items-center">
        <Clock className="w-4 h-4 mr-2 text-gray-400" />
        <SelectValue placeholder="Selecciona" />
      </div>
    </SelectTrigger>
    <SelectContent>
      {options.map((option) => (
        <SelectItem key={option.value} value={option.value}>
          {option.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
```

### Switch con Descripción

```tsx
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 p-3 bg-orange-50/50 border border-orange-200 rounded-lg">
  <div>
    <Label htmlFor="is_active" className="text-sm font-semibold text-gray-900">
      Estado
    </Label>
    <p className="text-xs text-gray-600 mt-0.5">
      {isActive ? 'Activo y disponible' : 'Desactivado'}
    </p>
  </div>
  <Switch
    id="is_active"
    checked={isActive}
    onCheckedChange={(checked) => setValue('is_active', checked)}
    className="self-start sm:self-auto"
  />
</div>
```

### Reglas de Formularios

1. ✅ Label con `font-semibold text-gray-700`
2. ✅ Campos requeridos con asterisco naranja: `<span className="text-orange-600">*</span>`
3. ✅ Input height consistente: `h-10` (40px)
4. ✅ Focus state naranja: `focus:border-orange-500 focus:ring-orange-500`
5. ✅ Errores con AlertCircle icon y fondo rojo claro
6. ✅ Placeholders descriptivos
7. ✅ Grid 1 col mobile, 2 cols desktop para campos relacionados

---

## 🎨 Paleta de Colores

### Tema Business (Orange)

```tsx
// Gradientes principales
className="bg-gradient-to-r from-orange-600 to-amber-600"
className="bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600" // 3 colores

// Hover states
className="hover:from-orange-700 hover:to-amber-700"

// Backgrounds
className="bg-orange-50"
className="bg-orange-50/50" // Semi-transparente
className="bg-orange-100"

// Bordes
className="border-orange-200"
className="border-orange-500"

// Text
className="text-orange-600"
className="text-orange-700"

// Badges
className="bg-orange-100 text-orange-700 border-orange-200"
```

### Colores de Estado

```tsx
// Success / Active
className="bg-emerald-100 text-emerald-700 border-emerald-200"
className="text-emerald-600"

// Error / Destructive
className="bg-red-50 border-red-200"
className="text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-300"
className="bg-red-600 hover:bg-red-700" // Botones

// Neutral
className="bg-gray-50"
className="text-gray-600"
className="text-gray-900"
className="border-gray-100"
className="border-gray-200"
```

### Shadows y Effects

```tsx
// Shadows progresivos
className="shadow-sm hover:shadow-md"
className="shadow-md hover:shadow-lg"

// Transitions
className="transition-all duration-200"
className="transition-colors"

// Hover effects en cards
className="hover:shadow-lg transition-all duration-200"
```

---

## 🔤 Tipografía

### Headings

```tsx
// Page Title
<h1 className="text-xl sm:text-2xl font-bold text-gray-900">

// Section Title
<h2 className="text-lg font-semibold text-gray-900">

// Card Title
<CardTitle className="text-lg font-semibold text-gray-900">

// Subsection
<h3 className="text-sm font-semibold text-gray-900">
```

### Body Text

```tsx
// Description
<p className="text-xs sm:text-sm text-gray-600">

// Label
<Label className="text-sm font-semibold text-gray-700">

// Small text
<p className="text-xs text-gray-600">

// Error
<p className="text-xs text-red-700">
```

### Reglas Tipográficas

1. ✅ Headings: `font-bold` o `font-semibold`
2. ✅ Títulos principales: Responsive (`text-xl sm:text-2xl`)
3. ✅ Body text: `text-gray-600`
4. ✅ Headings: `text-gray-900`
5. ✅ Labels: `font-semibold text-gray-700`

---

## ✅ Checklist de Implementación

### Al crear una nueva sección:

#### 1. Header
- [ ] Sticky header con `sticky top-0 z-10`
- [ ] Layout vertical mobile, horizontal desktop
- [ ] Título responsive (`text-xl sm:text-2xl`)
- [ ] Badge del negocio oculto en mobile
- [ ] Botón principal full-width en mobile
- [ ] Max-width consistente: `max-w-7xl`

#### 2. Modales (si aplica)
- [ ] Ancho responsive: `max-w-[95vw] sm:max-w-2xl`
- [ ] Padding responsive: `p-4 sm:p-6`
- [ ] Título responsive: `text-lg sm:text-xl`
- [ ] Grid de campos: `grid-cols-1 sm:grid-cols-2`
- [ ] Botones: `flex-col-reverse sm:flex-row`
- [ ] Espaciado: `space-y-3 sm:space-y-4`

#### 3. Formularios
- [ ] Labels con `font-semibold text-gray-700`
- [ ] Asteriscos naranjas para campos requeridos
- [ ] Input height consistente: `h-10`
- [ ] Focus state naranja
- [ ] Errores con AlertCircle y fondo rojo
- [ ] Placeholders descriptivos

#### 4. Confirmaciones
- [ ] AlertDialog para acciones destructivas
- [ ] NO usar `alert()` o `confirm()` nativos
- [ ] Botón rojo para acciones destructivas
- [ ] Mensaje claro de consecuencias

#### 5. Responsive
- [ ] Probado en mobile (375px)
- [ ] Probado en tablet (768px)
- [ ] Probado en desktop (1440px)
- [ ] Sin scroll horizontal
- [ ] Botones no se salen del viewport
- [ ] Texto legible en todos los tamaños

#### 6. Colores y Estilos
- [ ] Gradient naranja para primarios
- [ ] Sombras consistentes
- [ ] Transitions suaves
- [ ] Hover states definidos
- [ ] Border radius consistente

#### 7. Accesibilidad
- [ ] Labels asociados a inputs (htmlFor)
- [ ] Placeholders descriptivos
- [ ] Errores claros y visibles
- [ ] Contraste adecuado
- [ ] Keyboard navigation funcional

---

## 📖 Ejemplos de Referencia

### Secciones Implementadas

1. **`/dashboard/business/services`** ✅
   - Header sticky responsive
   - Modales create/edit
   - AlertDialog para delete
   - Formularios con validación
   - **USAR COMO REFERENCIA PRINCIPAL**

### Archivos Clave

```
src/
├── app/dashboard/business/services/
│   └── page.tsx                      # ✅ Header sticky pattern
├── components/
│   ├── CreateServiceModal.tsx        # ✅ Modal crear pattern
│   ├── EditServiceModal.tsx          # ✅ Modal editar pattern
│   └── ui/                           # shadcn/ui components
```

---

## 🚀 Próximas Secciones a Implementar

Aplicar estos mismos patrones a:

- [ ] `/dashboard/business/employees`
- [ ] `/dashboard/business/clients`
- [ ] `/dashboard/business/hours`
- [ ] `/dashboard/business/settings/*`
- [ ] Otras secciones del dashboard

---

## 💡 Tips y Buenas Prácticas

### DO ✅

- Usar componentes de shadcn/ui
- Diseñar mobile-first
- Modales para formularios simples
- AlertDialog para confirmaciones
- Gradiente naranja para acciones principales
- Consistencia en spacing y sizing
- Labels descriptivos y claros
- Feedback visual inmediato

### DON'T ❌

- No usar `alert()` o `confirm()`
- No crear páginas para formularios simples
- No asumir espacio horizontal en mobile
- No usar estilos inline sin razón
- No ignorar estados de hover/focus
- No usar colores inconsistentes
- No olvidar validación de formularios
- No esconder errores importantes

---

## 📞 Dudas o Mejoras

Si tienes dudas sobre cómo aplicar estos patrones o sugerencias de mejora, documenta aquí:

- Fecha: [YYYY-MM-DD]
- Sección: [Nombre de la sección]
- Duda/Mejora: [Descripción]
- Resolución: [Cómo se resolvió]

---

**Última revisión:** 2025-01-XX
**Mantenido por:** Equipo de Desarrollo TuTurno
**Versión:** 1.0
