-- ========================================
-- POLÍTICAS RLS (ROW LEVEL SECURITY)
-- ========================================

-- ========================================
-- HABILITAR RLS EN TODAS LAS TABLAS
-- ========================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_absences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_special_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_reminders ENABLE ROW LEVEL SECURITY;

-- ========================================
-- POLÍTICAS - USERS
-- ========================================

CREATE POLICY "Anyone can insert users"
    ON public.users FOR INSERT
    TO public
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view their own profile"
    ON public.users FOR SELECT
    TO public
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.users FOR UPDATE
    TO public
    USING (auth.uid() = id);

CREATE POLICY "Business owners can view their appointment clients"
    ON public.users FOR SELECT
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM appointments
            JOIN businesses ON businesses.id = appointments.business_id
            WHERE appointments.client_id = users.id
            AND businesses.owner_id = auth.uid()
        )
    );

-- ========================================
-- POLÍTICAS - BUSINESS_CATEGORIES
-- ========================================

CREATE POLICY "Anyone can view business categories"
    ON public.business_categories FOR SELECT
    TO public
    USING (true);

-- ========================================
-- POLÍTICAS - BUSINESSES
-- ========================================

CREATE POLICY "Anyone can view active businesses"
    ON public.businesses FOR SELECT
    TO public
    USING (is_active = true);

CREATE POLICY "Business owners can manage their businesses"
    ON public.businesses FOR ALL
    TO public
    USING (auth.uid() = owner_id);

-- ========================================
-- POLÍTICAS - BUSINESS_HOURS
-- ========================================

CREATE POLICY "Anyone can view business hours"
    ON public.business_hours FOR SELECT
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM businesses
            WHERE businesses.id = business_hours.business_id
            AND businesses.is_active = true
        )
    );

CREATE POLICY "Business owners can manage their business hours"
    ON public.business_hours FOR ALL
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM businesses
            WHERE businesses.id = business_hours.business_id
            AND businesses.owner_id = auth.uid()
        )
    );

-- ========================================
-- POLÍTICAS - EMPLOYEES
-- ========================================

CREATE POLICY "Anyone can view active employees"
    ON public.employees FOR SELECT
    TO public
    USING (
        is_active = true 
        AND EXISTS (
            SELECT 1 FROM businesses
            WHERE businesses.id = employees.business_id
            AND businesses.is_active = true
        )
    );

CREATE POLICY "Business owners can manage their employees"
    ON public.employees FOR ALL
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM businesses
            WHERE businesses.id = employees.business_id
            AND businesses.owner_id = auth.uid()
        )
    );

-- ========================================
-- POLÍTICAS - EMPLOYEE_SCHEDULES
-- ========================================

CREATE POLICY "Anyone can view employee schedules"
    ON public.employee_schedules FOR SELECT
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM employees
            JOIN businesses ON businesses.id = employees.business_id
            WHERE employees.id = employee_schedules.employee_id
            AND employees.is_active = true
            AND businesses.is_active = true
        )
    );

CREATE POLICY "Business owners can manage employee schedules"
    ON public.employee_schedules FOR ALL
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM employees
            JOIN businesses ON businesses.id = employees.business_id
            WHERE employees.id = employee_schedules.employee_id
            AND businesses.owner_id = auth.uid()
        )
    );

-- ========================================
-- POLÍTICAS - SERVICES
-- ========================================

CREATE POLICY "Anyone can view active services"
    ON public.services FOR SELECT
    TO public
    USING (
        is_active = true
        AND EXISTS (
            SELECT 1 FROM businesses
            WHERE businesses.id = services.business_id
            AND businesses.is_active = true
        )
    );

CREATE POLICY "Business owners can manage their services"
    ON public.services FOR ALL
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM businesses
            WHERE businesses.id = services.business_id
            AND businesses.owner_id = auth.uid()
        )
    );

-- ========================================
-- POLÍTICAS - EMPLOYEE_SERVICES
-- ========================================

CREATE POLICY "Anyone can view employee services"
    ON public.employee_services FOR SELECT
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM employees
            JOIN businesses ON businesses.id = employees.business_id
            JOIN services ON services.business_id = businesses.id
            WHERE employees.id = employee_services.employee_id
            AND services.id = employee_services.service_id
            AND employees.is_active = true
            AND services.is_active = true
            AND businesses.is_active = true
        )
    );

CREATE POLICY "Business owners can manage employee services"
    ON public.employee_services FOR ALL
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM employees
            JOIN businesses ON businesses.id = employees.business_id
            WHERE employees.id = employee_services.employee_id
            AND businesses.owner_id = auth.uid()
        )
    );

-- ========================================
-- POLÍTICAS - APPOINTMENTS
-- ========================================

CREATE POLICY "Clients can create appointments"
    ON public.appointments FOR INSERT
    TO public
    WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can update their own appointments"
    ON public.appointments FOR UPDATE
    TO public
    USING (auth.uid() = client_id);

CREATE POLICY "Users can view their own appointments as clients"
    ON public.appointments FOR SELECT
    TO public
    USING (auth.uid() = client_id);

CREATE POLICY "Business owners can view appointments for their businesses"
    ON public.appointments FOR SELECT
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM businesses
            WHERE businesses.id = appointments.business_id
            AND businesses.owner_id = auth.uid()
        )
    );

CREATE POLICY "Business owners can create appointments for their businesses"
    ON public.appointments FOR INSERT
    TO public
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM businesses
            WHERE businesses.id = appointments.business_id
            AND businesses.owner_id = auth.uid()
        )
    );

CREATE POLICY "Business owners can update appointments for their businesses"
    ON public.appointments FOR UPDATE
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM businesses
            WHERE businesses.id = appointments.business_id
            AND businesses.owner_id = auth.uid()
        )
    );

-- ========================================
-- POLÍTICAS - APPOINTMENT_SERVICES
-- ========================================

CREATE POLICY "Users can view appointment services for their appointments"
    ON public.appointment_services FOR SELECT
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM appointments
            WHERE appointments.id = appointment_services.appointment_id
            AND (
                appointments.client_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM businesses
                    WHERE businesses.id = appointments.business_id
                    AND businesses.owner_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Users can manage appointment services for their appointments"
    ON public.appointment_services FOR ALL
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM appointments
            WHERE appointments.id = appointment_services.appointment_id
            AND (
                appointments.client_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM businesses
                    WHERE businesses.id = appointments.business_id
                    AND businesses.owner_id = auth.uid()
                )
            )
        )
    );

-- ========================================
-- POLÍTICAS - NOTIFICATIONS
-- ========================================

CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    TO public
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE
    TO public
    USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
    ON public.notifications FOR INSERT
    TO public
    WITH CHECK (true);

-- ========================================
-- POLÍTICAS - EMPLOYEE_ABSENCES
-- ========================================

CREATE POLICY "Business owners can manage their employees absences"
    ON public.employee_absences FOR ALL
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM employees
            JOIN businesses ON businesses.id = employees.business_id
            WHERE employees.id = employee_absences.employee_id
            AND businesses.owner_id = auth.uid()
        )
    );

-- ========================================
-- POLÍTICAS - SCHEDULE_OVERRIDES
-- ========================================

CREATE POLICY "Business owners can manage their employees schedule overrides"
    ON public.schedule_overrides FOR ALL
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM employees
            JOIN businesses ON businesses.id = employees.business_id
            WHERE employees.id = schedule_overrides.employee_id
            AND businesses.owner_id = auth.uid()
        )
    );

-- ========================================
-- POLÍTICAS - EMAIL_LOGS
-- ========================================

CREATE POLICY "Service role can manage email logs"
    ON public.email_logs FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

-- ========================================
-- POLÍTICAS - INVOICES
-- ========================================

CREATE POLICY "Clients can view their own invoices"
    ON public.invoices FOR SELECT
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM appointments
            WHERE appointments.id = invoices.appointment_id
            AND appointments.client_id = auth.uid()
        )
    );

CREATE POLICY "Business owners can view their business invoices"
    ON public.invoices FOR SELECT
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM appointments
            JOIN businesses ON businesses.id = appointments.business_id
            WHERE appointments.id = invoices.appointment_id
            AND businesses.owner_id = auth.uid()
        )
    );

CREATE POLICY "Business owners can create invoices"
    ON public.invoices FOR INSERT
    TO public
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM appointments
            JOIN businesses ON businesses.id = appointments.business_id
            WHERE appointments.id = invoices.appointment_id
            AND businesses.owner_id = auth.uid()
        )
    );

CREATE POLICY "Business owners can update their business invoices"
    ON public.invoices FOR UPDATE
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM appointments
            JOIN businesses ON businesses.id = appointments.business_id
            WHERE appointments.id = invoices.appointment_id
            AND businesses.owner_id = auth.uid()
        )
    );

-- ========================================
-- POLÍTICAS - PAYMENTS
-- ========================================

CREATE POLICY "Clients can view their payments"
    ON public.payments FOR SELECT
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM invoices
            JOIN appointments ON appointments.id = invoices.appointment_id
            WHERE invoices.id = payments.invoice_id
            AND appointments.client_id = auth.uid()
        )
    );

CREATE POLICY "Business owners can view their business payments"
    ON public.payments FOR SELECT
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM invoices
            JOIN appointments ON appointments.id = invoices.appointment_id
            JOIN businesses ON businesses.id = appointments.business_id
            WHERE invoices.id = payments.invoice_id
            AND businesses.owner_id = auth.uid()
        )
    );

CREATE POLICY "Business owners can create payments"
    ON public.payments FOR INSERT
    TO public
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM invoices
            JOIN appointments ON appointments.id = invoices.appointment_id
            JOIN businesses ON businesses.id = appointments.business_id
            WHERE invoices.id = payments.invoice_id
            AND businesses.owner_id = auth.uid()
        )
    );

-- ========================================
-- POLÍTICAS - BUSINESS_SPECIAL_HOURS
-- ========================================

CREATE POLICY "Anyone can view special hours of active businesses"
    ON public.business_special_hours FOR SELECT
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM businesses
            WHERE businesses.id = business_special_hours.business_id
            AND businesses.is_active = true
        )
    );

CREATE POLICY "Business owners can manage their special hours"
    ON public.business_special_hours FOR ALL
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM businesses
            WHERE businesses.id = business_special_hours.business_id
            AND businesses.owner_id = auth.uid()
        )
    );

-- ========================================
-- POLÍTICAS - APPOINTMENT_REMINDERS
-- ========================================

CREATE POLICY "Clients can view their own appointment reminders"
    ON public.appointment_reminders FOR SELECT
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM appointments
            WHERE appointments.id = appointment_reminders.appointment_id
            AND appointments.client_id = auth.uid()
        )
    );

CREATE POLICY "Business owners can view reminders for their appointments"
    ON public.appointment_reminders FOR SELECT
    TO public
    USING (
        EXISTS (
            SELECT 1 FROM appointments
            JOIN businesses ON businesses.id = appointments.business_id
            WHERE appointments.id = appointment_reminders.appointment_id
            AND businesses.owner_id = auth.uid()
        )
    );

CREATE POLICY "System can manage reminders"
    ON public.appointment_reminders FOR ALL
    TO public
    USING (true);
