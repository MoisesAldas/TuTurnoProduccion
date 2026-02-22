# TuTurno: Guía de Estilo Premium SaaS

Este documento define los principios de diseño aplicados al rediseño del Dashboard (Febrero 2024), con el objetivo de mantener una estética de alta gama, moderna y profesional ("Modern SaaS" / "Soft Minimalism").
IMPORTANTE: Solo diseñar la interfaz de usuario, no la lógica de negocio.
IMPORTANTE: Diseño responsivo adaptativo para dispositivos móviles.
NO quitar nada que ya exista en el código.

## 1. Arquitectura de "Capas" y Elevación

En lugar de usar bordes rígidos, el diseño se basa en la profundidad visual.

- **Bordes**: Eliminar `border` o `border-gray-200`. Usar `border-0`.
- **Sombras (Shadows)**: Usar sombras muy difusas y ligeras para crear un efecto flontante.
  - _Clase recomendada:_ `shadow-[0_8px_30px_rgb(0,0,0,0.04)]` (para modo claro).
- **Redondeado (Border Radius)**: Evitar esquinas cuadradas.
  - _Clase recomendada:_ `rounded-3xl` o `rounded-[2.5rem]` (40px) para contenedores grandes.

## 2. Tipografía y Jerarquía Premium

La organización visual debe sentirse aireada y estructurada sin necesidad de líneas divisorias.

### Secciones de Página

Para los encabezados de sección, usar el patrón **"Eyebrow + Title"**:

- **Eyebrow (Ceja)**: Texto pequeño, en mayúsculas, negrita extrema y mucho espaciado entre letras.
  - _Clase:_ `text-[10px] items-center uppercase tracking-[0.2em] font-extrabold text-orange-600`
- **Barra de Acento**: Una barra vertical a la izquierda con degradado y brillo sutil.
  - _Clase:_ `absolute left-0 w-1.5 h-10 bg-gradient-to-b from-orange-500 to-orange-600 rounded-full shadow-[0_0_12px_rgba(251,146,60,0.3)]`
- **Título**: Grande, pesado y con poco espaciado entre letras para un look moderno.
  - _Clase:_ `text-2xl font-extrabold tracking-tight`

### Layout del Header (Consistente)

- **Estructura Requerida**:
  - **Izquierda**: `Badge` tipo "Eyebrow" arriba de un `h1` (Título) acompañado de un mini-contenedor con icono.
  - **Derecha**: Área de acciones con botones de estilo `rounded-2xl` y alto contraste (`bg-slate-900`).
- **Integrado**: Los encabezados de página deben estar integrados en el flujo de la página (`p-6` o `py-8`) para mantener una navegación limpia.
- **Sin Sombras**: Evitar fondos sólidos con sombras en el header superior.
- **Alineación**: Usar `px-6` universal tanto para el Header como para el contenido principal `main` para garantizar una rejilla vertical perfecta.

### Gestión de Alturas y Scroll

- **No Hardcoded Heights**: Prohibido usar `h-[calc(100vh-120px)]` o similares para el contenedor principal.
- **Flex-1 Strategy**: El layout principal del Dashboard ya provee un contenedor flexible. Usar `flex flex-col h-full overflow-hidden` en el contenedor raíz de la página y `flex-1` en el área de contenido para que se expanda automáticamente a llenar el espacio disponible (evitando huecos blancos).

## 3. Gráficos Minimalistas (Analytics)

Los datos deben ser los protagonistas.

- **Fondo**: Eliminar `CartesianGrid` (cuadrículas).
- **Ejes**: Usar colores muy tenues como `text-[#94a3b8]`.
- **Glow & Gradients**:
  - Usar `AreaChart` con un `linearGradient` que baje de opacidad (15% -> 0%).
  - Para barras (`Bar`), usar `radius={[0, 12, 12, 0]}` para bordes curvos.
- **Transparencia**: Usar `stroke="transparent"` en elementos de gráficos para que el color de fondo fluya.

## 5. Formularios y Controles Compactos

Los formularios deben sentirse densos pero legibles, optimizando el espacio vertical.

- **Inputs y Selects**: Usar una altura estándar de `h-10` y bordes redondeados `rounded-xl`. Fondo suave `bg-gray-50/50`.
- **Labels (Etiquetas)**: Pequeñas, en mayúsculas y negrita extrema.
  - _Clase:_ `text-[10px] font-black uppercase tracking-widest text-gray-400`
- **Interruptores (Switches)**: Escalar ligeramente (`scale-110`) para facilitar la interacción táctil en móviles.

## 6. Barra de Acciones Persistente (Sticky Action Bar)

Para formularios largos, las acciones principales deben estar siempre accesibles.

- **Diseño**: Un contenedor flotante, con desenfoque de fondo (glassmorphism) y bordes muy redondeados.
- **Clase**: `sticky bottom-4 z-20 flex justify-end bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-100 dark:border-gray-800 p-1.5 rounded-xl shadow-2xl gap-2`

## 7. Botones Premium (Call to Action)

- **Save Button**: `h-9 px-6 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-lg transition-all active:scale-95`.
- **Ghost/Neutral**: `h-9 px-4 rounded-lg text-xs font-bold text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all`.
- **REGLA DE ORO (Contraste en Hover)**: Es **MANDATORIO** que si un elemento cambia de fondo al hacer hover (ej: `hover:bg-slate-100`), se defina también el color del texto (ej: `hover:text-slate-900`). **NUNCA** dejar que el color del texto sea implícito, ya que esto suele romper la legibilidad en interfaces premium.

## 8. Escalas de Tipografía y Espaciado (Standard SaaS)

Para garantizar la "consistencia" absoluta entre las interfaces de Cliente y Negocio, usar estrictamente las siguientes clases:

### Tipografía de Encabezado

- **Título de Página (Main)**: `text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-gray-900`
- **Título de Sección**: `text-2xl font-extrabold tracking-tight text-gray-900`
- **Título de Card**: `text-lg font-black text-slate-900 tracking-tight`
- **Eyebrow (Ceja)**: `text-[10px] uppercase tracking-[0.2em] font-extrabold text-slate-400 border-slate-200` (Estandarizar a Slate para un look más serio en dashboard).

## 11. Integridad del Código y Funcionalidad (REGLA DE ORO)

- **Preservación Obligatoria**: Durante cualquier rediseño o ajuste estético, **ESTÁ PROHIBIDO** eliminar lógica existente, botones de acción, diálogos o configuraciones a menos que el USUARIO lo pida explícitamente.
- **Mapeo de Funcionalidades**: Antes de aplicar un nuevo layout, se debe identificar cada interacción (engagement) existente y asegurar que tenga un lugar en la nueva interfaz.
- **Detección de "Código Huérfano"**: Si un componente de diálogo o estado existe en el archivo, su activador (trigger/botón) **DEBE** permanecer visible y funcional en la interfaz. No se debe "limpiar" funcionalidad para ganar estética.
- **Badges de Estado**: Usar estados reales (ej: "Estado Activo") con animaciones de pulso (`pulse`) para indicar vida en la interfaz. Color: `emerald` para activo, `rose` para acción requerida.

### Métricas y KPIs

- **Valor Principal**: `text-2xl font-black tracking-tight text-gray-900`
- **Etiqueta de Métrica**: `text-[10px] uppercase tracking-[0.1em] font-extrabold text-gray-400`
- **Descripción/Nota**: `text-xs font-medium text-gray-500`

### Espaciado y Contenedores

- **Padding Global de Página**: `px-6 py-6`
- **Padding de Card Estándar**: `p-6`
- **Gap entre Cards**: `gap-6` (Desktop) / `gap-4` (Mobile)
- **Radio de Borde (Rounding)**:
  - Cards de Métricas: `rounded-[2rem]`
  - Contenedores de Sección/Hero: `rounded-3xl`
  - Botones/Inputs: `rounded-xl`

---

_Nota: Este estilo está inspirado en plataformas como Stripe, Linear y las nuevas interfaces de Apple._
