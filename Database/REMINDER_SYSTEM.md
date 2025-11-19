# 📧 TuTurno Automatic Reminder System

> **Sistema completo de recordatorios automáticos para citas**
> Envía emails a clientes 1.5 horas antes de su cita usando Supabase Cron Jobs

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [System Components](#-system-components)
- [Database Schema](#-database-schema)
- [Configuration](#-configuration)
- [Deployment](#-deployment)
- [Testing](#-testing)
- [Monitoring](#-monitoring)
- [Troubleshooting](#-troubleshooting)
- [FAQ](#-faq)

---

## 🎯 Overview

### What it does

El sistema de recordatorios automáticos:

✅ **Crea recordatorios automáticamente** cuando una cita es confirmada
✅ **Envía emails automáticamente** 1.5 horas antes de la cita
✅ **Procesa recordatorios cada 15 minutos** usando pg_cron
✅ **Cancela recordatorios** si la cita es cancelada
✅ **Maneja errores** y registra intentos fallidos
✅ **Valida estado de citas** antes de enviar

### Why 1.5 hours?

El cron job se ejecuta cada 15 minutos. En el peor caso, un recordatorio podría retrasarse hasta 15 minutos. Al configurar 1.5 horas de anticipación:

- ⏰ **Best case**: Cliente recibe email exactamente 1.5 horas (90 min) antes
- ⏰ **Worst case**: Cliente recibe email 1 hora 15 minutos (75 min) antes
- ✅ **Resultado**: Siempre recibe aviso con tiempo suficiente

---

## 🏗️ Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. TRIGGER: Usuario confirma cita                                  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2. DATABASE TRIGGER: create_appointment_reminders()                │
│     - Calcula scheduled_for = appointment_time - 1.5 hours          │
│     - Inserta record en appointment_reminders (status: pending)     │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  3. CRON JOB: Se ejecuta cada 15 minutos                            │
│     SELECT cron.schedule('process-appointment-reminders', ...)      │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  4. SQL FUNCTION: trigger_process_reminders()                       │
│     - Usa pg_net.http_post() para llamar edge function              │
│     - URL: /functions/v1/process-appointment-reminders              │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  5. EDGE FUNCTION: process-appointment-reminders                    │
│     - Query: SELECT * FROM appointment_reminders                    │
│       WHERE status='pending' AND scheduled_for <= NOW()             │
│     - Para cada reminder:                                           │
│       • Fetch appointment data (JOINs: users, employees, services)  │
│       • Validar status (confirmed/pending)                          │
│       • Validar client email                                        │
│       • Call send-reminder-email edge function                      │
│       • Update status to 'sent' or 'failed'                         │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  6. EDGE FUNCTION: send-reminder-email                              │
│     - Construye HTML email con template verde (client theme)        │
│     - Llama Resend API                                              │
│     - Return success/error                                          │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  7. RESULT: Cliente recibe email ✅                                 │
│     - Subject: "⏰ Recordatorio: Tu cita en [Business Name]"        │
│     - Detalles completos de la cita                                 │
│     - Tips útiles                                                   │
│     - CTA: Ver mis citas                                            │
└─────────────────────────────────────────────────────────────────────┘
```

### Cancellation Flow

```
Usuario cancela cita
  ↓
UPDATE appointments SET status = 'cancelled'
  ↓
TRIGGER: create_appointment_reminders()
  ↓
UPDATE appointment_reminders SET status = 'cancelled'
  WHERE appointment_id = X AND status = 'pending'
  ↓
❌ Cron job ignora reminders con status != 'pending'
```

---

## 🧩 System Components

### 1. Database Table: `appointment_reminders`

**Location**: `Database/tables_sql.sql` (Lines 335-350)

```sql
CREATE TABLE public.appointment_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    reminder_type TEXT NOT NULL CHECK (reminder_type = ANY (ARRAY['email'::text, 'sms'::text, 'push'::text])),
    scheduled_for TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text, 'cancelled'::text])),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(appointment_id, reminder_type, scheduled_for)
);
```

**Campos clave:**
- `scheduled_for`: Cuándo enviar el reminder (appointment_time - 1.5 hours)
- `status`: pending | sent | failed | cancelled
- `sent_at`: Timestamp cuando se envió exitosamente
- `error_message`: Detalles del error si falló

### 2. Database Trigger: `create_appointment_reminders()`

**Location**: `Database/setup_cron_reminders.sql` (STEP 6)

**Se ejecuta en:**
- `INSERT` en appointments con status = 'confirmed'
- `UPDATE` en appointments cuando status cambia a 'confirmed'
- `UPDATE` en appointments cuando status cambia a 'cancelled'

**Lógica:**
```sql
-- Calcula reminder time
v_reminder_time := (appointment_date + start_time) - (1.5 || ' hours')::INTERVAL;

-- Solo crea si es tiempo futuro
IF v_reminder_time > NOW() THEN
    INSERT INTO appointment_reminders (...)
    VALUES (appointment_id, 'email', v_reminder_time, 'pending');
END IF;

-- Cancela reminders si cita cancelada
IF status = 'cancelled' THEN
    UPDATE appointment_reminders SET status = 'cancelled'
    WHERE appointment_id = X AND status = 'pending';
END IF;
```

### 3. Cron Job: `process-appointment-reminders`

**Location**: `Database/setup_cron_reminders.sql` (STEP 4)

**Schedule**: `*/15 * * * *` (cada 15 minutos)

```sql
SELECT cron.schedule(
    'process-appointment-reminders',
    '*/15 * * * *',
    $$SELECT public.trigger_process_reminders();$$
);
```

### 4. SQL Function: `trigger_process_reminders()`

**Location**: `Database/setup_cron_reminders.sql` (STEP 3)

**Purpose**: Hace HTTP POST a edge function usando pg_net

```sql
SELECT net.http_post(
    url := 'https://[project].supabase.co/functions/v1/process-appointment-reminders',
    headers := jsonb_build_object(
        'Authorization', 'Bearer [SERVICE_ROLE_KEY]',
        'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
);
```

### 5. Edge Function: `process-appointment-reminders`

**Location**: `Database/functions/process-appointment-reminders/index.ts`

**Purpose**: Worker que procesa reminders en batch

**Flujo:**
1. Query pending reminders donde `scheduled_for <= NOW()`
2. Para cada reminder:
   - Fetch appointment con JOINs (users, employees, businesses, services)
   - Validar appointment status (confirmed/pending)
   - Validar client email exists
   - Call `send-reminder-email` edge function
   - Update reminder status a 'sent' o 'failed'
3. Return summary: `{ processed: N, success_count: X, error_count: Y }`

**Key Features:**
- ✅ Usa Service Role Key (bypasses RLS)
- ✅ Comprehensive logging con console.log
- ✅ Error handling individual (un fallo no detiene el batch)
- ✅ Idempotente (solo procesa status='pending')

### 6. Edge Function: `send-reminder-email`

**Location**: `Database/functions/send-reminder-email/index.ts`

**Purpose**: Envía email individual a través de Resend API

**Features:**
- ✅ Template HTML profesional (green gradient - client theme)
- ✅ Detalles completos de la cita
- ✅ Spanish date formatting
- ✅ Tips útiles para el cliente
- ✅ CTA button a dashboard
- ✅ Footer con branding TuTurno

**Email Structure:**
```
Subject: ⏰ Recordatorio: Tu cita en [Business Name]

Header (Green Gradient):
  - ⏰ RECORDATORIO badge
  - "¡No olvides tu cita!"
  - Business Name

Body:
  - Saludo personalizado
  - Detalles de la cita (card destacado):
    • Fecha: lunes, 22 de octubre de 2025
    • Hora: 14:30 - 15:30
    • Servicio: Corte de Cabello
    • Duración: 30 min
    • Profesional: Juan Pérez - Barbero
    • Precio: $15.00
  - Ubicación (si disponible)
  - Notas del cliente (si existen)
  - ⚠️ Importante: Por favor confirma o cancela
  - CTA: "Ver mis citas" button
  - 💡 Consejos útiles

Footer:
  - TuTurno branding
  - © 2025 TuTurno
  - "Este es un recordatorio automático"
```

---

## 🗄️ Database Schema

### Configuration Fields in `businesses` Table

```sql
-- Campos de configuración en businesses table
enable_reminders BOOLEAN DEFAULT TRUE
reminder_hours_before NUMERIC(4,1) DEFAULT 1.5  -- Changed from INTEGER 24
reminder_email_enabled BOOLEAN DEFAULT TRUE
reminder_sms_enabled BOOLEAN DEFAULT FALSE      -- Future feature
reminder_push_enabled BOOLEAN DEFAULT TRUE      -- Future feature
```

**Actualización importante:**
- ✅ Cambiado de INTEGER a NUMERIC(4,1) para soportar decimales
- ✅ Default cambiado de 24 horas a 1.5 horas
- ✅ Trigger function actualizada para usar NUMERIC

### Indexes

```sql
-- Índice para query eficiente de pending reminders
CREATE INDEX IF NOT EXISTS idx_appointment_reminders_pending
ON public.appointment_reminders (scheduled_for)
WHERE status = 'pending' AND reminder_type = 'email';

-- Índice para appointment lookups
CREATE INDEX IF NOT EXISTS idx_appointment_reminders_appointment_id
ON public.appointment_reminders (appointment_id);
```

---

## ⚙️ Configuration

### Prerequisites

1. ✅ **pg_cron extension** instalada en Supabase
2. ✅ **pg_net extension** instalada en Supabase
3. ✅ **Resend API Key** configurada como secret
4. ✅ **Service Role Key** disponible

### Step-by-Step Setup

#### 1. Configure Database Variables

**Opción A: Via Supabase Dashboard**
- Go to: Database → Database Settings → Custom Postgres Config
- Add:
  - `app.settings.supabase_url` = `https://your-project.supabase.co`
  - `app.settings.supabase_service_role_key` = `your-service-role-key`

**Opción B: Via SQL**
```sql
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://your-project.supabase.co';
ALTER DATABASE postgres SET app.settings.supabase_service_role_key = 'your-service-role-key';
```

**Verify:**
```sql
SELECT current_setting('app.settings.supabase_url', true);
SELECT current_setting('app.settings.supabase_service_role_key', true);
```

#### 2. Deploy Edge Functions

```bash
# Deploy send-reminder-email function
npx supabase functions deploy send-reminder-email

# Deploy process-appointment-reminders function
npx supabase functions deploy process-appointment-reminders
```

**Verify deployment:**
- Supabase Dashboard → Edge Functions
- Check both functions appear with status "Deployed"

#### 3. Set Edge Function Secrets

**Via Supabase Dashboard:**
- Edge Functions → Secrets
- Add:
  - `RESEND_API_KEY` = your_resend_api_key
  - `SITE_URL` = https://your-domain.com (or http://localhost:3000 for dev)
  - `SUPABASE_URL` = https://your-project.supabase.co
  - `SUPABASE_SERVICE_ROLE_KEY` = your_service_role_key

**Via CLI:**
```bash
npx supabase secrets set RESEND_API_KEY=re_...
npx supabase secrets set SITE_URL=https://your-domain.com
npx supabase secrets set SUPABASE_URL=https://your-project.supabase.co
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

#### 4. Run SQL Setup Script

```bash
# Execute the setup script in Supabase SQL Editor
# Copy contents of Database/setup_cron_reminders.sql
# Paste in: Dashboard → SQL Editor → New Query
# Click "Run"
```

**What this does:**
- ✅ Enables pg_cron and pg_net extensions
- ✅ Creates `trigger_process_reminders()` function
- ✅ Schedules cron job (every 15 minutes)
- ✅ Creates helper functions and views for debugging
- ✅ Updates `reminder_hours_before` to 1.5
- ✅ Updates trigger function to use NUMERIC type

#### 5. Verify Setup

```sql
-- Check cron job is scheduled
SELECT * FROM cron.job WHERE jobname = 'process-appointment-reminders';

-- Expected result:
-- jobid | schedule      | command                                  | ...
-- 1     | */15 * * * *  | SELECT public.trigger_process_reminders();
```

---

## 🚀 Deployment

### Production Deployment Checklist

- [ ] **Database variables configured** (SUPABASE_URL, SERVICE_ROLE_KEY)
- [ ] **Edge functions deployed** (send-reminder-email, process-appointment-reminders)
- [ ] **Edge function secrets set** (RESEND_API_KEY, SITE_URL)
- [ ] **SQL setup script executed** (setup_cron_reminders.sql)
- [ ] **Cron job scheduled** (verify in cron.job table)
- [ ] **Test appointment created** (with confirmed status, client_id)
- [ ] **Reminder created** (verify in appointment_reminders table)
- [ ] **Manual test passed** (SELECT trigger_process_reminders())
- [ ] **Email received** (check client inbox)
- [ ] **Monitoring configured** (check views and logs)

### Environment-Specific Configuration

**Development:**
```env
SITE_URL=http://localhost:3000
RESEND_API_KEY=re_test_...  # Use Resend test API key
```

**Staging:**
```env
SITE_URL=https://staging.tuturno.com
RESEND_API_KEY=re_prod_...
```

**Production:**
```env
SITE_URL=https://tuturno.com
RESEND_API_KEY=re_prod_...
```

---

## 🧪 Testing

### Manual Testing

#### Test 1: Create Reminder

```sql
-- 1. Create test appointment 2 hours in the future
INSERT INTO public.appointments (
    id,
    business_id,
    client_id,
    employee_id,
    appointment_date,
    start_time,
    end_time,
    status,
    total_price
) VALUES (
    gen_random_uuid(),
    '[your-business-id]',
    '[your-client-id]',
    '[your-employee-id]',
    CURRENT_DATE,
    (CURRENT_TIME + INTERVAL '2 hours')::TIME,
    (CURRENT_TIME + INTERVAL '2.5 hours')::TIME,
    'confirmed',
    25.00
);

-- 2. Verify reminder was created
SELECT * FROM public.appointment_reminders
WHERE appointment_id = '[appointment-id]'
ORDER BY created_at DESC;

-- Expected:
-- status: 'pending'
-- scheduled_for: appointment_time - 1.5 hours (30 minutes from now)
```

#### Test 2: Process Reminders (Manual Trigger)

```sql
-- Trigger processing manually (don't wait for cron)
SELECT public.trigger_process_reminders();

-- Check result
SELECT * FROM public.appointment_reminders
WHERE appointment_id = '[appointment-id]';

-- Expected:
-- status: 'sent'
-- sent_at: NOW()
-- error_message: NULL
```

#### Test 3: Check Email Received

- Check client email inbox
- Subject: "⏰ Recordatorio: Tu cita en [Business Name]"
- Verify all details are correct
- Click "Ver mis citas" button
- Verify redirects to correct dashboard

#### Test 4: Cancellation

```sql
-- 1. Cancel appointment
UPDATE public.appointments
SET status = 'cancelled'
WHERE id = '[appointment-id]';

-- 2. Verify reminder was cancelled
SELECT * FROM public.appointment_reminders
WHERE appointment_id = '[appointment-id]';

-- Expected:
-- status: 'cancelled'
-- error_message: 'Appointment was cancelled'
```

### Automated Testing Script

```sql
-- Run this complete test suite
BEGIN;

-- Test 1: Create appointment
WITH new_appointment AS (
    INSERT INTO public.appointments (
        business_id, client_id, employee_id,
        appointment_date, start_time, end_time,
        status, total_price
    )
    VALUES (
        '[business-id]', '[client-id]', '[employee-id]',
        CURRENT_DATE, (CURRENT_TIME + INTERVAL '2 hours')::TIME,
        (CURRENT_TIME + INTERVAL '2.5 hours')::TIME,
        'confirmed', 25.00
    )
    RETURNING id
)
-- Test 2: Verify reminder created
SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM public.appointment_reminders ar
            WHERE ar.appointment_id = (SELECT id FROM new_appointment)
              AND ar.status = 'pending'
              AND ar.reminder_type = 'email'
        )
        THEN '✅ Test PASSED: Reminder created'
        ELSE '❌ Test FAILED: Reminder not created'
    END AS test_result;

-- Test 3: Process reminder
SELECT public.trigger_process_reminders();

-- Test 4: Verify sent
SELECT
    CASE
        WHEN ar.status = 'sent' AND ar.sent_at IS NOT NULL
        THEN '✅ Test PASSED: Reminder sent'
        ELSE '❌ Test FAILED: Reminder not sent. Status: ' || ar.status
    END AS test_result
FROM public.appointment_reminders ar
WHERE ar.appointment_id = (SELECT id FROM new_appointment);

ROLLBACK;  -- Don't commit test data
```

---

## 📊 Monitoring

### Helper Views

#### 1. View Pending Reminders Count

```sql
SELECT * FROM public.get_pending_reminders_count();

-- Returns:
-- total_pending | ready_to_send | future_scheduled
-- 42            | 5             | 37
```

#### 2. View Upcoming Reminders (Next 24h)

```sql
SELECT * FROM public.upcoming_reminders LIMIT 10;

-- Returns:
-- reminder_id | scheduled_for | appointment_date | client_name | business_name | minutes_until_send
-- uuid-1      | 2025-10-22... | 2025-10-22      | Juan Pérez  | Barbería XYZ  | 25.5
```

#### 3. View Cron Job Status

```sql
SELECT * FROM public.cron_job_status;

-- Returns:
-- jobid | schedule      | command                                  | active
-- 1     | */15 * * * *  | SELECT public.trigger_process_reminders();| t
```

#### 4. View Recent Cron Executions

```sql
SELECT
    jobid,
    runid,
    job_pid,
    database,
    username,
    command,
    status,
    return_message,
    start_time,
    end_time
FROM cron.job_run_details
WHERE jobid = (
    SELECT jobid FROM cron.job WHERE jobname = 'process-appointment-reminders'
)
ORDER BY start_time DESC
LIMIT 10;

-- Shows last 10 executions with status and timing
```

#### 5. View Failed Reminders

```sql
SELECT
    ar.id,
    ar.appointment_id,
    ar.scheduled_for,
    ar.error_message,
    ar.created_at,
    a.appointment_date,
    a.start_time,
    u.email AS client_email,
    b.name AS business_name
FROM public.appointment_reminders ar
JOIN public.appointments a ON ar.appointment_id = a.id
LEFT JOIN public.users u ON a.client_id = u.id
JOIN public.businesses b ON a.business_id = b.id
WHERE ar.status = 'failed'
ORDER BY ar.created_at DESC
LIMIT 20;
```

### Logging

**Edge Function Logs:**
- Supabase Dashboard → Edge Functions → [function-name] → Logs
- Filter by time range
- Look for:
  - `[CRON] ⏰ Starting reminder processing job...`
  - `[CRON] Found X pending reminders to process`
  - `[CRON] ✅ Email sent successfully`
  - `[CRON] ❌ Error processing reminder`

**Database Function Logs:**
```sql
-- View pg_cron logs
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-appointment-reminders')
  AND status != 'succeeded'
ORDER BY start_time DESC;
```

### Metrics to Monitor

| Metric | Query | Healthy Range |
|--------|-------|---------------|
| **Pending Reminders** | `SELECT COUNT(*) FROM appointment_reminders WHERE status='pending'` | < 100 |
| **Success Rate** | `SELECT COUNT(*) FILTER (WHERE status='sent') * 100.0 / COUNT(*) FROM appointment_reminders WHERE created_at > NOW() - INTERVAL '24 hours'` | > 95% |
| **Failed Reminders** | `SELECT COUNT(*) FROM appointment_reminders WHERE status='failed' AND created_at > NOW() - INTERVAL '24 hours'` | < 5 |
| **Avg Processing Time** | Check edge function logs | < 5 seconds |
| **Cron Job Success** | `SELECT COUNT(*) FROM cron.job_run_details WHERE status='succeeded' AND start_time > NOW() - INTERVAL '24 hours'` | 96 (24h * 4 per hour) |

---

## 🐛 Troubleshooting

### Problem: Reminders not being created

**Symptoms:**
- No records in `appointment_reminders` table
- Appointment is confirmed but no reminder

**Diagnosis:**
```sql
-- Check if appointment meets criteria
SELECT
    id,
    status,
    client_id,
    appointment_date,
    start_time,
    (appointment_date + start_time) AS appointment_datetime,
    (appointment_date + start_time) - INTERVAL '1.5 hours' AS scheduled_reminder_time
FROM public.appointments
WHERE id = '[appointment-id]';

-- Check business configuration
SELECT
    id,
    name,
    enable_reminders,
    reminder_hours_before,
    reminder_email_enabled
FROM public.businesses
WHERE id = '[business-id]';
```

**Possible Causes:**

1. **Appointment status is not 'confirmed'**
   - Solution: Ensure status = 'confirmed' when creating appointment

2. **client_id is NULL** (walk-in client)
   - Solution: Reminders are only sent to registered clients with email

3. **Business has reminders disabled**
   - Solution: `UPDATE businesses SET enable_reminders = TRUE WHERE id = '[business-id]'`

4. **Reminder time is in the past**
   - Solution: Appointment must be at least 1.5 hours in the future

5. **Trigger not installed**
   - Solution: Run `setup_cron_reminders.sql` script

### Problem: Reminders created but not sent

**Symptoms:**
- Records in `appointment_reminders` with status='pending'
- `scheduled_for` is in the past
- No email received

**Diagnosis:**
```sql
-- Check pending reminders that should have been sent
SELECT * FROM public.appointment_reminders
WHERE status = 'pending'
  AND reminder_type = 'email'
  AND scheduled_for <= NOW()
ORDER BY scheduled_for ASC;

-- Check cron job status
SELECT * FROM cron.job WHERE jobname = 'process-appointment-reminders';

-- Check recent cron executions
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process-appointment-reminders')
ORDER BY start_time DESC
LIMIT 5;
```

**Possible Causes:**

1. **Cron job not scheduled**
   - Solution: Run `setup_cron_reminders.sql` STEP 4

2. **Database variables not configured**
   ```sql
   SELECT current_setting('app.settings.supabase_url', true);
   SELECT current_setting('app.settings.supabase_service_role_key', true);
   ```
   - Solution: Configure via Dashboard or ALTER DATABASE

3. **Edge function not deployed**
   - Solution: `npx supabase functions deploy process-appointment-reminders`

4. **Edge function secrets missing**
   - Solution: Set RESEND_API_KEY, SITE_URL, etc.

5. **Network/pg_net issue**
   ```sql
   SELECT * FROM net._http_response ORDER BY created DESC LIMIT 10;
   ```
   - Solution: Check response status_code and error messages

### Problem: Emails fail to send

**Symptoms:**
- Reminders marked as 'failed'
- `error_message` populated
- No email in client inbox

**Diagnosis:**
```sql
-- Check failed reminders with details
SELECT
    ar.id,
    ar.error_message,
    ar.created_at,
    a.id AS appointment_id,
    u.email AS client_email,
    b.name AS business_name
FROM public.appointment_reminders ar
JOIN public.appointments a ON ar.appointment_id = a.id
LEFT JOIN public.users u ON a.client_id = u.id
JOIN public.businesses b ON a.business_id = b.id
WHERE ar.status = 'failed'
ORDER BY ar.created_at DESC
LIMIT 10;
```

**Possible Causes:**

1. **Client has no email**
   - Error: "Cliente no tiene email registrado"
   - Solution: Ensure all clients have valid email in `users` table

2. **Appointment cancelled/invalid status**
   - Error: "Cita con status X, no válida para recordatorio"
   - Solution: This is expected behavior, reminder is auto-cancelled

3. **Resend API error**
   - Error: "Email sending failed: ..."
   - Solutions:
     - Check Resend API key is valid
     - Check Resend dashboard for delivery errors
     - Verify "from" address: citas@turnoapp.org is verified

4. **Edge function timeout**
   - Error: "Request timeout"
   - Solution: Increase timeout_milliseconds in trigger function (default: 60000ms)

5. **Invalid appointment data**
   - Error: "Appointment not found"
   - Solution: Ensure appointment still exists and has proper relations (employee, business, services)

### Problem: Cron job not executing

**Symptoms:**
- No new entries in `cron.job_run_details`
- Last execution is old

**Diagnosis:**
```sql
-- Check if job is active
SELECT * FROM cron.job WHERE jobname = 'process-appointment-reminders';

-- If active = false, job is disabled
```

**Possible Causes:**

1. **Job is disabled**
   - Solution: Re-schedule using `setup_cron_reminders.sql` STEP 4

2. **pg_cron extension not enabled**
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_cron';
   ```
   - Solution: `CREATE EXTENSION IF NOT EXISTS pg_cron;`

3. **Supabase project issue**
   - Solution: Contact Supabase support, pg_cron might be disabled at project level

### Manual Recovery

If reminders are stuck in pending state and should have been sent:

```sql
-- Option 1: Manually trigger processing
SELECT public.trigger_process_reminders();

-- Option 2: Reset specific reminders to retry
UPDATE public.appointment_reminders
SET scheduled_for = NOW() - INTERVAL '1 minute'
WHERE id IN ('[reminder-id-1]', '[reminder-id-2]', ...);

-- Then trigger processing
SELECT public.trigger_process_reminders();

-- Option 3: Cancel stuck reminders (last resort)
UPDATE public.appointment_reminders
SET status = 'cancelled',
    error_message = 'Manually cancelled - past scheduled time'
WHERE status = 'pending'
  AND scheduled_for < NOW() - INTERVAL '24 hours';
```

---

## ❓ FAQ

### Q: ¿Puedo cambiar el tiempo de anticipación del recordatorio?

**A:** Sí, puedes configurar `reminder_hours_before` por negocio:

```sql
UPDATE public.businesses
SET reminder_hours_before = 2.0  -- 2 hours
WHERE id = '[business-id]';
```

Valores recomendados:
- `1.5` = 1 hora 30 minutos (default, accounting for 15min cron delay)
- `2.0` = 2 horas
- `24.0` = 24 horas (día antes)

**Nota:** Los reminders existentes no se actualizan, solo afecta citas futuras.

### Q: ¿Por qué no envío múltiples reminders (24h + 1h)?

**A:** El sistema actualmente soporta UN reminder por tipo por cita. Para múltiples reminders:

**Opción 1: Cambiar lógica del trigger**
```sql
-- Crear 2 reminders: 24h y 1.5h antes
INSERT INTO appointment_reminders (appointment_id, reminder_type, scheduled_for)
VALUES
    (NEW.id, 'email', appointment_time - INTERVAL '24 hours'),
    (NEW.id, 'email', appointment_time - INTERVAL '1.5 hours');
```

**Problema:** UNIQUE constraint bloqueará esto (appointment_id, reminder_type, scheduled_for)

**Solución:** Agregar campo `reminder_sequence` al schema:
```sql
ALTER TABLE appointment_reminders
ADD COLUMN reminder_sequence INTEGER DEFAULT 1;

-- Update constraint
ALTER TABLE appointment_reminders
DROP CONSTRAINT appointment_reminders_appointment_id_reminder_type_scheduled_for_key;

ALTER TABLE appointment_reminders
ADD CONSTRAINT appointment_reminders_unique
UNIQUE (appointment_id, reminder_type, reminder_sequence);
```

### Q: ¿Cómo desactivo reminders para un negocio específico?

**A:**
```sql
UPDATE public.businesses
SET enable_reminders = FALSE
WHERE id = '[business-id]';
```

Esto previene creación de NUEVOS reminders. Para cancelar reminders pendientes:
```sql
UPDATE public.appointment_reminders
SET status = 'cancelled',
    error_message = 'Reminders disabled by business'
WHERE appointment_id IN (
    SELECT id FROM appointments WHERE business_id = '[business-id]'
)
AND status = 'pending';
```

### Q: ¿Puedo enviar SMS en lugar de email?

**A:** El schema ya soporta `reminder_type = 'sms'`, pero necesitas:

1. Integrar proveedor SMS (Twilio, AWS SNS, etc.)
2. Crear edge function `send-reminder-sms`
3. Actualizar `process-appointment-reminders` para manejar tipo 'sms'
4. Configurar `reminder_sms_enabled = TRUE` en businesses
5. Asegurar que clientes tengan `phone` en users table

### Q: ¿Qué pasa si cambio la hora de una cita después de crear el reminder?

**A:** Actualmente, el reminder NO se actualiza automáticamente. Debes:

**Opción 1: Mejorar el trigger**
```sql
-- En trigger function, detectar cambio de fecha/hora
IF OLD.appointment_date != NEW.appointment_date
   OR OLD.start_time != NEW.start_time THEN
    -- Cancelar reminders viejos
    UPDATE appointment_reminders SET status = 'cancelled'
    WHERE appointment_id = NEW.id AND status = 'pending';

    -- Crear nuevo reminder con tiempo actualizado
    -- ... (lógica de creación)
END IF;
```

**Opción 2: Workflow manual**
1. Cancelar appointment (cancela reminders automáticamente)
2. Crear nueva appointment con hora correcta

### Q: ¿Cómo pruebo en desarrollo sin enviar emails reales?

**A:** Usa Resend test mode:

1. **Usa test API key:**
   ```
   RESEND_API_KEY=re_test_...
   ```

2. **Verifica en Resend Dashboard → Logs**
   - Los emails de test no se envían realmente
   - Puedes ver el HTML renderizado

3. **Usa email de prueba:**
   ```sql
   -- Temporal test client
   UPDATE users SET email = 'test@resend.dev' WHERE id = '[test-client-id]';
   ```

4. **Check edge function logs:**
   - Supabase Dashboard → Edge Functions → send-reminder-email → Logs
   - Busca: "Email sent successfully"

### Q: ¿El cron job afecta el performance de mi app?

**A:** No, el cron job:
- ✅ Se ejecuta en el servidor de Supabase (no en tu app)
- ✅ Usa edge functions serverless (escala automáticamente)
- ✅ Procesa en batch (eficiente)
- ✅ Solo query reminders pendientes (índices optimizados)
- ✅ No bloquea transacciones de tu app

**Performance típico:**
- Procesar 100 reminders: ~10-15 segundos
- Carga de database: mínima (queries indexados)
- Carga de edge function: auto-scaling

### Q: ¿Puedo ver el contenido exacto del email que se envió?

**A:** Opciones:

1. **Resend Dashboard:**
   - Dashboard → Emails
   - Click en email específico
   - Ver HTML rendered y metadata

2. **BCC a admin email:**
   ```typescript
   // En send-reminder-email/index.ts
   const emailResponse = await fetch('https://api.resend.com/emails', {
       body: JSON.stringify({
           from: 'TuTurno <citas@turnoapp.org>',
           to: [data.clientEmail],
           bcc: ['admin@tuturno.com'],  // ← Add this
           subject: emailTemplate.subject,
           html: emailTemplate.html,
       }),
   });
   ```

3. **Guardar en database:**
   ```sql
   ALTER TABLE appointment_reminders ADD COLUMN email_html TEXT;

   -- Update después de enviar
   UPDATE appointment_reminders
   SET email_html = '[html-content]'
   WHERE id = '[reminder-id]';
   ```

---

## 📚 Additional Resources

- [Supabase pg_cron Documentation](https://supabase.com/docs/guides/database/extensions/pg_cron)
- [Supabase pg_net Documentation](https://supabase.com/docs/guides/database/extensions/pgnet)
- [Resend API Documentation](https://resend.com/docs)
- [PostgreSQL Triggers Documentation](https://www.postgresql.org/docs/current/trigger-definition.html)

---

## 📝 Changelog

### 2025-10-22 - Initial Release

- ✅ Created `appointment_reminders` table
- ✅ Implemented database trigger `create_appointment_reminders()`
- ✅ Created edge function `send-reminder-email`
- ✅ Created edge function `process-appointment-reminders`
- ✅ Configured pg_cron job (every 15 minutes)
- ✅ Updated default reminder time to 1.5 hours
- ✅ Created comprehensive documentation
- ✅ Added helper functions and views for monitoring

---

**Last Updated:** 2025-10-22
**Version:** 1.0.0
**Status:** Production Ready ✅
