-- ========================================
-- TRIGGERS
-- ========================================

-- ========================================
-- TRIGGERS DE ACTUALIZACIÓN DE TIMESTAMPS
-- ========================================

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_businesses_updated_at
    BEFORE UPDATE ON public.businesses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employees_updated_at
    BEFORE UPDATE ON public.employees
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at
    BEFORE UPDATE ON public.services
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_absences_updated_at
    BEFORE UPDATE ON public.employee_absences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedule_overrides_updated_at
    BEFORE UPDATE ON public.schedule_overrides
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_special_hours_updated_at
    BEFORE UPDATE ON public.business_special_hours
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- TRIGGERS DE LÓGICA DE NEGOCIO - BUSINESSES
-- ========================================

CREATE TRIGGER update_business_location_trigger
    BEFORE INSERT OR UPDATE ON public.businesses
    FOR EACH ROW
    EXECUTE FUNCTION update_business_location();

COMMENT ON TRIGGER update_business_location_trigger ON public.businesses 
    IS 'Sincroniza automáticamente el punto geográfico con latitud/longitud';

-- ========================================
-- TRIGGERS DE LÓGICA DE NEGOCIO - APPOINTMENTS
-- ========================================

CREATE TRIGGER check_appointment_conflicts_trigger
    BEFORE INSERT OR UPDATE ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION check_appointment_conflicts();

COMMENT ON TRIGGER check_appointment_conflicts_trigger ON public.appointments 
    IS 'Previene conflictos de horario en citas';

CREATE TRIGGER appointment_notification_trigger
    AFTER INSERT OR UPDATE ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION create_appointment_notification();

COMMENT ON TRIGGER appointment_notification_trigger ON public.appointments 
    IS 'Crea notificaciones cuando se confirma o cancela una cita';

CREATE TRIGGER create_appointment_reminders_trigger
    AFTER INSERT OR UPDATE ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION create_appointment_reminders();

COMMENT ON TRIGGER create_appointment_reminders_trigger ON public.appointments 
    IS 'Programa recordatorios automáticos para citas confirmadas';

CREATE TRIGGER create_invoice_on_appointment_completion
    AFTER INSERT OR UPDATE ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION create_invoice_on_completion();

COMMENT ON TRIGGER create_invoice_on_appointment_completion ON public.appointments 
    IS 'Genera factura automáticamente al completar una cita';

-- ========================================
-- TRIGGERS DE LÓGICA DE NEGOCIO - APPOINTMENT_SERVICES
-- ========================================

CREATE TRIGGER calculate_appointment_total_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.appointment_services
    FOR EACH ROW
    EXECUTE FUNCTION calculate_appointment_total();

COMMENT ON TRIGGER calculate_appointment_total_trigger ON public.appointment_services 
    IS 'Recalcula el total de la cita cuando se modifican sus servicios';

-- ========================================
-- TRIGGERS DE LÓGICA DE NEGOCIO - PAYMENTS
-- ========================================

CREATE TRIGGER update_invoice_status_on_payment_trigger
    AFTER INSERT ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_status_on_payment();

COMMENT ON TRIGGER update_invoice_status_on_payment_trigger ON public.payments 
    IS 'Actualiza estado de factura a pagada cuando se completa el pago';
