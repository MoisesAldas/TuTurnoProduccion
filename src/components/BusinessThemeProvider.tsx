'use client';

import React, { createContext, useContext, useEffect, useMemo } from 'react';

interface VisualSettings {
  brandColor?: string;
  themeMode?: 'light' | 'dark' | 'system';
  borderRadius?: string;
}

interface BusinessThemeContextType {
  settings: VisualSettings | null;
}

const BusinessThemeContext = createContext<BusinessThemeContextType>({
  settings: null,
});

export function useBusinessTheme() {
  return useContext(BusinessThemeContext);
}

export function BusinessThemeProvider({ 
  settings, 
  children 
}: { 
  settings: VisualSettings | null, 
  children: React.ReactNode 
}) {
  useEffect(() => {
    if (!settings) return;

    const root = document.documentElement;

    // Aplicar Color de Marca (Primary)
    if (settings.brandColor) {
      // Nota: brandColor debe venir en formato HSL "H S% L%" para ser compatible con Tailwind
      root.style.setProperty('--primary', settings.brandColor);
      root.style.setProperty('--ring', settings.brandColor);
      
      // También podemos ajustar el sidebar si es necesario
      root.style.setProperty('--sidebar-ring', settings.brandColor);
    }

    // Aplicar Border Radius
    if (settings.borderRadius) {
      root.style.setProperty('--radius', settings.borderRadius);
    }

    // Cleanup function: opcionalmente resetear a valores por defecto si el componente se desmonta
    // o si los ajustes cambian drásticamente.
    return () => {
      // No reseteamos para evitar parpadeos, pero aquí podríamos volver a los valores por defecto
    };
  }, [settings]);

  const value = useMemo(() => ({ settings }), [settings]);

  return (
    <BusinessThemeContext.Provider value={value}>
      {children}
    </BusinessThemeContext.Provider>
  );
}
