# Deployment: Business Email Notifications

## 📧 Nuevas Edge Functions Creadas

### 1. `send-cancellation-business-notification`
Envía email al negocio cuando un cliente cancela su cita.

### 2. `send-rescheduled-business-notification`
Envía email al negocio cuando un cliente reprograma su cita.

---

## 🚀 Pasos de Deployment

### Paso 1: Deploy Edge Functions

```bash
# Deploy función de cancelación al negocio
npx supabase functions deploy send-cancellation-business-notification

# Deploy función de reprogramación al negocio
npx supabase functions deploy send-rescheduled-business-notification
```

### Paso 2: Verificar Secrets

Las funciones usan las mismas secrets que las otras Edge Functions:

```bash
# Verificar secrets (en Supabase Dashboard)
# Edge Functions → Secrets

RESEND_API_KEY=re_xxxxx
SITE_URL=https://tuturno.com
```

---

## 📁 Archivos Modificados

### Edge Functions (Nuevas):
1. `Database/functions/send-cancellation-business-notification/index.ts`
2. `Database/functions/send-rescheduled-business-notification/index.ts`

### API Routes (Actualizadas):
3. `src/app/api/send-cancellation-notification/route.ts`
4. `src/app/api/send-rescheduled-notification/route.ts`

### Cliente Dashboard (Actualizado):
5. `src/app/dashboard/client/appointments/page.tsx`

---

## 🧪 Testing

### Test 1: Cancelación de Cita

1. Como **cliente**, ve a `/dashboard/client/appointments`
2. Click en "Gestionar" en una cita activa
3. Selecciona "Cancelar cita"
4. Escribe un motivo (ej: "Tengo otra reunión")
5. Confirma la cancelación

**Resultado esperado:**
- ✅ Cita se marca como `cancelled` en DB
- ✅ Cliente recibe email (verde) de confirmación de cancelación
- ✅ Negocio recibe email (naranja) notificando la cancelación con:
  - Nombre del cliente
  - Email y teléfono del cliente
  - Detalles de la cita cancelada
  - Motivo de cancelación

### Test 2: Reprogramación de Cita

1. Como **cliente**, ve a `/dashboard/client/appointments`
2. Click en "Gestionar" en una cita activa
3. Selecciona "Reprogramar cita"
4. Elige nueva fecha y hora
5. Confirma la reprogramación

**Resultado esperado:**
- ✅ Cita se actualiza con nueva fecha/hora
- ✅ Status cambia a `pending`
- ✅ Cliente recibe email (verde) con confirmación de cambios
- ✅ Negocio recibe email (naranja) notificando los cambios con:
  - Nombre del cliente
  - Email y teléfono del cliente
  - Nueva información (resaltada en verde)
  - Información anterior (tachada)
  - Indicadores de qué cambió (fecha/hora/profesional)

---

## 📧 Estructura de Emails al Negocio

### Cancelación (Naranja):
- **Subject:** `Cliente canceló su cita - {clientName}`
- **From:** `TuTurno <citas@turnoapp.org>`
- **To:** Business owner email
- **Estilo:** Gradiente naranja (business branding)
- **Contenido:**
  - Información del cliente (con links de contacto)
  - Detalles de la cita cancelada
  - Motivo de cancelación (si existe)
  - CTA: "Ver Calendario"

### Reprogramación (Naranja):
- **Subject:** `Cliente reprogramó su cita - {clientName}`
- **From:** `TuTurno <citas@turnoapp.org>`
- **To:** Business owner email
- **Estilo:** Gradiente naranja (business branding)
- **Contenido:**
  - Información del cliente (con links de contacto)
  - Nueva información (fondo verde, badges "CAMBIÓ")
  - Información anterior (tachada, gris)
  - Resumen de cambios (fecha, hora, profesional)
  - CTA: "Ver Calendario"

---

## 🔄 Flujo Completo

```
Cliente cancela/reprograma cita
  ↓
1. UPDATE en tabla appointments
  ↓
2. Llamada a API route (/api/send-cancellation-notification o send-rescheduled-notification)
  ↓
3. API route fetch datos completos (appointment + business owner)
  ↓
4. Envía 2 emails en paralelo:
   ├── a) Cliente (verde) → send-cancellation-email / send-rescheduled-email
   └── b) Negocio (naranja) → send-cancellation-business-notification / send-rescheduled-business-notification
  ↓
5. Return success (independiente de si emails fallaron)
  ↓
6. UI se actualiza (modal se cierra, lista se refresca)
```

---

## 🐛 Troubleshooting

### Email al negocio no llega

**Verificar:**
1. Business owner existe en tabla `users`
2. Business tiene `owner_id` válido
3. Edge Function desplegada: `npx supabase functions list`
4. Secrets configuradas en Supabase Dashboard
5. Logs de Edge Function: Supabase Dashboard → Edge Functions → Logs

### Email al cliente llega pero al negocio no

**Posibles causas:**
- `owner_id` no existe o es NULL en tabla businesses
- Email del owner es inválido
- Edge Function no desplegada
- Error en fetch del owner (check logs en API route)

### Emails no se envían pero la cita se cancela/reprograma

**Esto es OK** - El flujo está diseñado para no bloquear la operación si los emails fallan. Los emails se envían en un try-catch que no afecta el flujo principal.

**Para depurar:**
- Check Network tab en DevTools (verás el POST a `/api/send-...`)
- Check Server logs (API route logs)
- Check Edge Function logs

---

## 📊 Métricas

**Performance esperado:**
- Email al cliente: ~500ms
- Email al negocio: ~500ms
- Total: ~1-2 segundos para enviar ambos emails

**No bloqueante:** Si un email falla, el otro se envía de todos modos.

---

## 🔐 Seguridad

- **RLS Bypass:** API routes usan Service Role Client para fetch de datos
- **Validación:** Solo clientes registrados reciben emails (walk-ins se skipean)
- **Owner Check:** Se verifica que `owner_id` exista antes de enviar
- **Non-blocking:** Errores de email no bloquean la operación principal

---

## 📝 Notas

- Walk-in clients NO reciben emails (no tienen email registrado)
- Business owners reciben notificación en su email personal (users.email)
- Los emails incluyen links de contacto directo (mailto, tel) para facilitar comunicación
- Los cambios en la cita se resaltan visualmente (badges "CAMBIÓ", colores verde/rojo)

---

**Fecha:** 2025-01-XX
**Autor:** Claude Code
**Versión:** 1.0
