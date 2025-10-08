-- Step 2: RLS + RPCs for business-managed clients (reversible)
-- UP migration: enable RLS on business_clients and create RPCs
-- This script is idempotent. A corresponding DOWN script exists in schema_step2_down.sql

BEGIN;

-- 0) Ensure search path
SET search_path = public;

-- 1) Enable RLS on business_clients
ALTER TABLE public.business_clients ENABLE ROW LEVEL SECURITY;

-- 2) Policies (owner or employee of the same business)
-- Helper predicate reused in policies
-- Note: Using inline EXISTS in each policy for idempotence and clarity

-- SELECT policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'business_clients_select' AND tablename = 'business_clients'
  ) THEN
    CREATE POLICY business_clients_select ON public.business_clients
      FOR SELECT
      USING (
        /* Access: business owner only for now. To allow employees, add a mapping to auth.uid() and extend this predicate. */
        EXISTS (
          SELECT 1 FROM public.businesses b
          WHERE b.id = business_clients.business_id
            AND b.owner_id = auth.uid()
        )
      );
  END IF;
END$$;

-- INSERT policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'business_clients_insert' AND tablename = 'business_clients'
  ) THEN
    CREATE POLICY business_clients_insert ON public.business_clients
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.businesses b
          WHERE b.id = business_clients.business_id
            AND b.owner_id = auth.uid()
        )
      );
  END IF;
END$$;

-- UPDATE policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'business_clients_update' AND tablename = 'business_clients'
  ) THEN
    CREATE POLICY business_clients_update ON public.business_clients
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.businesses b
          WHERE b.id = business_clients.business_id
            AND b.owner_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.businesses b
          WHERE b.id = business_clients.business_id
            AND b.owner_id = auth.uid()
        )
      );
  END IF;
END$$;

-- DELETE policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'business_clients_delete' AND tablename = 'business_clients'
  ) THEN
    CREATE POLICY business_clients_delete ON public.business_clients
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.businesses b
          WHERE b.id = business_clients.business_id
            AND b.owner_id = auth.uid()
        )
      );
  END IF;
END$$;

-- 3) RPCs (SECURITY DEFINER) --------------------------------------------
-- Tenant guard function (inline check in each RPC)

-- 3.1 upsert_business_client: insert or update
CREATE OR REPLACE FUNCTION public.upsert_business_client(
  p_business_id UUID,
  p_first_name TEXT,
  p_last_name TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT TRUE,
  p_client_id UUID DEFAULT NULL
)
RETURNS public.business_clients
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allowed BOOLEAN;
  v_row public.business_clients;
BEGIN
  -- tenant check: owner or employee
  SELECT EXISTS (
    SELECT 1 FROM public.businesses b WHERE b.id = p_business_id AND b.owner_id = auth.uid()
  ) INTO v_allowed;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'not_allowed';
  END IF;

  IF p_client_id IS NULL THEN
    INSERT INTO public.business_clients (business_id, first_name, last_name, phone, email, notes, is_active)
    VALUES (p_business_id, p_first_name, p_last_name, p_phone, p_email, p_notes, COALESCE(p_is_active, TRUE))
    RETURNING * INTO v_row;
  ELSE
    UPDATE public.business_clients
       SET first_name = p_first_name,
           last_name = p_last_name,
           phone = p_phone,
           email = p_email,
           notes = p_notes,
           is_active = COALESCE(p_is_active, TRUE),
           updated_at = now()
     WHERE id = p_client_id AND business_id = p_business_id
    RETURNING * INTO v_row;
  END IF;

  RETURN v_row;
END;
$$;

-- 3.2 list_business_clients: search/paginate/sort
CREATE OR REPLACE FUNCTION public.list_business_clients(
  p_business_id UUID,
  p_search TEXT DEFAULT NULL,
  p_only_active BOOLEAN DEFAULT TRUE,
  p_limit INT DEFAULT 25,
  p_offset INT DEFAULT 0,
  p_sort_by TEXT DEFAULT 'first_name',
  p_sort_dir TEXT DEFAULT 'asc'
)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allowed BOOLEAN;
  v_sort_by TEXT := lower(p_sort_by);
  v_sort_dir TEXT := lower(p_sort_dir);
BEGIN
  -- tenant check
  SELECT EXISTS (
    SELECT 1 FROM public.businesses b WHERE b.id = p_business_id AND b.owner_id = auth.uid()
  ) INTO v_allowed;
  IF NOT v_allowed THEN RAISE EXCEPTION 'not_allowed'; END IF;

  IF v_sort_by NOT IN ('first_name','last_name','phone','email','created_at','updated_at') THEN v_sort_by := 'first_name'; END IF;
  IF v_sort_dir NOT IN ('asc','desc') THEN v_sort_dir := 'asc'; END IF;

  RETURN QUERY
  WITH base AS (
    SELECT *
    FROM public.business_clients bc
    WHERE bc.business_id = p_business_id
      AND (NOT p_only_active OR bc.is_active)
      AND (
        p_search IS NULL OR p_search = '' OR
        (bc.first_name || ' ' || COALESCE(bc.last_name, '')) ILIKE '%'||p_search||'%' OR
        bc.phone ILIKE '%'||p_search||'%' OR
        bc.email ILIKE '%'||p_search||'%'
      )
  ), counted AS (
    SELECT b.*, count(*) OVER() AS total_count FROM base b
  )
  SELECT
    c.id, c.first_name, c.last_name, c.phone, c.email, c.notes, c.is_active,
    c.created_at, c.updated_at, c.total_count
  FROM counted c
  ORDER BY
    CASE WHEN v_sort_by='first_name' AND v_sort_dir='asc' THEN c.first_name END ASC,
    CASE WHEN v_sort_by='first_name' AND v_sort_dir='desc' THEN c.first_name END DESC,
    CASE WHEN v_sort_by='last_name' AND v_sort_dir='asc' THEN c.last_name END ASC,
    CASE WHEN v_sort_by='last_name' AND v_sort_dir='desc' THEN c.last_name END DESC,
    CASE WHEN v_sort_by='phone' AND v_sort_dir='asc' THEN c.phone END ASC,
    CASE WHEN v_sort_by='phone' AND v_sort_dir='desc' THEN c.phone END DESC,
    CASE WHEN v_sort_by='email' AND v_sort_dir='asc' THEN c.email END ASC,
    CASE WHEN v_sort_by='email' AND v_sort_dir='desc' THEN c.email END DESC,
    CASE WHEN v_sort_by='created_at' AND v_sort_dir='asc' THEN c.created_at END ASC,
    CASE WHEN v_sort_by='created_at' AND v_sort_dir='desc' THEN c.created_at END DESC,
    CASE WHEN v_sort_by='updated_at' AND v_sort_dir='asc' THEN c.updated_at END ASC,
    CASE WHEN v_sort_by='updated_at' AND v_sort_dir='desc' THEN c.updated_at END DESC
  LIMIT GREATEST(p_limit, 1)
  OFFSET GREATEST(p_offset, 0);
END;
$$;

-- 3.3 get_business_client
CREATE OR REPLACE FUNCTION public.get_business_client(
  p_business_id UUID,
  p_client_id UUID
)
RETURNS public.business_clients
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allowed BOOLEAN;
  v_row public.business_clients;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.businesses b WHERE b.id = p_business_id AND b.owner_id = auth.uid()
  ) INTO v_allowed;
  IF NOT v_allowed THEN RAISE EXCEPTION 'not_allowed'; END IF;

  SELECT * INTO v_row
  FROM public.business_clients
  WHERE id = p_client_id AND business_id = p_business_id;

  RETURN v_row;
END;
$$;

-- 3.4 deactivate_business_client
CREATE OR REPLACE FUNCTION public.deactivate_business_client(
  p_business_id UUID,
  p_client_id UUID
)
RETURNS public.business_clients
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allowed BOOLEAN;
  v_row public.business_clients;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.businesses b WHERE b.id = p_business_id AND b.owner_id = auth.uid()
    UNION ALL
    SELECT 1 FROM public.employees e WHERE e.business_id = p_business_id AND e.user_id = auth.uid() AND e.is_active = TRUE
  ) INTO v_allowed;
  IF NOT v_allowed THEN RAISE EXCEPTION 'not_allowed'; END IF;

  UPDATE public.business_clients
     SET is_active = FALSE,
         updated_at = now()
   WHERE id = p_client_id AND business_id = p_business_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

COMMIT;
