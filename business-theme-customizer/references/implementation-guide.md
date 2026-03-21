# Guía de Implementación: Personalización de Negocio

## 1. Esquema de Base de Datos (Supabase)
Ejecutar este SQL para añadir la capacidad de personalización:

```sql
ALTER TABLE businesses 
ADD COLUMN visual_settings JSONB DEFAULT '{"brandColor": "24 95% 47%", "themeMode": "system", "borderRadius": "0.5rem"}'::JSONB;
```

## 2. BusinessThemeProvider (React)
Este componente inyecta las variables CSS dinámicamente:

```tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

const BusinessThemeContext = createContext({});

export function BusinessThemeProvider({ settings, children }: { settings: any, children: React.ReactNode }) {
  useEffect(() => {
    if (!settings?.brandColor) return;
    
    // Inyectar variables CSS en el elemento raíz o un contenedor específico
    const root = document.documentElement;
    root.style.setProperty('--primary', settings.brandColor);
    root.style.setProperty('--ring', settings.brandColor);
    // Añadir más variables según sea necesario (border-radius, etc.)
  }, [settings]);

  return (
    <BusinessThemeContext.Provider value={settings}>
      {children}
    </BusinessThemeContext.Provider>
  );
}
```

## 3. Utilidad de Conversión
Asegúrate de convertir el Hex del usuario a HSL antes de guardarlo o aplicarlo para que Tailwind funcione correctamente.
- **Input:** `#f97316` (Hex)
- **Output:** `24 95% 47%` (HSL para CSS variables)
