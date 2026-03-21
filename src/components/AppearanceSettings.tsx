'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useTheme } from 'next-themes';
import { Palette, Moon, Sun, Monitor, Save, RefreshCcw, Info } from 'lucide-react';
import { createClient } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';

interface AppearanceSettingsProps {
  businessId: string;
  initialSettings: any;
  onUpdate: () => Promise<void>;
}

export default function AppearanceSettings({ businessId, initialSettings, onUpdate }: AppearanceSettingsProps) {
  const { theme, setTheme } = useTheme();
  const [brandColor, setBrandColor] = useState('#f97316'); // Orange 600 default
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    if (initialSettings?.brandColorHex) {
      setBrandColor(initialSettings.brandColorHex);
    }
  }, [initialSettings]);

  // Función para convertir Hex a HSL compatible con Tailwind
  const hexToHslValues = (hex: string) => {
    hex = hex.replace(/^#/, '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s, l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    } else {
      s = 0;
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  const handleSave = async () => {
    try {
      setSubmitting(true);
      const hslValues = hexToHslValues(brandColor);
      
      const newSettings = {
        ...initialSettings,
        brandColor: hslValues,
        brandColorHex: brandColor,
        themeMode: theme
      };

      const { error } = await supabase
        .from('businesses')
        .update({ visual_settings: newSettings })
        .eq('id', businessId);

      if (error) throw error;

      toast({
        title: 'Apariencia actualizada',
        description: 'Los cambios se han guardado y aplicado correctamente.'
      });

      await onUpdate();
    } catch (error) {
      console.error('Error saving appearance settings:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo guardar la configuración de apariencia.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetToDefault = () => {
    setBrandColor('#f97316');
    setTheme('system');
  };

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-[0_8px_30px_rgba(0,0,0,0.03)] dark:bg-gray-900 rounded-[2rem] overflow-hidden">
        <CardHeader className="px-6 pt-6 pb-2">
          <div className="flex flex-col gap-0.5 relative pl-5">
            <div className="absolute left-0 w-1 h-6 bg-primary rounded-full mt-0.5" />
            <span className="text-[9px] uppercase tracking-[0.2em] font-extrabold text-primary">
              Personalización
            </span>
            <CardTitle className="text-xl font-black tracking-tight text-gray-900 dark:text-white">
              Identidad Visual del Dashboard
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-6 space-y-8">
          
          {/* Color de Marca */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-bold text-gray-900 dark:text-white">Color de Marca</Label>
                <p className="text-xs text-gray-500">Este color se usará en botones, estados activos y elementos destacados.</p>
              </div>
              <div 
                className="w-12 h-12 rounded-xl border-4 border-white dark:border-gray-800 shadow-lg"
                style={{ backgroundColor: brandColor }}
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="relative group">
                  <input
                    type="color"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="h-12 w-full rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex items-center justify-center gap-3 px-4 transition-all group-hover:border-primary">
                    <Palette className="w-5 h-5 text-gray-400 group-hover:text-primary" />
                    <span className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-400 group-hover:text-primary">
                      {brandColor.toUpperCase()}
                    </span>
                  </div>
               </div>
               
               <div className="flex items-center gap-2">
                 {['#f97316', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6'].map((color) => (
                   <button
                    key={color}
                    onClick={() => setBrandColor(color)}
                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${brandColor === color ? 'border-gray-900 dark:border-white' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                   />
                 ))}
               </div>
            </div>
          </div>

          <hr className="border-gray-100 dark:border-gray-800" />

          {/* Modo de Tema */}
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-bold text-gray-900 dark:text-white">Modo de Interfaz</Label>
              <p className="text-xs text-gray-500">Selecciona cómo prefieres ver el panel de control.</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'light', label: 'Claro', icon: Sun },
                { id: 'dark', label: 'Oscuro', icon: Moon },
                { id: 'system', label: 'Sistema', icon: Monitor },
              ].map((mode) => {
                const Icon = mode.icon;
                const isActive = theme === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => setTheme(mode.id)}
                    className={`
                      flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all
                      ${isActive 
                        ? 'border-primary bg-primary/5 text-primary shadow-sm' 
                        : 'border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 text-gray-400 hover:border-gray-200'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">{mode.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Información de Aislamiento */}
          <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-800/30 rounded-2xl flex items-start gap-4">
            <div className="w-8 h-8 rounded-lg bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm flex-shrink-0">
              <Info className="w-4 h-4 text-blue-600" />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-blue-950 dark:text-blue-200 uppercase tracking-widest">Información de Diseño</p>
              <p className="text-[10px] font-medium text-blue-800/80 dark:text-blue-300/80 leading-tight">
                Estos cambios son puramente estéticos y solo afectan a tu panel de administración. No interfieren con la lógica de tus citas ni con los datos de tus clientes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Bar */}
      <div className="sticky bottom-4 z-20 flex justify-end">
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-100 dark:border-gray-800 p-1.5 rounded-xl shadow-2xl flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={resetToDefault}
            className="h-9 px-4 rounded-lg text-xs font-bold text-gray-500 hover:text-gray-700"
          >
            <RefreshCcw className="w-3.5 h-3.5 mr-2" />
            Restablecer
          </Button>
          <Button
            onClick={handleSave}
            disabled={submitting}
            className="h-9 px-6 rounded-lg bg-primary hover:opacity-90 text-white text-xs font-bold shadow-lg transition-all active:scale-95"
          >
            {submitting ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5 mr-2" />
                Guardar Cambios de Estilo
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
