---
name: business-theme-customizer
description: Guía y herramientas para implementar la personalización visual (colores de marca, temas claro/oscuro) en el dashboard de negocios de TuTurno. Úsala cuando necesites añadir configuraciones visuales dinámicas que afecten solo a la interfaz de un negocio específico.
---

# Business Theme Customizer

Esta skill proporciona el flujo de trabajo para permitir que los negocios personalicen la apariencia de su dashboard.

## ⚠️ Mandatos de Seguridad y Alcance (CRÍTICO)

- **Aislamiento Visual Absoluto:** Esta skill y cualquier implementación derivada **SOLO** pueden modificar aspectos visuales (variables CSS, colores, bordes).
- **Prohibición de Lógica:** No se debe modificar, inyectar o alterar ninguna lógica de negocio, validaciones de formularios, procesos de reserva o seguridad de la aplicación.
- **Integridad del DOM:** La inyección de estilos debe ser no invasiva y limitada a variables de Tailwind (HSL). No se permite el uso de `!important` que rompa la accesibilidad o la estructura del layout.

## Flujo de Trabajo

### 1. Preparación de Datos
Asegúrate de que la tabla `businesses` tenga la columna `visual_settings`. Consulta `references/implementation-guide.md` para el SQL necesario.

### 2. Conversión de Colores
Tailwind requiere valores HSL individuales para las variables CSS. Usa el script incluido para convertir colores hexadecimales:
```bash
node scripts/hex-to-hsl.cjs #FF5733
```

### 3. Implementación del Proveedor
Envuelve las rutas del dashboard con el `BusinessThemeProvider`. Este componente se encarga de inyectar las variables CSS en el DOM.
Ver detalles en: `references/implementation-guide.md`

### 4. Configuración en la UI
Implementa un formulario en la configuración del negocio que:
- Use un selector de color.
- Convierta el valor a HSL antes de guardarlo en Supabase.
- Actualice el estado global del tema.

## Recursos Incluidos
- **`scripts/hex-to-hsl.cjs`**: Utilidad de conversión de color.
- **`references/implementation-guide.md`**: Guía técnica detallada con SQL y código React.
