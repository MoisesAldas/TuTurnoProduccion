# 📧 Sistema de Notificaciones por Email - Resumen Completo

## 🎯 Resumen Ejecutivo

Se ha implementado un **sistema modular de notificaciones por email** para TuTurno que envía correos automáticos a los clientes cuando:

1. 🔴 **El negocio cancela una cita**
2. 🟠 **El cliente no se presenta (no-show)**
3. 🔵 **Se reagenda una cita (drag & drop)**
4. 🟢 **Se completa un pago (factura)**

**Características principales:**
- ✅ Modular (4 Edge Functions independientes)
- ✅ No bloqueante (emails fallan sin afectar operaciones)
- ✅ Solo clientes registrados (ignora walk-ins automáticamente)
- ✅ Tematización por color según tipo de notificación
- ✅ Funciona en local y producción (https://turnoapp.org)

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUJO DE EMAILS                          │
└─────────────────────────────────────────────────────────────┘

1. Usuario realiza acción (cancelar, no-show, drag, cobrar)
                    ↓
2. Componente UI actualiza base de datos
                    ↓
3. Si éxito → Llama a API Route (/api/send-*-notification)
                    ↓
4. API Route:
   - Valida cliente registrado (client_id IS NOT NULL)
   - Si walk-in → Retorna sin enviar email
   - Fetches datos completos (JOINs)
   - Formatea fechas en español
   - Prepara emailData
                    ↓
5. Llama a Edge Function (Supabase Function)
                    ↓
6. Edge Function:
   - Genera HTML del email
   - Usa Resend API para enviar
   - Retorna resultado
                    ↓
7. API Route retorna 200 (success/failure)
                    ↓
8. UI muestra toast de confirmación
```

---

## 📁 Estructura de Archivos Creados

### Edge Functions (Supabase - Deno/TypeScript)

```
Database/functions/
│
├── send-cancellation-email/
│   └── index.ts                    (Template rojo, cancellation reason)
│
├── send-no-show-email/
│   └── index.ts                    (Template naranja, cancellation policy)
│
├── send-rescheduled-email/
│   └── index.ts                    (Template azul, tabla antes/después)
│
└── send-invoice-email/
    └── index.ts                    (Template verde, factura completa)
```

### API Routes (Next.js - Server-Side)

```
src/app/api/
│
├── send-cancellation-notification/
│   └── route.ts                    (Fetches appointment + cancellation reason)
│
├── send-no-show-notification/
│   └── route.ts                    (Fetches appointment + business policy)
│
├── send-rescheduled-notification/
│   └── route.ts                    (Fetches appointment + old employee data)
│
└── send-invoice-notification/
    └── route.ts                    (Fetches appointment + invoice + payment)
```

### Componentes UI Modificados

```
src/components/
│
├── AppointmentModal.tsx
│   ├── handleCancel()              → send-cancellation-notification
│   └── handleUpdateStatus()        → send-no-show-notification (si status='no_show')
│
├── CalendarView.tsx
│   └── handleDrop()                → send-rescheduled-notification
│
└── CheckoutModal.tsx
    └── handleFinalizePurchase()    → send-invoice-notification
```

---

## 🎨 Tipos de Emails y Templates

### 1. 🔴 Email de Cancelación

**Archivo:** `Database/functions/send-cancellation-email/index.ts`

**Trigger:** Cuando el negocio cancela una cita desde el AppointmentModal

**Color theme:** Rojo (#dc2626)

**Contenido:**
- Mensaje de disculpa
- Razón de cancelación (opcional)
- Datos de la cita cancelada
- Botón "Reservar Nueva Cita" → `/marketplace`

**Datos requeridos:**
```typescript
{
  to: string                      // Email del cliente
  userName: string                // Nombre completo
  data: {
    businessName: string
    businessAddress?: string
    serviceName: string
    servicePrice: number
    serviceDuration: number
    employeeName: string
    employeePosition?: string
    appointmentDate: string       // Español: "Lunes, 15 de octubre de 2025"
    appointmentTime: string       // "14:30"
    appointmentEndTime: string    // "15:00"
    cancellationReason?: string   // "Cancelada por el negocio"
  }
}
```

**Remitente:** `citas@turnoapp.org`

---

### 2. 🟠 Email de No-Show

**Archivo:** `Database/functions/send-no-show-email/index.ts`

**Trigger:** Cuando se marca cliente como "No Asistió" en AppointmentModal

**Color theme:** Naranja (#ea580c)

**Contenido:**
- Notificación de inasistencia registrada
- Recordatorio de política de cancelación del negocio
- Datos de la cita a la que no asistió
- Botón "Reservar Nueva Cita" → `/marketplace`

**Datos requeridos:**
```typescript
{
  to: string
  userName: string
  data: {
    businessName: string
    businessAddress?: string
    serviceName: string
    servicePrice: number
    serviceDuration: number
    employeeName: string
    employeePosition?: string
    appointmentDate: string
    appointmentTime: string
    appointmentEndTime: string
    cancellationPolicy: string    // Generado dinámicamente con cancellation_hours
  }
}
```

**Remitente:** `citas@turnoapp.org`

**Política de cancelación:**
- Si `business.cancellation_hours` existe: "...con al menos X horas de anticipación..."
- Si no: "...con anticipación..."

---

### 3. 🔵 Email de Reagendamiento

**Archivo:** `Database/functions/send-rescheduled-email/index.ts`

**Trigger:** Cuando se arrastra y suelta una cita (drag & drop) en CalendarView

**Color theme:** Azul (#2563eb)

**Contenido:**
- Notificación de cambio de cita
- **Tabla comparativa Antes/Después** con:
  - Fecha (si cambió)
  - Hora (si cambió)
  - Empleado (si cambió)
- Datos completos de la cita
- Botón "Ver Mi Cita" → `/dashboard/client/appointments/${appointmentId}`

**Datos requeridos:**
```typescript
{
  to: string
  userName: string
  data: {
    businessName: string
    businessAddress?: string
    serviceName: string
    servicePrice: number
    serviceDuration: number
    // NUEVOS DATOS
    newAppointmentDate: string
    newAppointmentTime: string
    newAppointmentEndTime: string
    newEmployeeName: string
    newEmployeePosition?: string
    // DATOS VIEJOS
    oldAppointmentDate: string
    oldAppointmentTime: string
    oldAppointmentEndTime: string
    oldEmployeeName: string
    oldEmployeePosition?: string
    // INDICADORES DE CAMBIO
    dateChanged: boolean          // true si oldDate !== newDate
    timeChanged: boolean          // true si oldTime !== newTime
    employeeChanged: boolean      // true si oldEmployeeId !== newEmployeeId
  }
}
```

**Remitente:** `citas@turnoapp.org`

**Lógica de cambios:**
- Solo muestra filas de la tabla para campos que cambiaron
- Resalta en rojo los valores antiguos
- Resalta en verde los valores nuevos

---

### 4. 🟢 Email de Factura

**Archivo:** `Database/functions/send-invoice-email/index.ts`

**Trigger:** Cuando se registra un pago en CheckoutModal (Finalizar y Cobrar)

**Color theme:** Verde (#059669)

**Contenido:**
- Agradecimiento por el pago
- Número de factura (INV-2025-XXXX)
- **Tabla de servicios** con precios individuales
- Subtotal, impuestos, descuentos
- **Total**
- Método de pago (💵 Efectivo o 💳 Transferencia)
- Referencia de transferencia (si aplica)
- Fecha de pago
- Botón "Ver Detalles" → `/dashboard/client/appointments/${appointmentId}`

**Datos requeridos:**
```typescript
{
  to: string
  userName: string
  data: {
    businessName: string
    businessAddress?: string
    serviceName: string
    servicePrice: number
    serviceDuration: number
    employeeName: string
    employeePosition?: string
    appointmentDate: string
    appointmentTime: string
    appointmentEndTime: string
    // DATOS DE FACTURA
    invoiceNumber: string         // "INV-2025-0001"
    invoiceDate: string           // "15 de octubre de 2025"
    subtotal: number
    tax: number
    discount: number
    total: number
    // DATOS DE PAGO
    paymentMethod: 'cash' | 'transfer'
    paymentAmount: number
    transferReference?: string    // Solo si method='transfer'
    paymentDate: string           // "15 de octubre de 2025, 14:30"
    // SERVICIOS MÚLTIPLES
    services?: Array<{
      name: string
      price: number
      duration: number
    }>
  }
}
```

**Remitente:** `citas@turnoapp.org`

**Método de pago:**
- Efectivo: Muestra 💵 Efectivo
- Transferencia: Muestra 💳 Transferencia + referencia

---

## 🔄 Flujos Detallados

### Flujo 1: Cancelar Cita

```
Usuario en AppointmentModal hace clic en "Cancelar Cita"
                    ↓
handleCancel() ejecuta:
1. supabase.update({ status: 'cancelled' })
2. Si éxito → fetch('/api/send-cancellation-notification')
                    ↓
API Route:
1. Valida appointmentId
2. Fetches appointment con JOINs (business, employee, user, services)
3. Si client_id IS NULL → Retorna 200 "Walk-in client, no email sent"
4. Si client_id exists → Formatea fecha en español
5. Llama a Edge Function con emailData
6. Retorna resultado
                    ↓
Edge Function:
1. Genera HTML con template rojo
2. Usa Resend API: resend.emails.send()
3. Retorna { success: true/false }
                    ↓
UI muestra toast "Cita cancelada"
```

### Flujo 2: No-Show

```
Usuario en AppointmentModal hace clic en "No Asistió" (dropdown)
                    ↓
handleUpdateStatus('no_show') ejecuta:
1. supabase.update({ status: 'no_show' })
2. Si éxito Y newStatus === 'no_show' → fetch('/api/send-no-show-notification')
                    ↓
API Route:
1. Fetches appointment + business.cancellation_hours
2. Genera cancellationPolicy text
3. Llama a Edge Function
                    ↓
Edge Function: Template naranja con policy reminder
                    ↓
UI muestra toast "Estado actualizado"
```

### Flujo 3: Drag & Drop Reagendamiento

```
Usuario arrastra cita en CalendarView y la suelta en nuevo horario/empleado
                    ↓
handleDrop() ejecuta:
1. Captura OLD values (oldDate, oldTime, oldEndTime, oldEmployeeId)
2. Calcula NEW values
3. supabase.update({ employee_id, appointment_date, start_time, end_time })
4. Si éxito → fetch('/api/send-rescheduled-notification', { changes })
                    ↓
API Route:
1. Fetches appointment (datos NUEVOS)
2. Si oldEmployeeId !== employee_id → Fetches old employee data
3. Calcula dateChanged, timeChanged, employeeChanged
4. Llama a Edge Function con datos OLD + NEW
                    ↓
Edge Function: Template azul con tabla comparativa
                    ↓
UI muestra toast "Cita reagendada"
```

### Flujo 4: Finalizar y Cobrar

```
Usuario en CheckoutModal selecciona método de pago y hace clic en "Finalizar Compra"
                    ↓
handleFinalizePurchase() ejecuta:
1. Verifica si existe invoice → Si no, crea una
2. Inserta payment con método + referencia (si aplica)
3. Si éxito → fetch('/api/send-invoice-notification')
                    ↓
API Route:
1. Fetches appointment + invoice + payment (más reciente)
2. Fetches appointment_services (puede ser múltiple)
3. Formatea 3 fechas: appointment, invoice, payment
4. Prepara services array
5. Llama a Edge Function
                    ↓
Edge Function: Template verde con factura completa
                    ↓
UI muestra toast "¡Pago registrado exitosamente!"
```

---

## 🛡️ Validaciones y Seguridad

### ✅ Validaciones Implementadas

#### 1. Cliente Registrado (client_id)
```typescript
// En TODAS las API Routes:
if (!appointment.client_id || !appointment.users) {
  console.log('⚠️ Walk-in client detected, skipping email notification')
  return NextResponse.json({
    success: true,
    message: 'Walk-in client, no email sent'
  }, { status: 200 })
}
```

**Por qué:** Walk-ins no tienen email, no pueden recibir notificaciones.

#### 2. Datos Completos
```typescript
if (!business?.name || !service?.name || !employee?.first_name || !client?.email) {
  return NextResponse.json({ error: 'Datos incompletos' }, { status: 404 })
}
```

**Por qué:** Si faltan datos críticos, el email no se puede generar correctamente.

#### 3. Error Handling No Bloqueante
```typescript
// En TODOS los componentes UI:
try {
  await fetch('/api/send-...-notification', { ... })
} catch (emailError) {
  console.warn('⚠️ Failed to send email:', emailError)
  // Don't block the operation if email fails
}
```

**Por qué:** Un fallo en envío de email NO debe bloquear la cancelación/pago/reagendamiento.

### 🔒 Seguridad

#### 1. Service Role Client solo Server-Side
```typescript
// API Routes (server-side):
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // ← Solo server-side
)
```

**Por qué:** El service role bypassa RLS, NUNCA debe exponerse al cliente.

#### 2. Authorization Header en Edge Functions
```typescript
// Edge Functions:
headers: {
  'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
}
```

**Por qué:** Autenticación segura para llamadas a Supabase Functions.

#### 3. CORS Headers
```typescript
// Edge Functions:
return new Response(JSON.stringify(result), {
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': SITE_URL
  }
})
```

**Por qué:** Solo permite requests desde tu dominio.

---

## 📊 Datos y Transformaciones

### Formato de Fechas

**Base de datos → API Route:**
```typescript
// DB: "2025-10-15" (YYYY-MM-DD)
const appointmentDate = new Date(appointment.appointment_date + 'T00:00:00')

// API Route → Edge Function: "Lunes, 15 de octubre de 2025"
const formattedDate = appointmentDate.toLocaleDateString('es-EC', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric'
})

// Capitalizar primera letra:
const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1)
```

**Horas:**
```typescript
// DB: "14:30:00" (HH:MM:SS)
// Email: "14:30" (HH:MM)
appointment.start_time.substring(0, 5)
```

### Conversión de Arrays a Objetos

**Por qué:** Supabase retorna relaciones como arrays o objetos dependiendo de la query.

```typescript
// Safe conversion:
const business = Array.isArray(appointment.businesses)
  ? (appointment.businesses[0] as Business)
  : (appointment.businesses as Business)
```

### Preparación de Servicios Múltiples

```typescript
// Mapeo para email de factura:
const services = appointmentServices.map((as: any) => {
  const svc = Array.isArray(as.services) ? as.services[0] : as.services
  return {
    name: svc.name,
    price: as.price,
    duration: svc.duration_minutes
  }
})
```

---

## 🎯 Variables de Entorno

### Desarrollo Local (`.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Producción (Vercel + Supabase Secrets)

**Vercel:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx
NEXT_PUBLIC_SITE_URL=https://turnoapp.org
```

**Supabase Edge Functions Secrets:**
```bash
RESEND_API_KEY=re_xxxxxxxxxxxxx
SITE_URL=https://turnoapp.org
```

---

## 📈 Métricas y Monitoreo

### Logs disponibles:

```bash
# Ver logs de Edge Function específica:
npx supabase functions logs send-invoice-email --follow

# Ver logs de API Routes:
# En Vercel → Tu Proyecto → Functions → Logs
```

### Eventos logeados:

```typescript
// En API Routes:
console.log('📧 Sending invoice email to:', client.email)
console.log('📄 Invoice number:', invoice.invoice_number)
console.log('✅ Invoice email sent successfully:', result)
console.error('⚠️ Failed to send invoice email:', errorText)

// En Edge Functions:
console.log('Sending email to:', to)
console.log('Email sent successfully:', result)
console.error('Error sending email:', error)
```

---

## 🚀 Comandos de Deployment

```bash
# 1. Deploy Edge Functions
npx supabase functions deploy send-cancellation-email
npx supabase functions deploy send-no-show-email
npx supabase functions deploy send-rescheduled-email
npx supabase functions deploy send-invoice-email

# 2. Configurar secretos
npx supabase secrets set RESEND_API_KEY=re_xxxxx
npx supabase secrets set SITE_URL=https://turnoapp.org

# 3. Verificar deployment
npx supabase functions list

# 4. Ver logs en tiempo real
npx supabase functions logs send-invoice-email --follow
```

---

## 🧪 Testing

### Checklist de Pruebas:

- [ ] **Cancelación:**
  1. Crear cita con cliente registrado
  2. Cancelar desde AppointmentModal
  3. Verificar email rojo recibido
  4. Botón lleva a `/marketplace`

- [ ] **No-show:**
  1. Crear cita con cliente registrado
  2. Marcar como "No Asistió" en dropdown
  3. Verificar email naranja recibido
  4. Verifica política de cancelación

- [ ] **Reagendamiento:**
  1. Crear cita con cliente registrado
  2. Arrastrar a nuevo horario/empleado
  3. Verificar email azul recibido
  4. Tabla antes/después correcta

- [ ] **Factura:**
  1. Crear cita con cliente registrado
  2. Finalizar y cobrar (efectivo o transferencia)
  3. Verificar email verde recibido
  4. Número de factura correcto

- [ ] **Walk-ins (NO envían email):**
  1. Crear cita walk-in
  2. Cancelar/no-show/drag/cobrar
  3. NO debe enviar email
  4. Logs: "Walk-in client, no email sent"

---

## 📚 Archivos de Documentación

1. **`DEPLOYMENT_GUIDE.md`** - Guía paso a paso de deployment
2. **`EMAIL_SYSTEM_SUMMARY.md`** (este archivo) - Resumen técnico completo
3. **`CLAUDE.md`** - Documentación general del proyecto

---

## ✨ Mejoras Futuras

### Corto plazo:
- [ ] Agregar campo "subject" personalizable por negocio
- [ ] Añadir logo del negocio en emails
- [ ] Estadísticas de apertura de emails (Resend Analytics)

### Mediano plazo:
- [ ] Plantillas HTML customizables desde dashboard
- [ ] Preview de emails antes de enviar
- [ ] Soporte multiidioma (inglés/español)

### Largo plazo:
- [ ] Integración WhatsApp Business API
- [ ] Notificaciones push
- [ ] Recordatorios automáticos 24h antes

---

**Autor:** Claude Code (Anthropic)
**Fecha:** 2025-10-09
**Versión:** 1.0
**Estado:** ✅ Completado y listo para producción
