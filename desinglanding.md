# Requerimiento UI/UX – Landing Page con Animaciones por Scroll

## Objetivo
Quiero implementar una landing page con animaciones activadas por scroll, enfocada únicamente en mejoras visuales (UI/UX).  
No se debe modificar la lógica del sistema ni la estructura funcional existente.  
Los cambios deben aplicarse exclusivamente a estilos, animaciones y experiencia visual.

---

## Comportamiento Deseado

### 1. Animaciones activadas por scroll
- Cada sección debe aparecer progresivamente al hacer scroll.
- El comportamiento debe simular una experiencia tipo diapositivas.
- Los elementos deben activarse cuando entren en el viewport.

### 2. Tipos de animaciones
- Fade-in (opacity: 0 → 1)
- Slide-up (translateY positivo → 0)
- Transiciones suaves entre secciones
- Duración aproximada: 0.5s a 0.8s
- Easing suave (ease-out o cubic-bezier moderno)

### 3. Efectos adicionales
- Parallax sutil en fondos o elementos decorativos
- Scroll fluido y moderno
- Sensación premium tipo storytelling

### 4. Experiencia visual
- Estilo similar a páginas tecnológicas modernas (tipo Apple o Stripe)
- Sensación limpia, minimalista y profesional
- Animaciones suaves, no agresivas
- No sobrecargar con efectos excesivos

## 5. Comportamiento de la Barra de Navegación (Navbar)

La barra de navegación debe tener un comportamiento dinámico al hacer scroll.

### Estado inicial:
- Navbar normal, alineada en la parte superior.
- Ocupa el ancho completo.
- Sin efecto flotante.

### Al hacer scroll:
- La navbar debe reducir ligeramente su tamaño (shrink effect).
- Debe adquirir bordes redondeados.
- Debe separarse visualmente de los bordes de la pantalla.
- Debe parecer flotante sobre el contenido.
- Puede incluir un fondo ligeramente translúcido (glass effect sutil).
- Debe acompañar el scroll suavemente, sin saltos bruscos.

### Sensación buscada:
Un efecto moderno y premium, similar al comportamiento de navegación en páginas tecnológicas avanzadas.

---

## Restricciones para la Navbar

- ❌ No modificar enlaces ni funcionalidad.
- ❌ No cambiar colores actuales.
- ❌ No alterar tipografía.
- ❌ No modificar la lógica de navegación.

- ✅ Solo aplicar efectos visuales y animaciones.
- ✅ Mantener identidad visual existente.

## 6. Responsividad

Todo el diseño y las animaciones deben ser completamente responsivas.

### Requisitos:

- ✅ Adaptarse correctamente a:
  - Desktop
  - Laptop
  - Tablet
  - Mobile

- ✅ Las animaciones deben mantenerse fluidas en todos los dispositivos.
- ✅ No deben romper el layout en pantallas pequeñas.
- ✅ La navbar flotante debe adaptarse correctamente en mobile.
- ✅ El efecto de scroll debe sentirse natural también en dispositivos táctiles.

### Consideraciones:

- En mobile, las animaciones deben ser más sutiles si es necesario para mantener rendimiento.
- No deben generarse saltos de layout (layout shift).
- Mantener coherencia visual en todas las resoluciones.

---

## Restricciones Generales Finales

- ❌ No modificar lógica del sistema.
- ❌ No alterar funciones existentes.
- ❌ No cambiar colores.
- ❌ No modificar tipografía.
- ❌ No alterar estructura de datos.

- ✅ Solo aplicar mejoras visuales y animaciones.
- ✅ Mantener identidad visual actual.
- ✅ Garantizar diseño totalmente responsivo.

## 7. Referencia de Estilo Específico

Quiero que el estilo visual de la landing page sea similar al ejemplo de referencia proporcionado:

🔗 https://dribbble.com/shots/24788574-Prodmast-Manufacturing-Landing-Page

### Esto significa:

- Estilo moderno, limpio, profesional y orientado a producto
- Uso de secciones amplias y espaciadas
- Jerarquía clara en tipografía y contenido
- Uso inteligente de tarjetas, ilustraciones y espacios blancos
- Transiciones suaves entre secciones
- Animaciones progresivas al hacer scroll (reveal / slide-in / fade-in)
- Sensación premium y consistente con marcas tecnológicas
- Diseño que prioriza claridad y foco de atención

### Importante:

- La referencia sirve **solo como guía visual y de estructura**
- ❌ No debe copiarse literalmente
- ❌ No debe cambiarse la paleta de colores actual del proyecto
- ❌ No debe modificarse la tipografía actual del proyecto

### Lo que SI debe tomarse de la referencia:

- Layout de secciones (bloques bien definidos)
- Composición visual (espaciados, tamaños proporcionales)
- Tipo de animaciones por scroll
- Nivel de sofisticación visual sin romper identidad actual
## 8. Estilo Visual Basado en Referencia Prodmast

El estilo visual de la landing page debe estar inspirado en el diseño de la referencia:

🔗 https://dribbble.com/shots/24788574-Prodmast-Manufacturing-Landing-Page

### Qué debería transmitir este estilo:

- Diseño moderno, profesional y orientado a producto tecnológico
- Secciones bien definidas con espaciado amplio
- Jerarquía visual clara y limpia
- Uso de componentes visuales grandes (hero, tarjetas de features, iconografía)
- Animaciones suaves y progresivas (reveal, fade-in, slide)
- Experiencia visual tipo SaaS / B2B premium
- Estructura escalable para múltiples secciones (hero, features, beneficios, CTA)
- Inspiración visual sin copiar literalmente

### Importante

Este estilo sirve como guía visual de referencia, por lo que:

- ❌ No debe copiar la paleta de colores del ejemplo
- ❌ No debe cambiar la tipografía actual
- ❌ No debe alterar el branding actual

El diseño debe adaptarse a la identidad visual existente, tomando como inspiración la composición, espaciado, tamaños y ritmo visual de la referencia indicada.

---

## Uso de Imagen de Referencia

Si proporciono una imagen como guía:

- Debe utilizarse únicamente como referencia de:
  - Distribución
  - Posicionamiento
  - Tamaños
  - Proporciones
  - Espaciado
  - Formas generales

- ❌ No cambiar los colores actuales del sitio
- ❌ No modificar la paleta de marca existente
- ❌ No alterar la tipografía actual
- ❌ No cambiar el tipo de letra

Se debe mantener:
- Los colores actuales del sistema
- La tipografía actual del proyecto
- El branding existente

La imagen enviada es solo una guía estructural, no un rediseño visual completo.

---

## Restricciones Importantes

- ❌ No modificar la lógica del sistema
- ❌ No alterar funciones existentes
- ❌ No cambiar estructura de datos
- ❌ No afectar comportamiento del backend

- ✅ Solo modificar estilos (CSS, animaciones y efectos visuales)
- ✅ Mantener coherencia con el diseño actual
- ✅ Respetar identidad visual existente

---

## Resultado Esperado

Una landing page moderna, fluida y profesional, donde el contenido se revele progresivamente mientras el usuario hace scroll, generando una experiencia tecnológica y atractiva sin alterar la funcionalidad, colores ni tipografía actual del sistema.
