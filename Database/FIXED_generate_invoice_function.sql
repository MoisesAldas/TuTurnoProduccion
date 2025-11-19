-- ========================================
-- FIX: Race Condition en generate_invoice_number
-- Copia y pega este SQL completo en Supabase SQL Editor
-- ========================================

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $function$
DECLARE
    current_year TEXT := EXTRACT(YEAR FROM NOW())::TEXT;
    last_invoice_num INTEGER;
    new_invoice_num TEXT;
    lock_key BIGINT := hashtext('invoice_number_generation');
BEGIN
    -- Adquirir lock exclusivo para evitar race conditions
    PERFORM pg_advisory_xact_lock(lock_key);

    -- Obtener el último número de factura del año actual
    SELECT
        COALESCE(
            MAX(
                CAST(
                    SUBSTRING(invoice_number FROM 'INV-' || current_year || '-([0-9]+)')
                    AS INTEGER
                )
            ),
            0
        )
    INTO last_invoice_num
    FROM public.invoices
    WHERE invoice_number LIKE 'INV-' || current_year || '-%';

    -- Generar nuevo número con formato: INV-2025-0001
    new_invoice_num := 'INV-' || current_year || '-' || LPAD((last_invoice_num + 1)::TEXT, 4, '0');

    RETURN new_invoice_num;
END;
$function$;

COMMENT ON FUNCTION public.generate_invoice_number IS 'Genera número único de factura con formato INV-YYYY-NNNN (thread-safe con advisory lock)';
