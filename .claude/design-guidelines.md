# Design Guidelines - TuTurno

> **Filosofía de Diseño:** Minimalista, Elegante, Profesional
>
> Inspiración: Apple, Linear, Stripe - Clean aesthetics con enfoque B2B SaaS

---

## 🎨 Sistema de Colores (Dual Theme)

### Cliente (Verde)
```css
/* Gradiente Principal */
from-emerald-600 via-teal-600 to-cyan-600

/* Botones Primarios */
from-emerald-500 to-teal-600

/* Botones Secundarios */
from-teal-500 to-cyan-600

/* Backgrounds Sutiles */
from-emerald-50 to-teal-50

/* Bordes y Acentos */
border-emerald-200
text-emerald-700
hover:bg-emerald-50
```

### Negocio (Naranja)
```css
/* Gradiente Principal */
from-orange-600 via-amber-600 to-yellow-600

/* Botones Primarios */
from-orange-500 to-amber-600

/* Botones Secundarios */
from-amber-500 to-yellow-600

/* Backgrounds Sutiles */
from-orange-50 to-amber-50

/* Bordes y Acentos */
border-orange-200
text-orange-700
hover:bg-orange-50
```

---

## 📐 Layout Pattern: Split-Screen

### Estructura Base
```jsx
<div className="min-h-screen flex">
  {/* Left Panel - Visual (Desktop only) */}
  <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[color] p-12">
    {/* Decorative elements */}
    {/* Back button */}
    {/* Content */}
    {/* Logo */}
  </div>

  {/* Right Panel - Form/Content */}
  <div className="w-full lg:w-1/2 bg-white p-6">
    {/* Mobile back button */}
    {/* Header */}
    {/* Content */}
  </div>
</div>
```

### Elementos Decorativos
```jsx
{/* Decorative blurred circles */}
<div className="absolute top-20 right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
<div className="absolute bottom-20 left-20 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
```

---

## ✨ Animaciones

### Entrada de Página (Page Load)
```jsx
const [isVisible, setIsVisible] = useState(false)

useEffect(() => {
  const timer = setTimeout(() => setIsVisible(true), 100)
  return () => clearTimeout(timer)
}, [])

// Panel Izquierdo
className={`transition-all duration-1000 ${
  isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
}`}

// Panel Derecho
className={`transition-all duration-1000 ${
  isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
}`}
```

### Hover States (Tarjetas/Botones)
```css
/* Tarjetas Interactivas */
hover:-translate-y-1        /* Elevación */
hover:shadow-lg             /* Sombra */
group-hover:scale-110       /* Escala de iconos */
group-hover:translate-x-1   /* Desplazamiento de flechas */
transition-all duration-300 /* Velocidad rápida */
```

---

## 🔤 Tipografía

### Jerarquía de Tamaños
```css
/* Headers Principales (Left Panel) */
text-5xl font-bold          /* Títulos grandes */
text-xl text-white/80       /* Descripciones */
text-lg font-medium         /* Benefits */

/* Headers Secundarios (Right Panel) */
text-3xl font-bold          /* Títulos de sección */
text-2xl font-bold          /* Títulos de página */
text-xl font-bold           /* Títulos de tarjetas */
text-sm text-gray-600       /* Descripciones */
text-xs text-gray-600       /* Labels pequeños */
```

### Colores de Texto
```css
text-gray-900               /* Títulos principales */
text-gray-600               /* Texto secundario */
text-gray-500               /* Texto terciario/footer */
text-white                  /* Texto en gradientes */
text-white/80               /* Texto secundario en gradientes */
```

---

## 🎯 Componentes Clave

### Tarjetas Interactivas (Auth Options)
```jsx
<Link href="/path">
  <div className="group cursor-pointer bg-white border-2 border-gray-200 rounded-xl py-8 px-6 hover:border-[color]-500 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
    <div className="flex items-center gap-4">
      {/* Icono con gradiente */}
      <div className="w-14 h-14 bg-gradient-to-r from-[color] rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
        <Icon className="w-7 h-7 text-white" />
      </div>

      {/* Contenido */}
      <div className="flex-1">
        <h3 className="text-xl font-bold text-gray-900 mb-1">Título</h3>
        <p className="text-sm text-gray-600">Descripción</p>
      </div>

      {/* Flecha */}
      <div className="text-[color]-600 text-2xl group-hover:translate-x-1 transition-transform duration-300">
        →
      </div>
    </div>
  </div>
</Link>
```

### Badges/Pills
```jsx
<div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
  <Icon className="w-5 h-5 text-white" />
  <span className="text-white font-medium">Texto</span>
</div>
```

### Benefits List
```jsx
<div className="space-y-3 pt-4">
  {benefits.map((benefit, index) => (
    <div key={index} className="flex items-center gap-3 text-white/90">
      <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
        {benefit.icon}
      </div>
      <span className="text-lg font-medium">{benefit.text}</span>
    </div>
  ))}
</div>
```

---

## 📝 Forms

### Espaciado sin Scroll
```css
/* Contenedor Principal */
p-6 space-y-4 py-2          /* Outer container */

/* Formulario */
space-y-3                   /* Entre campos */

/* Grid de 2 Columnas (Nombre/Apellido) */
grid grid-cols-2 gap-3

/* Campos Individuales */
space-y-1                   /* Label → Input → Error */
```

### Inputs
```jsx
{/* Campo con Icono */}
<div className="space-y-1">
  <Label htmlFor="field" className="text-sm font-medium text-gray-700">
    Label *
  </Label>
  <div className="relative">
    <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
    <Input
      id="field"
      type="text"
      placeholder="Placeholder"
      className="pl-10 h-10 border-gray-300 focus:border-[color]-500 focus:ring-[color]-500"
    />
  </div>
  {errors.field && (
    <p className="text-xs text-red-600">{errors.field.message}</p>
  )}
</div>
```

### Botones de Acción (Dos Columnas)
```jsx
{/* Submit + OAuth lado a lado */}
<div className="grid grid-cols-2 gap-3">
  <Button type="submit" className="h-10 bg-gradient-to-r from-[color]">
    <Icon className="w-4 h-4" />
  </Button>

  <Button variant="outline" type="button" className="h-10 border-2">
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      {/* Google icon */}
    </svg>
  </Button>
</div>
```

### Footer Links (Dos Columnas)
```jsx
<div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200">
  <div className="text-center">
    <p className="text-xs text-gray-600 mb-1">¿Pregunta?</p>
    <Link href="/path" className="text-sm text-[color]-600 hover:text-[color]-700 font-semibold">
      Acción
    </Link>
  </div>
  {/* Repetir para segunda columna */}
</div>
```

---

## 🎭 Estados y Feedback

### Alert Messages
```jsx
{error && (
  <Alert variant="destructive" className="border-red-200 bg-red-50">
    <AlertDescription className="text-red-700">
      {error}
    </AlertDescription>
  </Alert>
)}
```

### Loading States
```jsx
{loading ? (
  <>
    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
  </>
) : (
  <>
    <Icon className="w-4 h-4" />
  </>
)}
```

### Password Strength Indicator
```jsx
{password && (
  <div className="flex items-center gap-1">
    <div className="flex-1 bg-gray-200 rounded-full h-1">
      <div
        className={`h-1 rounded-full transition-all duration-300 ${passwordStrength.color}`}
        style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
      />
    </div>
    <span className="text-xs text-gray-600">{passwordStrength.text}</span>
  </div>
)}
```

---

## 📱 Responsive Design

### Breakpoints
```css
/* Mobile First Approach */
default                     /* Mobile */
lg:                        /* Desktop (1024px+) */

/* Ocultar en Mobile */
hidden lg:flex             /* Solo desktop */

/* Ocultar en Desktop */
lg:hidden                  /* Solo mobile */
```

### Mobile Adjustments
```jsx
{/* Mobile Logo */}
<div className="lg:hidden mb-4">
  <Logo color="black" size="lg" />
</div>

{/* Mobile Back Button */}
<div className="lg:hidden">
  <Link href="/">
    <Button variant="ghost" size="sm">
      <ArrowLeft className="w-4 h-4 mr-2" />
      Volver
    </Button>
  </Link>
</div>
```

---

## 🚫 Anti-Patrones (No Usar)

❌ **Evitar:**
- Scroll en páginas de auth (optimizar para viewport completo)
- Pasos de progreso (1-2-3) en páginas de selección inicial
- Texto con emojis (a menos que el usuario lo solicite)
- Animaciones muy lentas (>1000ms para elementos individuales)
- Gradientes en todo (solo en paneles laterales y botones clave)
- Sombras excesivas
- Bordes muy gruesos (max: border-2)

✅ **Preferir:**
- Espaciado generoso (space-y-4, space-y-6)
- Animaciones suaves y rápidas (300ms-1000ms)
- Minimalismo funcional
- Consistencia de colores (verde=cliente, naranja=negocio)
- Jerarquía visual clara
- Feedback inmediato en interacciones

---

## 🔧 Utilidades Comunes

### Espaciado Estándar
```css
space-y-1                   /* Entre label/input/error */
space-y-2                   /* Entre campos relacionados */
space-y-3                   /* Entre secciones del form */
space-y-4                   /* Entre secciones principales */
space-y-6                   /* Entre tarjetas grandes */

gap-3                       /* Grid spacing */
gap-4                       /* Flex spacing */

p-6                        /* Padding de contenedores */
py-8 px-6                  /* Padding de tarjetas (más vertical) */
```

### Bordes y Sombras
```css
border-2                    /* Bordes normales */
border-gray-200            /* Color neutro */
border-[color]-200         /* Color temático */

shadow-md                   /* Sombra de iconos */
shadow-lg                   /* Sombra en hover */
shadow-xl                   /* Sombra de cards */

rounded-xl                  /* Bordes redondeados grandes */
rounded-lg                  /* Bordes redondeados medianos */
rounded-full               /* Pills/badges */
```

### Efectos Visuales
```css
backdrop-blur-sm           /* Blur sutil */
blur-3xl                   /* Blur decorativo */

bg-white/10                /* Background semi-transparente */
text-white/80              /* Texto semi-transparente */

transition-all duration-300 /* Transiciones rápidas */
transition-all duration-1000 /* Transiciones de página */
```

---

## 📚 Referencias Rápidas

### Páginas Implementadas con este Sistema

✅ **Páginas de Selección:**
- `src/app/auth/client/page.tsx`
- `src/app/auth/business/page.tsx`

✅ **Páginas de Login:**
- `src/app/auth/client/login/page.tsx`
- `src/app/auth/business/login/page.tsx`

✅ **Páginas de Registro:**
- `src/app/auth/client/register/page.tsx`
- `src/app/auth/business/register/page.tsx`

✅ **Páginas de Setup:**
- `src/app/auth/client/setup/page.tsx` (si existe)
- `src/app/auth/business/setup/page.tsx`

### Iconos Recomendados (lucide-react)

**Cliente:**
- `Sparkles` - Bienvenida/magia
- `Star` - Beneficios/destacado
- `CheckCircle` - Confirmación/completado
- `LogIn` - Inicio de sesión
- `UserPlus` - Registro

**Negocio:**
- `Building` - Negocios
- `TrendingUp` - Crecimiento
- `CheckCircle` - Confirmación
- `LogIn` - Inicio de sesión
- `UserPlus` - Registro

**Común:**
- `ArrowLeft` - Navegación atrás
- `Mail` - Email
- `Lock` - Password
- `User` - Nombre/Usuario
- `Eye` / `EyeOff` - Toggle password

---

## 🎯 Checklist de Diseño

Antes de considerar una página completa, verificar:

- [ ] Split-screen implementado (desktop)
- [ ] Gradientes solo en left panel y botones principales
- [ ] Animaciones de entrada suaves (opacity + translate)
- [ ] Hover states en todos los elementos interactivos
- [ ] Sin scroll necesario para completar acción principal
- [ ] Espaciado generoso pero balanceado
- [ ] Colores consistentes con el tema (verde/naranja)
- [ ] Mobile responsive con logo y back button
- [ ] Tipografía jerárquica clara
- [ ] Estados de loading/error implementados
- [ ] Validación de forms con feedback visual
- [ ] Transiciones entre páginas fluidas

---

**Última actualización:** 2025-01-20
**Versión:** 1.0
**Estilo:** Minimalista, Elegante, Profesional
