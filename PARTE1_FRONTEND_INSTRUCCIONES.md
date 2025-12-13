# Parte 1 Frontend: Procesamiento de Cola de Emails

## ✅ Archivos Creados

1. **`/api/process-email-queue/route.ts`** - API route que procesa la cola
2. **`vercel.json`** - Configuración de cron automático

## 🧪 Probar el Sistema Completo

### Paso 1: Crear una cita de prueba

Ve a `/dashboard/business/appointments` y crea una cita para **mañana**.

### Paso 2: Crear un horario especial (cerrado)

Ve a `/dashboard/business/settings?section=special-hours` y:
1. Click en "Nuevo Horario Especial"
2. Selecciona la fecha de mañana
3. Marca "Cerrado" ✅
4. Razón: "Día festivo"
5. Guarda

**Qué debería pasar:**
- ✅ El horario especial se guarda
- ✅ La cita se cancela automáticamente (status = 'cancelled')
- ✅ Se crea una notificación in-app para el cliente
- ✅ Se agrega un email a la cola (`email_queue`)

### Paso 3: Verificar en Supabase

```sql
-- Ver la cita cancelada
SELECT id, status, appointment_date
FROM appointments
WHERE appointment_date = CURRENT_DATE + INTERVAL '1 day'
ORDER BY created_at DESC
LIMIT 5;
-- Status debe ser 'cancelled'

-- Ver la notificación creada
SELECT * FROM notifications
ORDER BY created_at DESC
LIMIT 5;

-- Ver el email en la cola
SELECT * FROM email_queue
WHERE status = 'pending'
ORDER BY created_at DESC;
```

### Paso 4: Procesar emails manualmente (para testing)

**Opción A: Llamada directa con curl**
```bash
curl -X POST http://localhost:3000/api/process-email-queue
```

**Opción B: Desde el navegador**
Abre la consola del navegador y ejecuta:
```javascript
fetch('/api/process-email-queue', { method: 'POST' })
  .then(r => r.json())
  .then(console.log)
```

**Respuesta esperada:**
```json
{
  "success": true,
  "processed": 1,
  "sent": 1,
  "failed": 0,
  "errors": []
}
```

### Paso 5: Verificar que el email se envió

```sql
SELECT * FROM email_queue
WHERE status = 'sent'
ORDER BY sent_at DESC
LIMIT 5;
```

## ⚙️ Configuración Automática

### Si usas **Vercel** (Recomendado):

El archivo `vercel.json` ya está configurado. El cron se ejecutará **cada minuto** automáticamente en producción.

**Verificar en Vercel:**
1. Deploy a Vercel
2. Ve a tu proyecto → Settings → Crons
3. Deberías ver: `POST /api/process-email-queue` ejecutándose cada minuto

### Si usas **otro hosting**:

Configura un cron job manualmente que llame a:
```bash
curl -X POST https://tu-dominio.com/api/process-email-queue
```

Cada minuto con crontab:
```cron
* * * * * curl -X POST https://tu-dominio.com/api/process-email-queue
```

## 📊 Monitorear el Sistema

### Ver estadísticas de la cola:

```bash
curl http://localhost:3000/api/process-email-queue
```

**Respuesta:**
```json
{
  "pending": 0,
  "sent": 5,
  "failed": 0,
  "total": 5
}
```

### Logs en Vercel:

Ve a tu proyecto → Deployments → Functions → `/api/process-email-queue`

## 🔧 Debugging

### Si los emails no se envían:

1. **Verificar variables de entorno:**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
   ```

2. **Ver logs del API route:**
   ```bash
   # En desarrollo
   npm run dev
   # Abre la consola y busca errores
   ```

3. **Verificar la Edge Function:**
   ```bash
   # En Supabase Dashboard → Edge Functions
   # Verifica que send-cancellation-email esté deployada
   ```

4. **Probar Edge Function directamente:**
   ```bash
   curl -X POST 'https://xxx.supabase.co/functions/v1/send-cancellation-email' \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "to": "test@example.com",
       "userName": "Test User",
       "data": {
         "businessName": "Test Business",
         "serviceName": "Test Service",
         "servicePrice": 10,
         "serviceDuration": 60,
         "employeeName": "Test Employee",
         "appointmentDate": "lunes, 13 de diciembre de 2025",
         "appointmentTime": "09:00",
         "appointmentEndTime": "10:00",
         "cancellationReason": "Prueba"
       }
     }'
   ```

## ✅ Checklist de Verificación

- [ ] API route `/api/process-email-queue` creado
- [ ] `vercel.json` configurado
- [ ] Cita de prueba creada para mañana
- [ ] Horario especial cerrado creado
- [ ] Cita se canceló automáticamente
- [ ] Notificación creada en `notifications`
- [ ] Email agregado a `email_queue`
- [ ] Email procesado manualmente (POST al API)
- [ ] Email marcado como 'sent' en la cola
- [ ] Email recibido en bandeja de entrada

## 🎯 Próximos Pasos

Una vez verificado que todo funciona:
1. ✅ **Parte 1 completada** - Cierre de negocio
2. 🔄 **Parte 2** - Ausencias de empleados (siguiente)

¿Todo funciona correctamente?
