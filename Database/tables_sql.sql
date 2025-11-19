-- ========================================
-- TABLAS
-- ========================================

-- ========================================
-- 1. TABLA USERS
-- ========================================
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    is_business_owner BOOLEAN DEFAULT FALSE,
    is_client BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.users IS 'Perfil de usuarios del sistema';

-- ========================================
-- 2. TABLA BUSINESS_CATEGORIES
-- ========================================
CREATE TABLE public.business_categories (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    icon_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.business_categories IS 'Categorías de negocios disponibles';

-- ========================================
-- 3. TABLA BUSINESSES
-- ========================================
CREATE TABLE public.businesses (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    address TEXT NOT NULL,
    latitude NUMERIC,
    longitude NUMERIC,
    location GEOGRAPHY(POINT, 4326),
    business_category_id UUID REFERENCES public.business_categories(id),
    logo_url TEXT,
    cover_image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Configuración de políticas de cancelación
    cancellation_policy_hours INTEGER DEFAULT 24,
    cancellation_policy_text TEXT DEFAULT 'Las citas deben ser canceladas con al menos 24 horas de anticipación.',
    allow_client_cancellation BOOLEAN DEFAULT TRUE,
    allow_client_reschedule BOOLEAN DEFAULT TRUE,
    
    -- Configuración de reservas
    min_booking_hours INTEGER DEFAULT 1,
    max_booking_days INTEGER DEFAULT 90,
    
    -- Configuración de recordatorios
    enable_reminders BOOLEAN DEFAULT TRUE,
    reminder_hours_before INTEGER DEFAULT 24,
    reminder_sms_enabled BOOLEAN DEFAULT FALSE,
    reminder_email_enabled BOOLEAN DEFAULT TRUE,
    reminder_push_enabled BOOLEAN DEFAULT TRUE,
    
    -- Configuración de pagos
    require_deposit BOOLEAN DEFAULT FALSE,
    deposit_percentage INTEGER DEFAULT 0 CHECK (deposit_percentage >= 0 AND deposit_percentage <= 100),
    auto_confirm_appointments BOOLEAN DEFAULT FALSE
);

COMMENT ON TABLE public.businesses IS 'Información de los negocios registrados';
COMMENT ON COLUMN public.businesses.cancellation_policy_hours IS 'Horas de anticipación requeridas para cancelar';
COMMENT ON COLUMN public.businesses.min_booking_hours IS 'Horas mínimas de anticipación para reservar';
COMMENT ON COLUMN public.businesses.max_booking_days IS 'Días máximos hacia el futuro para reservar';
COMMENT ON COLUMN public.businesses.reminder_hours_before IS 'Horas antes de la cita para enviar recordatorio';

-- ========================================
-- 4. TABLA BUSINESS_HOURS
-- ========================================
CREATE TABLE public.business_hours (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    open_time TIME NOT NULL,
    close_time TIME NOT NULL,
    is_closed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.business_hours IS 'Horarios de operación de los negocios';
COMMENT ON COLUMN public.business_hours.day_of_week IS '0 = Domingo, 1 = Lunes, ..., 6 = Sábado';

-- ========================================
-- 5. TABLA EMPLOYEES
-- ========================================
CREATE TABLE public.employees (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    position TEXT,
    bio TEXT,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.employees IS 'Empleados de los negocios';

-- ========================================
-- 6. TABLA EMPLOYEE_SCHEDULES
-- ========================================
CREATE TABLE public.employee_schedules (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.employee_schedules IS 'Horarios de trabajo de los empleados';

-- ========================================
-- 7. TABLA SERVICES
-- ========================================
CREATE TABLE public.services (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    price NUMERIC NOT NULL CHECK (price >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.services IS 'Servicios ofrecidos por los negocios';

-- ========================================
-- 8. TABLA EMPLOYEE_SERVICES
-- ========================================
CREATE TABLE public.employee_services (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.employee_services IS 'Relación entre empleados y servicios que pueden realizar';

-- ========================================
-- 9. TABLA APPOINTMENTS
-- ========================================
CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status public.appointment_status DEFAULT 'pending',
    total_price NUMERIC DEFAULT 0,
    notes TEXT,
    client_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Para clientes walk-in (sin cuenta)
    walk_in_client_name TEXT,
    walk_in_client_phone TEXT
);

COMMENT ON TABLE public.appointments IS 'Citas agendadas';
COMMENT ON COLUMN public.appointments.client_id IS 'ID del cliente registrado (opcional si es walk-in)';
COMMENT ON COLUMN public.appointments.walk_in_client_name IS 'Nombre del cliente walk-in sin cuenta';
COMMENT ON COLUMN public.appointments.walk_in_client_phone IS 'Teléfono del cliente walk-in (opcional)';

-- ========================================
-- 10. TABLA APPOINTMENT_SERVICES
-- ========================================
CREATE TABLE public.appointment_services (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
    price NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.appointment_services IS 'Servicios incluidos en cada cita';

-- ========================================
-- 11. TABLA NOTIFICATIONS
-- ========================================
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
    type public.notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.notifications IS 'Notificaciones para usuarios';

-- ========================================
-- 12. TABLA EMPLOYEE_ABSENCES
-- ========================================
CREATE TABLE public.employee_absences (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    absence_date DATE NOT NULL,
    reason TEXT NOT NULL CHECK (reason = ANY (ARRAY['enfermedad'::text, 'vacaciones'::text, 'personal'::text, 'emergencia'::text, 'otro'::text])),
    is_full_day BOOLEAN DEFAULT TRUE,
    start_time TIME,
    end_time TIME,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.employee_absences IS 'Registro de ausencias de empleados';

-- ========================================
-- 13. TABLA SCHEDULE_OVERRIDES
-- ========================================
CREATE TABLE public.schedule_overrides (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    override_date DATE NOT NULL,
    is_available BOOLEAN DEFAULT FALSE,
    start_time TIME,
    end_time TIME,
    reason TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.schedule_overrides IS 'Cambios temporales en horarios de empleados';

-- ========================================
-- 14. TABLA EMAIL_LOGS
-- ========================================
CREATE TABLE public.email_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email_type TEXT NOT NULL,
    email_to TEXT NOT NULL,
    status TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    error_message TEXT,
    resend_email_id TEXT,
    metadata JSONB
);

COMMENT ON TABLE public.email_logs IS 'Registro de emails enviados';

-- ========================================
-- 15. TABLA INVOICES
-- ========================================
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    appointment_id UUID UNIQUE NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    invoice_number TEXT UNIQUE NOT NULL,
    subtotal NUMERIC DEFAULT 0,
    tax NUMERIC DEFAULT 0,
    discount NUMERIC DEFAULT 0,
    total NUMERIC DEFAULT 0,
    status public.invoice_status DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.invoices IS 'Facturas generadas al completar citas';
COMMENT ON COLUMN public.invoices.invoice_number IS 'Número de factura único formato: INV-YYYY-0001';

-- ========================================
-- 16. TABLA PAYMENTS
-- ========================================
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    payment_method public.payment_method NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    transfer_reference TEXT UNIQUE,
    payment_date TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.payments IS 'Registros de pagos realizados por facturas';
COMMENT ON COLUMN public.payments.transfer_reference IS 'Número de referencia de transferencia (único, solo para método transfer)';

-- ========================================
-- 17. TABLA BUSINESS_SPECIAL_HOURS
-- ========================================
CREATE TABLE public.business_special_hours (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    special_date DATE NOT NULL,
    is_closed BOOLEAN DEFAULT FALSE,
    open_time TIME,
    close_time TIME,
    reason TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.business_special_hours IS 'Horarios especiales y feriados para negocios';

-- ========================================
-- 18. TABLA APPOINTMENT_REMINDERS
-- ========================================
CREATE TABLE public.appointment_reminders (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    reminder_type TEXT NOT NULL CHECK (reminder_type = ANY (ARRAY['email'::text, 'sms'::text, 'push'::text])),
    scheduled_for TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text, 'cancelled'::text])),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(appointment_id, reminder_type, scheduled_for)
);

COMMENT ON TABLE public.appointment_reminders IS 'Recordatorios programados para citas';

-- ========================================
-- ÍNDICES
-- ========================================

-- Índices para mejorar el rendimiento de consultas comunes
CREATE INDEX idx_businesses_owner ON public.businesses(owner_id);
CREATE INDEX idx_businesses_category ON public.businesses(business_category_id);
CREATE INDEX idx_businesses_active ON public.businesses(is_active);
CREATE INDEX idx_businesses_location ON public.businesses USING GIST(location);

CREATE INDEX idx_business_hours_business ON public.business_hours(business_id);
CREATE INDEX idx_business_hours_day ON public.business_hours(day_of_week);

CREATE INDEX idx_employees_business ON public.employees(business_id);
CREATE INDEX idx_employees_active ON public.employees(is_active);

CREATE INDEX idx_employee_schedules_employee ON public.employee_schedules(employee_id);
CREATE INDEX idx_employee_schedules_day ON public.employee_schedules(day_of_week);

CREATE INDEX idx_services_business ON public.services(business_id);
CREATE INDEX idx_services_active ON public.services(is_active);

CREATE INDEX idx_employee_services_employee ON public.employee_services(employee_id);
CREATE INDEX idx_employee_services_service ON public.employee_services(service_id);

CREATE INDEX idx_appointments_business ON public.appointments(business_id);
CREATE INDEX idx_appointments_client ON public.appointments(client_id);
CREATE INDEX idx_appointments_employee ON public.appointments(employee_id);
CREATE INDEX idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX idx_appointments_status ON public.appointments(status);
CREATE INDEX idx_appointments_date_status ON public.appointments(appointment_date, status);

CREATE INDEX idx_appointment_services_appointment ON public.appointment_services(appointment_id);
CREATE INDEX idx_appointment_services_service ON public.appointment_services(service_id);

CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_appointment ON public.notifications(appointment_id);

CREATE INDEX idx_employee_absences_employee ON public.employee_absences(employee_id);
CREATE INDEX idx_employee_absences_date ON public.employee_absences(absence_date);

CREATE INDEX idx_schedule_overrides_employee ON public.schedule_overrides(employee_id);
CREATE INDEX idx_schedule_overrides_date ON public.schedule_overrides(override_date);

CREATE INDEX idx_invoices_appointment ON public.invoices(appointment_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);

CREATE INDEX idx_payments_invoice ON public.payments(invoice_id);
CREATE INDEX idx_payments_method ON public.payments(payment_method);

CREATE INDEX idx_business_special_hours_business ON public.business_special_hours(business_id);
CREATE INDEX idx_business_special_hours_date ON public.business_special_hours(special_date);

CREATE INDEX idx_appointment_reminders_appointment ON public.appointment_reminders(appointment_id);
CREATE INDEX idx_appointment_reminders_scheduled ON public.appointment_reminders(scheduled_for);
CREATE INDEX idx_appointment_reminders_status ON public.appointment_reminders(status);
