-- ========================================
-- TIPOS ENUM PERSONALIZADOS
-- ========================================

-- Tipo para el estado de las citas
CREATE TYPE public.appointment_status AS ENUM (
    'pending',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled',
    'no_show'
);

-- Tipo para el estado de las facturas
CREATE TYPE public.invoice_status AS ENUM (
    'paid',
    'pending',
    'cancelled'
);

-- Tipo para los tipos de notificación
CREATE TYPE public.notification_type AS ENUM (
    'appointment_confirmed',
    'appointment_reminder',
    'appointment_cancelled',
    'appointment_rescheduled'
);

-- Tipo para los métodos de pago
CREATE TYPE public.payment_method AS ENUM (
    'cash',
    'transfer'
);