-- ============================================================================
-- MIGRACIÓN: Configuración de Prefijos de Facturación
-- Fecha: 2025-10-22
-- Descripción: Agrega soporte para prefijos personalizados por negocio
--              y secuencias independientes para evitar duplicados
-- ============================================================================

-- 1. AGREGAR CAMPOS A LA TABLA BUSINESSES
-- ============================================================================
-- Campos para configurar el formato de numeración de facturas por negocio

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS invoice_prefix varchar(10),
  ADD COLUMN IF NOT EXISTS invoice_sequential_start integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS invoice_prefix_locked boolean DEFAULT false;

COMMENT ON COLUMN businesses.invoice_prefix IS
  'Prefijo personalizado para números de factura (ej: SALON, BARBER, SPA). Máximo 10 caracteres alfanuméricos.';

COMMENT ON COLUMN businesses.invoice_sequential_start IS
  'Número inicial de la secuencia de facturas. Por defecto inicia en 1.';

COMMENT ON COLUMN businesses.invoice_prefix_locked IS
  'Indica si el prefijo está bloqueado (true después de emitir primera factura para mantener integridad contable).';


-- 2. AGREGAR BUSINESS_ID A INVOICES (PRIMERO)
-- ============================================================================
-- Este campo es crítico para asociar facturas con negocios
-- IMPORTANTE: Debe agregarse ANTES de modificar constraints

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES businesses(id);


-- 3. POBLAR BUSINESS_ID EN FACTURAS EXISTENTES
-- ============================================================================
-- Si hay facturas sin business_id, obtenerlo desde appointments

UPDATE invoices i
SET business_id = a.business_id
FROM appointments a
WHERE i.appointment_id = a.id
  AND i.business_id IS NULL;


-- 4. MODIFICAR CONSTRAINT DE INVOICES
-- ============================================================================
-- Cambiar de UNIQUE global a UNIQUE por negocio para evitar conflictos

-- Eliminar constraint global si existe
ALTER TABLE invoices
  DROP CONSTRAINT IF EXISTS invoices_invoice_number_key;

-- Agregar constraint único por negocio
-- Esto permite que diferentes negocios tengan la misma numeración
-- Ej: Negocio A: SALON-2025-0001, Negocio B: BARBER-2025-0001
ALTER TABLE invoices
  ADD CONSTRAINT invoices_business_invoice_number_unique
  UNIQUE (business_id, invoice_number);


-- 5. HACER BUSINESS_ID NOT NULL (opcional, recomendado)
-- ============================================================================
-- Después de poblar, hacer la columna obligatoria

-- Descomentar si quieres hacer business_id obligatorio:
-- ALTER TABLE invoices
--   ALTER COLUMN business_id SET NOT NULL;


-- 6. CREAR ÍNDICE PARA MEJOR PERFORMANCE
-- ============================================================================
-- Índice compuesto para acelerar consultas de facturas por negocio y año

CREATE INDEX IF NOT EXISTS idx_invoices_business_year
  ON invoices(business_id, invoice_number);


-- 7. ACTUALIZAR FUNCIÓN generate_invoice_number (EXISTENTE)
-- ============================================================================
-- Modificar la función existente para recibir business_id y usar prefijos
-- CAMBIO: Ahora recibe p_business_id como parámetro

CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_business_id uuid)
RETURNS TEXT
LANGUAGE plpgsql
AS $function$
DECLARE
  business_prefix text;
  current_year text;
  invoice_count integer;
  sequential_start integer;
  new_invoice_number text;
  lock_key bigint;
BEGIN
  -- Obtener configuración del negocio
  SELECT
    invoice_prefix,
    COALESCE(invoice_sequential_start, 1)
  INTO business_prefix, sequential_start
  FROM businesses
  WHERE id = p_business_id;

  -- Validar que el negocio tenga prefijo configurado
  IF business_prefix IS NULL OR business_prefix = '' THEN
    RAISE EXCEPTION 'El negocio debe configurar el prefijo de factura en Configuración → Facturación antes de emitir facturas';
  END IF;

  -- Obtener año actual
  current_year := EXTRACT(YEAR FROM CURRENT_DATE)::text;

  -- Advisory lock específico por negocio (para evitar race conditions)
  lock_key := hashtext('invoice_number_' || p_business_id::text);
  PERFORM pg_advisory_xact_lock(lock_key);

  -- Contar facturas del año actual para este negocio específico
  SELECT COUNT(*) INTO invoice_count
  FROM invoices
  WHERE business_id = p_business_id
    AND invoice_number LIKE business_prefix || '-' || current_year || '-%';

  -- Generar número de factura con formato: PREFIX-YEAR-SEQUENTIAL
  -- Ejemplo: Si prefix='SALON', year='2025', count=0, start=1 → SALON-2025-0001
  new_invoice_number := business_prefix || '-' || current_year || '-' ||
                        LPAD((sequential_start + invoice_count)::text, 4, '0');

  RETURN new_invoice_number;
END;
$function$;

COMMENT ON FUNCTION public.generate_invoice_number(uuid) IS
  'Genera el siguiente número de factura para un negocio específico. Formato: {PREFIX}-{YEAR}-{SEQUENTIAL} (thread-safe con advisory lock por negocio)';


-- 8. ACTUALIZAR FUNCIÓN create_invoice_on_completion (EXISTENTE)
-- ============================================================================
-- Modificar la función existente para pasar business_id a generate_invoice_number
-- CAMBIO: Ahora obtiene business_id del appointment y lo pasa a la función

CREATE OR REPLACE FUNCTION public.create_invoice_on_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_invoice_id UUID;
  v_invoice_number TEXT;
  v_business_id UUID;
BEGIN
  -- Solo crear factura si la cita pasa a estado 'completed' y no existe factura
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    -- Verificar si ya existe una factura para esta cita
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE appointment_id = NEW.id) THEN

      -- Obtener business_id del appointment
      v_business_id := NEW.business_id;

      -- Generar número de factura usando la función con business_id
      v_invoice_number := generate_invoice_number(v_business_id);

      -- Crear factura con el total de la cita
      INSERT INTO public.invoices (
        appointment_id,
        business_id,
        invoice_number,
        subtotal,
        tax,
        discount,
        total,
        status,
        created_at,
        updated_at
      ) VALUES (
        NEW.id,
        v_business_id,
        v_invoice_number,
        NEW.total_price,
        0,
        0,
        NEW.total_price,
        'pending',
        NOW(),
        NOW()
      );

      RAISE NOTICE 'Factura % creada para cita % del negocio %', v_invoice_number, NEW.id, v_business_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.create_invoice_on_completion IS
  'Genera automáticamente una factura con prefijo del negocio al completar una cita';


-- 9. CREAR TRIGGER PARA BLOQUEAR PREFIJO DESPUÉS DE PRIMERA FACTURA
-- ============================================================================
-- Bloquea automáticamente el prefijo después de emitir la primera factura
-- Esto previene cambios que podrían causar inconsistencias contables

CREATE OR REPLACE FUNCTION public.lock_invoice_prefix_on_first_invoice()
RETURNS TRIGGER AS $$
BEGIN
  -- Bloquear prefijo automáticamente al emitir primera factura
  -- Solo se ejecuta si el prefijo no estaba bloqueado antes
  UPDATE businesses
  SET invoice_prefix_locked = true
  WHERE id = NEW.business_id
    AND invoice_prefix_locked = false;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Eliminar trigger si existe (para re-crearlo)
DROP TRIGGER IF EXISTS trigger_lock_invoice_prefix ON invoices;

-- Crear trigger
CREATE TRIGGER trigger_lock_invoice_prefix
  AFTER INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION lock_invoice_prefix_on_first_invoice();

COMMENT ON FUNCTION public.lock_invoice_prefix_on_first_invoice() IS
  'Bloquea el prefijo de factura automáticamente después de emitir la primera factura para mantener integridad contable';


-- ============================================================================
-- NOTAS FINALES
-- ============================================================================
--
-- CAMBIOS REALIZADOS:
--
-- 1. ✅ Agregados campos a 'businesses': invoice_prefix, invoice_sequential_start, invoice_prefix_locked
--
-- 2. ✅ Modificado constraint de 'invoices': UNIQUE (business_id, invoice_number)
--    - Antes: UNIQUE (invoice_number) - GLOBAL (causaba duplicados)
--    - Ahora: UNIQUE (business_id, invoice_number) - POR NEGOCIO
--
-- 3. ✅ Actualizada función generate_invoice_number():
--    - Antes: generate_invoice_number() → 'INV-2025-0001' (global)
--    - Ahora: generate_invoice_number(business_id) → 'SALON-2025-0001' (por negocio)
--
-- 4. ✅ Actualizada función create_invoice_on_completion():
--    - Ahora pasa business_id a generate_invoice_number()
--    - Agrega business_id al INSERT de invoices
--
-- 5. ✅ Nuevo trigger lock_invoice_prefix_on_first_invoice:
--    - Bloquea prefijo automáticamente después de primera factura
--
-- PRÓXIMOS PASOS:
--
-- 1. Los negocios deberán configurar su prefijo en:
--    Dashboard → Configuración → Ajustes Avanzados → Facturación
--
-- 2. Formato de facturas: {PREFIX}-{YEAR}-{SEQUENTIAL}
--    Ejemplos: SALON-2025-0001, BARBER-2025-0002
--
-- 3. El prefijo se bloqueará automáticamente después de emitir la primera
--    factura para mantener consistencia contable
--
-- 4. Cada negocio tiene su propia secuencia independiente, evitando conflictos
--
-- 5. Si un negocio intenta emitir una factura sin configurar el prefijo,
--    recibirá un error descriptivo indicándole que debe configurarlo primero
--
-- ============================================================================
