-- Step 1: Business-managed clients base schema (reversible)
-- UP migration: create table business_clients, indexes, and link from appointments
-- This script is idempotent (safe to re-run). A corresponding DOWN script is provided in schema_down.sql

BEGIN;

-- Required: pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Optional: enable trigram extension for better name search performance
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1) Create table business_clients
CREATE TABLE IF NOT EXISTS public.business_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) Indexes and uniqueness per business
CREATE INDEX IF NOT EXISTS idx_business_clients_business_id
  ON public.business_clients(business_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_business_clients_business_phone
  ON public.business_clients(business_id, phone)
  WHERE phone IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_business_clients_business_email
  ON public.business_clients(business_id, email)
  WHERE email IS NOT NULL;

-- Trigram index for name search (first_name + last_name)
CREATE INDEX IF NOT EXISTS idx_business_clients_name_trgm
  ON public.business_clients
  USING gin ((first_name || ' ' || COALESCE(last_name, '')) gin_trgm_ops);

-- 3) Link appointments to business_clients (nullable, only for internal clients)
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS business_client_id UUID
    REFERENCES public.business_clients(id)
    ON DELETE SET NULL;

-- 4) Integrity rule: ensure ONE AND ONLY ONE of these sources is provided per appointment
--    - client_id (registered user) OR
--    - business_client_id (client saved by the business) OR
--    - walk-in data (walk_in_client_name or walk_in_client_phone)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'appointments_client_source_xor'
  ) THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_client_source_xor
      CHECK (
        (
          (CASE WHEN client_id IS NOT NULL THEN 1 ELSE 0 END) +
          (CASE WHEN business_client_id IS NOT NULL THEN 1 ELSE 0 END) +
          (CASE WHEN (walk_in_client_name IS NOT NULL OR walk_in_client_phone IS NOT NULL) THEN 1 ELSE 0 END)
        ) = 1
      );
  END IF;
END
$$;

COMMIT;
