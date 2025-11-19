# Overlapping Appointments Feature

## 📝 Descripción

Permite a los negocios desactivar la validación de conflictos de horarios para casos especiales como:
- Aplicación de tinte con tiempo de espera (salones de belleza)
- Servicios que requieren pausas entre pasos
- Múltiples clientes atendidos simultáneamente por un empleado

## 🚀 Instalación

### 1. Aplicar migración

En Supabase SQL Editor, ejecuta:

```sql
-- Aplica los cambios
-- File: Database/add_overlapping_appointments.sql
```

### 2. Rollback (si necesitas revertir)

```sql
-- Revierte los cambios
-- File: Database/add_overlapping_appointments_down.sql
```

## 🔧 Configuración

### Activar para un negocio específico

```sql
UPDATE businesses
SET allow_overlapping_appointments = TRUE
WHERE id = '<business_id>';
```

### Desactivar

```sql
UPDATE businesses
SET allow_overlapping_appointments = FALSE
WHERE id = '<business_id>';
```

## 🎨 UI (Opcional - No implementado aún)

Para agregar toggle en Advanced Settings:

**Archivo:** `src/app/dashboard/business/settings/advanced/page.tsx`

**Tab "Restricciones":** Agregar checkbox:

```tsx
<div className="flex items-center justify-between">
  <div className="space-y-1">
    <Label>Permitir citas superpuestas</Label>
    <p className="text-sm text-gray-500">
      Desactiva la validación de conflictos. Útil para servicios con tiempos de espera (tintes, etc.)
    </p>
  </div>
  <Switch
    checked={allowOverlapping}
    onCheckedChange={setAllowOverlapping}
  />
</div>
```

## ⚡ Cómo funciona

### Antes (con validación):
```
❌ Empleada tiene cita 1:00 PM - 3:00 PM
❌ No puede tener otra cita 1:30 PM - 2:00 PM
Error: "El empleado ya tiene una cita en ese horario"
```

### Después (con overlapping activado):
```
✅ Empleada tiene cita 1:00 PM - 3:00 PM (aplicar tinte + espera)
✅ PUEDE tener otra cita 1:30 PM - 2:00 PM (corte rápido durante espera)
Sin errores, ambas citas coexisten
```

## 🔐 Seguridad

- **Granular:** Cada negocio decide su configuración
- **Default seguro:** `FALSE` (mantiene validación por defecto)
- **Retrocompatible:** No afecta negocios existentes
- **RLS compatible:** La función usa `NEW.business_id` que ya está disponible en el trigger

## 📊 Performance

- **Costo:** +1 SELECT a tabla `businesses` (indexada por PK)
- **Impacto:** < 1ms adicional por INSERT/UPDATE
- **Trigger:** Ejecuta BEFORE INSERT/UPDATE (no afecta latencia percibida)

## 🧪 Testing

### Test 1: Negocio con overlapping desactivado (default)

```sql
-- Negocio con allow_overlapping_appointments = FALSE
INSERT INTO appointments (...) VALUES (...); -- 1:00 PM - 2:00 PM
INSERT INTO appointments (...) VALUES (...); -- 1:30 PM - 2:30 PM
-- ❌ ERROR: "El empleado ya tiene una cita en ese horario"
```

### Test 2: Negocio con overlapping activado

```sql
-- Activar overlapping
UPDATE businesses SET allow_overlapping_appointments = TRUE WHERE id = '...';

-- Insertar citas superpuestas
INSERT INTO appointments (...) VALUES (...); -- 1:00 PM - 2:00 PM
INSERT INTO appointments (...) VALUES (...); -- 1:30 PM - 2:30 PM
-- ✅ SUCCESS: Ambas citas creadas sin error
```

### Test 3: Rollback

```sql
-- Aplicar rollback
-- File: add_overlapping_appointments_down.sql

-- Verificar que la columna ya no existe
SELECT allow_overlapping_appointments FROM businesses; -- ❌ ERROR: column does not exist
```

## 📌 Notas

- Esta feature **NO** afecta la UI del calendario (sigue mostrando todas las citas)
- Solo afecta la **validación del trigger** en el backend
- El negocio sigue siendo responsable de gestionar su tiempo correctamente
- Se recomienda usarlo solo cuando es realmente necesario

## 🐛 Troubleshooting

**Error: "El empleado ya tiene una cita en ese horario"**
- Verifica que `allow_overlapping_appointments = TRUE` para ese negocio
- Limpia caché del navegador
- Verifica que la función se actualizó correctamente:
  ```sql
  SELECT prosrc FROM pg_proc WHERE proname = 'check_appointment_conflicts';
  -- Debe contener "SELECT allow_overlapping_appointments"
  ```

**Rollback falla**
- Verifica que no hay dependencias activas
- Ejecuta línea por línea en lugar del archivo completo
- Restaura desde backup si es necesario

## 📅 Changelog

- **2025-01-XX:** Implementación inicial
  - Agregada columna `allow_overlapping_appointments` a `businesses`
  - Modificada función `check_appointment_conflicts()`
  - Creados archivos de migración y rollback
