# PLAN COMPLETO: SISTEMA DE CIERRE DE CAJA DIARIO PARA TUTURNO

**Fecha:** 2025-01-10
**Autor:** Claude Code
**Versión:** 1.0
**Estimación Total:** 6-7 semanas (30-35 días hábiles)

---

## ÍNDICE

1. [Análisis del Sistema Actual](#1-análisis-del-sistema-actual)
2. [Arquitectura de la Solución](#2-arquitectura-de-la-solución)
3. [Database Schema Completo](#3-database-schema-completo)
4. [Triggers y Funciones SQL](#4-triggers-y-funciones-sql)
5. [Features Detalladas](#5-features-detalladas)
6. [Roadmap de Implementación](#6-roadmap-de-implementación)
7. [Estimación de Complejidad](#7-estimación-de-complejidad)
8. [Notas Finales](#8-notas-finales)

---

## 1. ANÁLISIS DEL SISTEMA ACTUAL

### 1.1 QUÉ EXISTE ACTUALMENTE

#### TABLAS RELACIONADAS CON DINERO

**✅ appointments (Citas)**
- Campo `total_price` (numeric): precio total de la cita
- Estados: pending, confirmed, in_progress, completed, cancelled, no_show
- Trigger automático: calcula total sumando servicios

**✅ appointment_services (Servicios por Cita)**
- Campo `price` (numeric): precio del servicio en la cita
- Relaciona citas con servicios
- Trigger: actualiza `appointments.total_price` automáticamente

**✅ invoices (Facturas)**
- Creación automática cuando appointment.status → 'completed'
- Campos: `subtotal`, `tax`, `discount`, `total`
- Estados: paid, pending, cancelled
- Número único: INV-YYYY-0001 (auto-generado)
- Trigger: `create_invoice_on_completion()`

**✅ payments (Pagos)**
- Métodos: cash, transfer
- Campo `transfer_reference` (único)
- Trigger: actualiza invoice.status a 'paid' cuando se completa el pago
- Función: `update_invoice_status_on_payment()`

**✅ services (Servicios)**
- Campo `price` (numeric): precio base del servicio
- Campo `duration_minutes`: duración

**✅ employees (Empleados)**
- ❌ NO tiene campos de salario o comisiones
- Solo datos personales y avatar

#### SISTEMA DE COBROS ACTUAL

**CheckoutModal Component:**
- Ubicación: `src/components/CheckoutModal.tsx`
- Flujo:
  1. Selecciona método de pago (cash/transfer)
  2. Si transfer: ingresa número de referencia
  3. Marca appointment como 'completed' (si no lo está)
  4. Espera a que trigger cree invoice
  5. Registra payment en la tabla payments
  6. Trigger actualiza invoice.status a 'paid'
- ❌ No hay validación de cierre de caja
- ❌ No se registra en qué "turno" o "caja" se cobró

#### REPORTES/ANALYTICS EXISTENTES

**✅ Página: `/dashboard/business/analytics`**
- Funciones RPC utilizadas:
  - `get_business_sales_report()`: ingresos, citas completadas/canceladas, ticket promedio, pagos por método
  - `get_daily_revenue()`: ingresos diarios
  - `get_employee_performance()`: citas por empleado, tasa de completado
  - `get_top_services()`: servicios más vendidos
  - `get_payment_methods_distribution()`: distribución cash/transfer
  - `get_client_metrics()`: clientes únicos, nuevos, recurrentes

**Datos disponibles:**
- ✅ Total revenue (solo pagos completados)
- ✅ Distribución cash vs transfer
- ✅ Ingresos por empleado
- ❌ NO hay registro de gastos
- ❌ NO hay registro de pagos a empleados
- ❌ NO hay concepto de "caja inicial"
- ❌ NO hay arqueo de caja

### 1.2 QUÉ FALTA

#### ❌ GESTIÓN DE GASTOS
- No existe tabla para registrar gastos del negocio
- No hay categorías de gastos
- No hay comprobantes/facturas de proveedores
- No hay relación gastos-empleado (quién realizó el gasto)

#### ❌ GESTIÓN DE NÓMINA/PAGOS A EMPLEADOS
- No existe tabla de salarios
- No hay registro de pagos a empleados
- No hay sistema de comisiones
- No hay anticipos/bonos/deducciones
- No hay contratos o configuración de salario base

#### ❌ CIERRE DE CAJA
- No existe concepto de "caja diaria"
- No hay registro de efectivo inicial
- No hay arqueo (comparar efectivo esperado vs real)
- No hay turnos o cajas múltiples
- No hay registro de quién abre/cierra la caja

---

## 2. ARQUITECTURA DE LA SOLUCIÓN

### 2.1 DIAGRAMA DE TABLAS Y RELACIONES

```
┌─────────────────────────────────────────────────────────────────┐
│                    SISTEMA DE CIERRE DE CAJA                    │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐
│   businesses     │◄────────│ daily_cash_       │
│                  │         │   register        │
│  - id            │         │                   │
│  - name          │         │  - id             │
│  - owner_id      │         │  - business_id    │
└──────────────────┘         │  - opened_by      │
                             │  - closed_by      │
        ▲                    │  - opening_date   │
        │                    │  - closing_date   │
        │                    │  - opening_cash   │
        │                    │  - expected_cash  │
        │                    │  - actual_cash    │
        │                    │  - cash_difference│
        │                    │  - total_income   │
        │                    │  - total_expenses │
        │                    │  - total_transfers│
        │                    │  - net_result     │
        │                    │  - status         │
        │                    │  - notes          │
        │                    └──────────────────┘
        │                             ▲
        │                             │
┌───────┴──────────┐                 │
│   employees      │                 │
│                  │                 │
│  - id            │                 │
│  - business_id   │                 │
│  - first_name    │                 │
│  - salary_type   │ (NEW)           │
│  - base_salary   │ (NEW)           │
│  - commission_%  │ (NEW)           │
└──────────────────┘                 │
        ▲                             │
        │                             │
        │                             │
┌───────┴──────────┐         ┌───────┴──────────┐
│ employee_        │         │  business_       │
│  payments        │         │   expenses       │
│                  │         │                  │
│  - id            │         │  - id            │
│  - employee_id   │         │  - business_id   │
│  - business_id   │         │  - cash_register │
│  - cash_register │         │  - category      │
│  - payment_type  │         │  - amount        │
│  - amount        │         │  - description   │
│  - payment_date  │         │  - receipt_url   │
│  - period_start  │         │  - paid_by       │
│  - period_end    │         │  - expense_date  │
│  - notes         │         │  - payment_method│
│  - paid_by       │         │  - notes         │
└──────────────────┘         └──────────────────┘

┌──────────────────┐
│   payments       │ (EXISTING - enhance)
│                  │
│  - id            │
│  - invoice_id    │
│  - payment_method│
│  - amount        │
│  - cash_register │ (NEW - FK to daily_cash_register)
│  - payment_date  │
└──────────────────┘
```

### 2.2 RELACIONES CLAVE

**daily_cash_register (Tabla Central)**
- 1:N con business_expenses (una caja tiene muchos gastos)
- 1:N con employee_payments (una caja puede tener pagos a empleados)
- 1:N con payments (pagos de citas vinculados a caja abierta)
- N:1 con businesses (muchas cajas pertenecen a un negocio)
- N:1 con users (opened_by/closed_by)

**business_expenses**
- N:1 con daily_cash_register (opcional, puede ser NULL si no hay caja abierta)
- N:1 con employees (paid_by: quién realizó el gasto)

**employee_payments**
- N:1 con employees
- N:1 con daily_cash_register (opcional)

---

## 3. DATABASE SCHEMA COMPLETO

### 3.1 NUEVOS ENUMS

```sql
-- Tipos de pago a empleados
CREATE TYPE public.employee_payment_type AS ENUM (
  'salary',          -- Salario regular
  'commission',      -- Comisión por servicios
  'bonus',           -- Bono extraordinario
  'advance',         -- Anticipo
  'adjustment'       -- Ajuste (positivo o negativo)
);

-- Categorías de gastos
CREATE TYPE public.expense_category AS ENUM (
  'rent',            -- Arriendo/alquiler
  'utilities',       -- Servicios (luz, agua, internet)
  'supplies',        -- Suministros/insumos
  'maintenance',     -- Mantenimiento
  'marketing',       -- Marketing/publicidad
  'taxes',           -- Impuestos
  'insurance',       -- Seguros
  'equipment',       -- Equipamiento
  'salaries',        -- Salarios (automático desde employee_payments)
  'other'            -- Otros
);

-- Estado del cierre de caja
CREATE TYPE public.cash_register_status AS ENUM (
  'open',            -- Caja abierta (operativa)
  'closed',          -- Caja cerrada (esperando revisión)
  'reviewed',        -- Revisada por gerente/owner
  'reconciled'       -- Conciliada (cuadró perfectamente)
);

-- Tipo de salario de empleado
CREATE TYPE public.salary_type AS ENUM (
  'fixed',           -- Salario fijo mensual/quincenal
  'hourly',          -- Por hora
  'commission',      -- Solo comisión
  'mixed'            -- Fijo + comisión
);
```

### 3.2 TABLA: daily_cash_register

```sql
-- ========================================
-- TABLA PRINCIPAL: CIERRE DE CAJA DIARIO
-- ========================================
CREATE TABLE public.daily_cash_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,

  -- Usuario que abre/cierra
  opened_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  closed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Fechas y horarios
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  register_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Efectivo
  opening_cash NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (opening_cash >= 0),
  expected_cash NUMERIC(10, 2) DEFAULT 0,
  actual_cash NUMERIC(10, 2),
  cash_difference NUMERIC(10, 2),

  -- Totales del día (calculados)
  total_income NUMERIC(10, 2) DEFAULT 0,
  total_cash_income NUMERIC(10, 2) DEFAULT 0,
  total_transfer_income NUMERIC(10, 2) DEFAULT 0,
  total_expenses NUMERIC(10, 2) DEFAULT 0,
  total_cash_expenses NUMERIC(10, 2) DEFAULT 0,
  total_employee_payments NUMERIC(10, 2) DEFAULT 0,

  -- Resultado neto
  net_result NUMERIC(10, 2),

  -- Estado y observaciones
  status public.cash_register_status NOT NULL DEFAULT 'open',
  notes TEXT,
  closing_notes TEXT,

  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint: Solo una caja abierta por negocio por día
  CONSTRAINT unique_open_register_per_business_per_day
    UNIQUE (business_id, register_date, status)
    WHERE status = 'open'
);

-- Índices
CREATE INDEX idx_cash_register_business ON public.daily_cash_register(business_id);
CREATE INDEX idx_cash_register_date ON public.daily_cash_register(register_date);
CREATE INDEX idx_cash_register_status ON public.daily_cash_register(status);
```

### 3.3 TABLA: business_expenses

```sql
-- ========================================
-- TABLA: GASTOS DEL NEGOCIO
-- ========================================
CREATE TABLE public.business_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  cash_register_id UUID REFERENCES public.daily_cash_register(id) ON DELETE SET NULL,

  -- Detalles del gasto
  category public.expense_category NOT NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,

  -- Comprobante/recibo
  receipt_number TEXT,
  receipt_url TEXT,

  -- Quién realizó el gasto
  paid_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Fecha y método de pago
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method public.payment_method NOT NULL,

  -- Proveedor (opcional)
  vendor_name TEXT,
  vendor_tax_id TEXT,

  -- Observaciones
  notes TEXT,

  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_expenses_business ON public.business_expenses(business_id);
CREATE INDEX idx_expenses_cash_register ON public.business_expenses(cash_register_id);
CREATE INDEX idx_expenses_date ON public.business_expenses(expense_date);
```

### 3.4 TABLA: employee_payments

```sql
-- ========================================
-- TABLA: PAGOS A EMPLEADOS
-- ========================================
CREATE TABLE public.employee_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  cash_register_id UUID REFERENCES public.daily_cash_register(id) ON DELETE SET NULL,

  -- Tipo de pago
  payment_type public.employee_payment_type NOT NULL,

  -- Montos
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),

  -- Período (para salarios regulares)
  period_start DATE,
  period_end DATE,

  -- Método de pago
  payment_method public.payment_method NOT NULL,
  transfer_reference TEXT,

  -- Fecha de pago
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Quién autorizó/realizó el pago
  paid_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Observaciones
  notes TEXT,

  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_employee_payment_transfer_ref
    UNIQUE (transfer_reference)
    WHERE transfer_reference IS NOT NULL
);

-- Índices
CREATE INDEX idx_employee_payments_employee ON public.employee_payments(employee_id);
CREATE INDEX idx_employee_payments_business ON public.employee_payments(business_id);
CREATE INDEX idx_employee_payments_date ON public.employee_payments(payment_date);
```

### 3.5 ALTERACIONES A TABLAS EXISTENTES

```sql
-- ========================================
-- ALTER TABLE: employees
-- ========================================
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS salary_type public.salary_type DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS base_salary NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_percentage NUMERIC(5, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_frequency TEXT DEFAULT 'monthly';

-- ========================================
-- ALTER TABLE: payments
-- ========================================
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS cash_register_id UUID
    REFERENCES public.daily_cash_register(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payments_cash_register
  ON public.payments(cash_register_id);
```

---

## 4. TRIGGERS Y FUNCIONES SQL

### 4.1 Recalcular totales de caja automáticamente

```sql
CREATE OR REPLACE FUNCTION public.recalculate_cash_register_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_cash_register_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_cash_register_id := OLD.cash_register_id;
  ELSE
    v_cash_register_id := NEW.cash_register_id;
  END IF;

  IF v_cash_register_id IS NOT NULL THEN
    UPDATE public.daily_cash_register
    SET
      total_cash_income = COALESCE((
        SELECT SUM(p.amount) FROM public.payments p
        WHERE p.cash_register_id = v_cash_register_id
        AND p.payment_method = 'cash'
      ), 0),

      total_transfer_income = COALESCE((
        SELECT SUM(p.amount) FROM public.payments p
        WHERE p.cash_register_id = v_cash_register_id
        AND p.payment_method = 'transfer'
      ), 0),

      total_cash_expenses = COALESCE((
        SELECT SUM(e.amount) FROM public.business_expenses e
        WHERE e.cash_register_id = v_cash_register_id
        AND e.payment_method = 'cash'
      ), 0),

      total_employee_payments = COALESCE((
        SELECT SUM(ep.amount) FROM public.employee_payments ep
        WHERE ep.cash_register_id = v_cash_register_id
        AND ep.payment_method = 'cash'
      ), 0),

      updated_at = NOW()
    WHERE id = v_cash_register_id;

    -- Calcular totales y expected_cash
    UPDATE public.daily_cash_register
    SET
      total_income = total_cash_income + total_transfer_income,
      expected_cash = opening_cash + total_cash_income - total_cash_expenses - total_employee_payments,
      net_result = (total_cash_income + total_transfer_income) - total_expenses - total_employee_payments
    WHERE id = v_cash_register_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Triggers
CREATE TRIGGER recalc_cash_on_payment_change
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_cash_register_totals();

CREATE TRIGGER recalc_cash_on_expense_change
  AFTER INSERT OR UPDATE OR DELETE ON public.business_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_cash_register_totals();
```

### 4.2 Auto-asignar caja abierta a nuevos pagos

```sql
CREATE OR REPLACE FUNCTION public.assign_payment_to_open_cash_register()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_business_id UUID;
  v_open_register_id UUID;
BEGIN
  -- Obtener business_id
  SELECT a.business_id INTO v_business_id
  FROM public.invoices i
  JOIN public.appointments a ON a.id = i.appointment_id
  WHERE i.id = NEW.invoice_id;

  -- Buscar caja abierta
  SELECT id INTO v_open_register_id
  FROM public.daily_cash_register
  WHERE business_id = v_business_id
  AND register_date = CURRENT_DATE
  AND status = 'open'
  LIMIT 1;

  IF v_open_register_id IS NOT NULL THEN
    NEW.cash_register_id := v_open_register_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_assign_payment_to_cash_register
  BEFORE INSERT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_payment_to_open_cash_register();
```

### 4.3 RPC: Cerrar caja

```sql
CREATE OR REPLACE FUNCTION public.close_cash_register(
  p_register_id UUID,
  p_actual_cash NUMERIC,
  p_closing_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_business_id UUID;
  v_expected_cash NUMERIC;
  v_difference NUMERIC;
  v_status TEXT;
BEGIN
  -- Security & validation
  SELECT cr.business_id, cr.expected_cash, cr.status
  INTO v_business_id, v_expected_cash, v_status
  FROM public.daily_cash_register cr
  JOIN public.businesses b ON b.id = cr.business_id
  WHERE cr.id = p_register_id
  AND b.owner_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  IF v_status != 'open' THEN
    RAISE EXCEPTION 'cash_register_already_closed';
  END IF;

  v_difference := p_actual_cash - v_expected_cash;

  -- Actualizar registro
  UPDATE public.daily_cash_register
  SET
    actual_cash = p_actual_cash,
    cash_difference = v_difference,
    closed_at = NOW(),
    closed_by = auth.uid(),
    closing_notes = p_closing_notes,
    status = CASE
      WHEN ABS(v_difference) < 0.01 THEN 'reconciled'::cash_register_status
      ELSE 'closed'::cash_register_status
    END,
    updated_at = NOW()
  WHERE id = p_register_id;

  RETURN json_build_object(
    'success', true,
    'register_id', p_register_id,
    'expected_cash', v_expected_cash,
    'actual_cash', p_actual_cash,
    'difference', v_difference
  );
END;
$$;
```

---

## 5. FEATURES DETALLADAS

### 5.1 GESTIÓN DE CAJA DIARIA

**Apertura:**
- Input: efectivo inicial (default: $0)
- Auto-asigna usuario actual (opened_by)
- Registra fecha y hora de apertura
- Estado: 'open'
- Constraint: solo 1 caja abierta por negocio por día

**Durante el día:**
- Pagos en efectivo se suman automáticamente
- Gastos en efectivo se restan automáticamente
- Pagos a empleados en efectivo se restan
- Campo `expected_cash` se calcula en tiempo real

**Cierre:**
- Input: efectivo real contado
- Input (opcional): notas de cierre
- Calcula diferencia: actual - esperado
- Si diferencia < $0.01: estado 'reconciled'
- Si diferencia >= $0.01: estado 'closed'
- Previene ediciones posteriores

### 5.2 REGISTRO DE GASTOS

**Campos Requeridos:**
- Categoría (dropdown)
- Monto (> 0)
- Descripción
- Fecha del gasto
- Método de pago

**Campos Opcionales:**
- Número de comprobante
- Nombre del proveedor
- RUC/NIT del proveedor
- Imagen del recibo
- Notas adicionales

**Storage de Comprobantes:**
- Bucket: `business-receipts`
- Path: `{business_id}/{year}/{month}/{expense_id}.jpg`
- Tamaño máximo: 5MB

### 5.3 PAGOS A EMPLEADOS

**Configuración de Empleado:**
- Tipo de salario: fixed, hourly, commission, mixed
- Salario base mensual/quincenal
- Porcentaje de comisión (0-100%)
- Tarifa por hora
- Frecuencia de pago

**Tipos de Pago:**
1. Salary: pago regular
2. Commission: pago por servicios realizados
3. Bonus: pago extraordinario
4. Advance: adelanto de salario
5. Adjustment: corrección

### 5.4 REPORTES FINANCIEROS

**KPIs Principales:**
- Ingresos totales (cash + transfer)
- Gastos totales por categoría
- Pagos a empleados
- Resultado neto
- Comparación con período anterior

**Gráficos:**
- Ingresos vs Gastos (línea)
- Gastos por categoría (pie)
- Flujo de efectivo diario (barras)

---

## 6. ROADMAP DE IMPLEMENTACIÓN

### FASE 1: FUNDAMENTOS (Semana 1-2) - PRIORIDAD ALTA

**Database Schema:**
- ✅ Crear ENUMs
- ✅ Crear tabla `daily_cash_register`
- ✅ Crear tabla `business_expenses`
- ✅ Crear tabla `employee_payments`
- ✅ ALTER TABLE employees y payments
- ✅ Crear índices
- ✅ Configurar RLS policies

**Triggers:**
- ✅ `recalculate_cash_register_totals()`
- ✅ `assign_payment_to_open_cash_register()`
- ✅ `prevent_closed_register_modifications()`

**Tiempo:** 3-4 días | **Complejidad:** Media

---

### FASE 2: CIERRE DE CAJA BÁSICO (Semana 2-3) - PRIORIDAD ALTA

**Backend:**
- RPC: `get_cash_register_summary()`
- RPC: `close_cash_register()`
- RPC: `get_open_cash_register()`

**Frontend:**
- Ruta: `/dashboard/business/cash-register`
- Componente: `CashRegisterPage`
- Modal: Abrir Caja
- Modal: Cerrar Caja
- Card: Resumen en tiempo real

**Tiempo:** 5-6 días | **Complejidad:** Media-Alta

---

### FASE 3: GESTIÓN DE GASTOS (Semana 3-4) - PRIORIDAD ALTA

**Backend:**
- RPC: CRUD para business_expenses
- Setup Storage bucket: `business-receipts`
- RLS policies para storage

**Frontend:**
- Ruta: `/dashboard/business/expenses`
- Componente: `ExpensesPage`
- Listado con filtros
- Modal: Crear/Editar Gasto
- Upload de comprobantes
- Exportar a CSV

**Tiempo:** 5-6 días | **Complejidad:** Media

---

### FASE 4: NÓMINA (Semana 4-5) - PRIORIDAD MEDIA

**Backend:**
- RPC: CRUD para employee_payments
- RPC: `calculate_employee_commission()`

**Frontend:**
- Extender `/dashboard/business/employees/[id]` con salario
- Ruta: `/dashboard/business/payroll`
- Modal: Registrar Pago
- Historial de pagos
- Exportar a PDF

**Tiempo:** 6-7 días | **Complejidad:** Media-Alta

---

### FASE 5: REPORTES (Semana 5-6) - PRIORIDAD MEDIA

**Backend:**
- RPC: `get_financial_summary()`
- RPC: `get_expense_breakdown_by_category()`
- RPC: `get_cash_flow_daily()`

**Frontend:**
- Ruta: `/dashboard/business/reports/financial`
- KPIs principales
- Gráficos (Chart.js/Recharts)
- Exportar PDF/Excel

**Tiempo:** 5-6 días | **Complejidad:** Media

---

### FASE 6: INTEGRACIÓN (Semana 6) - PRIORIDAD ALTA

**Actualizar CheckoutModal:**
- Advertencia si no hay caja abierta
- Opción: abrir caja rápida

**Actualizar Analytics:**
- Integrar datos de gastos
- Card: Gastos del mes
- Card: Nómina del mes

**Notificaciones:**
- Alert: caja no cerrada
- Alert: diferencia > $10

**Tiempo:** 4-5 días | **Complejidad:** Baja-Media

---

## 7. ESTIMACIÓN DE COMPLEJIDAD

| Feature | Complejidad | Tiempo | Prioridad |
|---------|-------------|--------|-----------|
| Schema + Triggers | Media | 3-4 días | Alta |
| Cierre de Caja UI | Media-Alta | 5-6 días | Alta |
| Gestión de Gastos | Media | 5-6 días | Alta |
| Nómina | Media-Alta | 6-7 días | Media |
| Reportes Financieros | Media | 5-6 días | Media |
| Integración Sistema | Baja-Media | 4-5 días | Alta |

**TOTAL:** 6-7 semanas (30-35 días hábiles)

---

## 8. NOTAS FINALES

### 8.1 VALIDACIONES CRÍTICAS

1. **Arqueo de caja:**
   - Diferencia > $10: require notas obligatorias
   - Diferencia > $50: notificación al owner
   - Diferencia < $0.01: auto-status 'reconciled'

2. **Prevenir ediciones a cajas cerradas:**
   - Trigger implementado
   - UI: deshabilitar botones si status != 'open'

3. **Pagos a empleados:**
   - Transfer reference único
   - Warning si monto difiere del configurado

### 8.2 SEGURIDAD

**RLS Policies:** Solo business owners pueden ver/modificar sus cajas, gastos y pagos a empleados

**Triggers:** Previenen modificaciones a cajas cerradas

**Service Role:** Solo en RPC functions con validación de ownership

### 8.3 MIGRACIONES

**Orden de ejecución:**
1. `001_create_enums.sql`
2. `002_create_daily_cash_register.sql`
3. `003_create_business_expenses.sql`
4. `004_create_employee_payments.sql`
5. `005_alter_existing_tables.sql`
6. `006_create_triggers.sql`
7. `007_create_rpc_functions.sql`
8. `008_create_rls_policies.sql`

### 8.4 TESTING CHECKLIST

**Manual Testing:**
- [ ] Abrir caja con efectivo inicial $100
- [ ] Cobrar 3 citas en efectivo ($50 c/u)
- [ ] Registrar 1 gasto efectivo ($30)
- [ ] Pagar salario empleado efectivo ($100)
- [ ] Verificar expected_cash = $120
- [ ] Cerrar caja con actual_cash = $120
- [ ] Verificar status = 'reconciled'

**Edge Cases:**
- [ ] Intentar abrir 2 cajas el mismo día
- [ ] Intentar cerrar caja ya cerrada
- [ ] Agregar gasto a caja cerrada
- [ ] Referencia de transferencia duplicada

---

## 9. CONCLUSIÓN

Este plan proporciona:

1. ✅ **Valor Inmediato:** Fase 1-2 ya provee cierre de caja funcional
2. ✅ **Escalabilidad:** Schema soporta features avanzados futuros
3. ✅ **Seguridad:** RLS y triggers previenen errores
4. ✅ **UX Premium:** Interfaces modernas y usables
5. ✅ **Integración Limpia:** No rompe sistema existente

**Próximos pasos:**
1. Revisar y aprobar schema de database
2. Crear branch `feature/cash-register-system`
3. Iniciar Fase 1 (database schema)
4. Testing exhaustivo después de cada fase
5. Deploy incremental a producción

---

**Última Actualización:** 2025-01-10
**Estado:** Plan Completo - Listo para Implementación
