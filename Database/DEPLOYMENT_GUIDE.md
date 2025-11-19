# 📧 Guía de Deployment - Sistema de Emails

Esta guía te ayudará a desplegar las 4 Edge Functions del sistema de notificaciones por email a Supabase y configurar las variables de entorno necesarias.

---

## 📋 Prerequisitos

Antes de comenzar, asegúrate de tener:

✅ Supabase CLI instalado (`npm install -g supabase`)
✅ Cuenta de Resend configurada (https://resend.com)
✅ Proyecto de Supabase activo
✅ Token de acceso de Supabase

---

## 🚀 Paso 1: Deploy de Edge Functions

Debes desplegar las 4 Edge Functions a tu proyecto de Supabase. Abre tu terminal en la raíz del proyecto y ejecuta:

```bash
# 1. Cancelación
npx supabase functions deploy send-cancellation-email

# 2. No-show
npx supabase functions deploy send-no-show-email

# 3. Reagendamiento
npx supabase functions deploy send-rescheduled-email

# 4. Factura
npx supabase functions deploy send-invoice-email
```

**Nota:** Si es la primera vez que despliegas, necesitarás hacer login:
```bash
npx supabase login
```

---

## 🔑 Paso 2: Configurar Variables de Entorno en Supabase

### 2.1 Ir al Dashboard de Supabase

1. Ve a https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Edge Functions** en el menú lateral
4. Haz clic en **Manage Secrets** (o **Secrets** en la esquina superior derecha)

### 2.2 Agregar las siguientes variables:

#### `RESEND_API_KEY` (Requerida)
- **Descripción:** Tu API key de Resend
- **Dónde obtenerla:** https://resend.com/api-keys
- **Ejemplo:** `re_xxxxxxxxxxxxxxxxxxxxxxxxxx`

```bash
# Comando alternativo (vía CLI):
npx supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### `SITE_URL` (Requerida)
- **Descripción:** URL de tu aplicación en producción
- **Valor para producción:** `https://turnoapp.org`
- **Valor para local:** `http://localhost:3000`

```bash
# Para producción:
npx supabase secrets set SITE_URL=https://turnoapp.org
```

**⚠️ IMPORTANTE:** Asegúrate de usar `https://turnoapp.org` (sin barra final `/`)

---

## 🌐 Paso 3: Configurar Variables de Entorno en Next.js

### 3.1 Archivo `.env.local` (desarrollo local)

Asegúrate de tener estas variables en tu archivo `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key

# Resend (para desarrollo local, si quieres probar)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxx

# App
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3.2 Variables en Producción (Vercel/tu hosting)

Si estás usando Vercel u otro hosting, configura las mismas variables en el panel de configuración:

1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Agrega:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` = `https://turnoapp.org`

---

## ✅ Paso 4: Verificar Deployment

### 4.1 Verificar que las funciones están desplegadas

En el Dashboard de Supabase → Edge Functions, deberías ver:

- ✅ `send-cancellation-email`
- ✅ `send-no-show-email`
- ✅ `send-rescheduled-email`
- ✅ `send-invoice-email`

### 4.2 Verificar secretos

En Edge Functions → Secrets, deberías ver:

- ✅ `RESEND_API_KEY`
- ✅ `SITE_URL`

---

## 🧪 Paso 5: Testing

### 5.1 Probar en Local

```bash
# Iniciar Next.js
npm run dev

# En otra terminal, probar las API routes:
curl -X POST http://localhost:3000/api/send-cancellation-notification \
  -H "Content-Type: application/json" \
  -d '{"appointmentId":"uuid-de-cita-real","cancellationReason":"Test"}'
```

### 5.2 Probar en Producción

1. **Crear una cita de prueba** con un cliente registrado (que tenga email)
2. **Cancelar la cita** → Debería llegar email rojo de cancelación
3. **Marcar como "No Asistió"** → Debería llegar email naranja de no-show
4. **Arrastrar la cita** (drag & drop) → Debería llegar email azul de reagendamiento
5. **Finalizar y Cobrar** → Debería llegar email verde de factura

**⚠️ IMPORTANTE:** Los emails solo se envían a clientes registrados (con `client_id`), no a walk-ins.

---

## 📊 Monitoreo

### Ver logs de Edge Functions

```bash
# Ver logs en tiempo real de una función específica:
npx supabase functions logs send-invoice-email --follow
```

O en el Dashboard:
1. Edge Functions → Selecciona la función → Tab "Logs"

### Buscar errores comunes

#### ❌ Error: "RESEND_API_KEY is not defined"
**Solución:** Asegúrate de haber configurado el secret en Supabase:
```bash
npx supabase secrets set RESEND_API_KEY=tu-key-aqui
```

#### ❌ Error: "Failed to send email"
**Posibles causas:**
- API key de Resend inválida
- Dominio no verificado en Resend
- Email del cliente inválido

#### ❌ Error: "Walk-in client, no email sent"
**Esto es normal:** Los clientes walk-in no reciben emails porque no tienen cuenta de usuario.

---

## 🎨 Estructura de Emails

Cada tipo de email tiene su propio color y propósito:

### 🔴 Cancelación (`send-cancellation-email`)
- **Color:** Rojo (#dc2626)
- **Trigger:** Cuando el negocio cancela una cita
- **Botón:** "Reservar Nueva Cita" → marketplace

### 🟠 No-show (`send-no-show-email`)
- **Color:** Naranja (#ea580c)
- **Trigger:** Cuando se marca cliente como "No Asistió"
- **Incluye:** Política de cancelación del negocio
- **Botón:** "Reservar Nueva Cita" → marketplace

### 🔵 Reagendamiento (`send-rescheduled-email`)
- **Color:** Azul (#2563eb)
- **Trigger:** Cuando se arrastra y suelta una cita (drag & drop)
- **Contenido:** Tabla comparativa Antes/Después
- **Cambios detectados:** Fecha, hora, empleado
- **Botón:** "Ver Mi Cita" → detalles

### 🟢 Factura (`send-invoice-email`)
- **Color:** Verde (#059669)
- **Trigger:** Cuando se registra un pago (Finalizar y Cobrar)
- **Contenido:**
  - Número de factura (INV-2025-XXXX)
  - Servicios con precios
  - Subtotal, impuestos, descuentos
  - Método de pago (efectivo/transferencia)
  - Referencia de transferencia (si aplica)
- **Botón:** "Ver Detalles" → cita

---

## 📁 Archivos Relacionados

### Edge Functions (Deno/TypeScript)
```
Database/functions/
├── send-cancellation-email/
│   └── index.ts
├── send-no-show-email/
│   └── index.ts
├── send-rescheduled-email/
│   └── index.ts
└── send-invoice-email/
    └── index.ts
```

### API Routes (Next.js)
```
src/app/api/
├── send-cancellation-notification/
│   └── route.ts
├── send-no-show-notification/
│   └── route.ts
├── send-rescheduled-notification/
│   └── route.ts
└── send-invoice-notification/
    └── route.ts
```

### Componentes Integrados
```
src/components/
├── AppointmentModal.tsx       (cancelar, no-show)
├── CalendarView.tsx           (drag & drop reagendamiento)
└── CheckoutModal.tsx          (factura)
```

---

## 🔒 Seguridad

### ✅ Buenas prácticas implementadas:

1. **Service Role Client solo en API Routes** (server-side)
   - Las Edge Functions usan Authorization header
   - Nunca se expone el service role key al cliente

2. **Validación de clientes registrados**
   - Solo se envían emails si `client_id IS NOT NULL`
   - Walk-ins no reciben notificaciones

3. **Error handling no bloqueante**
   - Si falla el envío de email, NO se revierte la operación
   - Se usa `try-catch` con `console.warn` para logs

4. **Unique constraints**
   - Referencias de transferencia únicas en BD
   - Validación de duplicados antes de insertar

---

## 🆘 Soporte

Si encuentras algún problema:

1. **Revisa los logs:** `npx supabase functions logs <nombre-funcion> --follow`
2. **Verifica secretos:** Dashboard → Edge Functions → Secrets
3. **Comprueba el email del cliente:** Debe ser válido y existir en la tabla `users`
4. **Revisa la consola del navegador:** Busca errores `⚠️` en DevTools

---

## ✨ Próximos Pasos

Una vez que todo esté funcionando:

1. **Personalizar templates:** Modifica los HTML en las Edge Functions
2. **Agregar más campos:** Extiende los `emailData` según necesites
3. **Añadir WhatsApp:** Integrar API de WhatsApp Business para notificaciones
4. **Recordatorios automáticos:** Crear función que envíe emails 24h antes

---

**Última actualización:** 2025-10-09
**Versión:** 1.0
**Estado:** ✅ Listo para producción
