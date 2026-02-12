-- ============================================================
-- Phase 3: Soldier Profiles and Service Records — Infrastructure
-- Decisions locked:
--   - operations/operation_attendance are internal tracking tables
--     (separate from public `events` table used on the public site)
--   - Authenticated users can read ALL soldiers regardless of status
--     (profile pages must work for LOA/AWOL/Discharged/Retired)
--   - Members can read their own service records including leadership_only entries
--   - RLS enabled on every new table at creation
-- ============================================================

-- ============================================================
-- 1. Add 'retired' to soldiers status check constraint
-- ============================================================
ALTER TABLE public.soldiers DROP CONSTRAINT IF EXISTS soldiers_status_check;
ALTER TABLE public.soldiers ADD CONSTRAINT soldiers_status_check
  CHECK (status IN ('active', 'inactive', 'loa', 'awol', 'discharged', 'retired'));

-- ============================================================
-- 2. Create operations table
-- Drop old legacy tables first (from asqn-project-1 schema that was not
-- included in the initial_schema.sql DROP list — CASCADE removes dependent objects)
-- ============================================================
DROP TABLE IF EXISTS public.operation_attendance CASCADE;
DROP TABLE IF EXISTS public.operations CASCADE;

-- Internal completed ops for attendance tracking.
-- Separate from public `events` table used on the public site.
CREATE TABLE public.operations (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title          text NOT NULL,
  operation_date timestamptz NOT NULL,
  operation_type text NOT NULL CHECK (operation_type IN ('operation', 'training', 'ftx')),
  status         text NOT NULL DEFAULT 'completed'
                   CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  description    text,
  created_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.operations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. Create operation_attendance table (soldier x operation join)
-- ============================================================
CREATE TABLE public.operation_attendance (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  soldier_id   uuid NOT NULL REFERENCES public.soldiers(id) ON DELETE CASCADE,
  operation_id uuid NOT NULL REFERENCES public.operations(id) ON DELETE CASCADE,
  status       text NOT NULL CHECK (status IN ('present', 'excused', 'absent')),
  role_held    text,
  notes        text,
  recorded_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (soldier_id, operation_id)
);
ALTER TABLE public.operation_attendance ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. RLS policies for operations
-- ============================================================

-- Authenticated can read completed operations
CREATE POLICY "Authenticated can read completed operations"
  ON public.operations FOR SELECT TO authenticated
  USING (status = 'completed');

-- NCO+ can manage all operations
CREATE POLICY "NCO and above can manage operations"
  ON public.operations FOR ALL TO authenticated
  USING (
    (SELECT (auth.jwt() ->> 'user_role')::public.app_role)
      IN ('nco', 'command', 'admin')
  );

-- ============================================================
-- 5. RLS policies for operation_attendance
-- ============================================================

-- Members can read own attendance
CREATE POLICY "Members can read own attendance"
  ON public.operation_attendance FOR SELECT TO authenticated
  USING (
    soldier_id IN (
      SELECT id FROM public.soldiers WHERE user_id = (SELECT auth.uid())
    )
  );

-- NCO+ can read all attendance
CREATE POLICY "NCO and above can read all attendance"
  ON public.operation_attendance FOR SELECT TO authenticated
  USING (
    (SELECT (auth.jwt() ->> 'user_role')::public.app_role)
      IN ('nco', 'command', 'admin')
  );

-- NCO+ can manage attendance (insert/update/delete)
CREATE POLICY "NCO and above can manage attendance"
  ON public.operation_attendance FOR ALL TO authenticated
  USING (
    (SELECT (auth.jwt() ->> 'user_role')::public.app_role)
      IN ('nco', 'command', 'admin')
  );

-- ============================================================
-- 6. New RLS policy on service_records
-- Members can read their OWN service records including leadership_only entries
-- ============================================================
CREATE POLICY "Members can read own service records"
  ON public.service_records FOR SELECT TO authenticated
  USING (
    soldier_id IN (
      SELECT id FROM public.soldiers WHERE user_id = (SELECT auth.uid())
    )
  );

-- ============================================================
-- 7. New RLS policy on soldiers
-- Authenticated can read ALL soldiers (not just active) for profile pages.
-- The existing "Authenticated can read active soldiers" policy restricts to
-- status = 'active'. This additive policy ensures profile pages for
-- LOA/AWOL/Discharged/Retired soldiers are accessible.
-- PostgreSQL OR logic for permissive policies — anon policy still restricts.
-- ============================================================
CREATE POLICY "Authenticated can read all soldiers"
  ON public.soldiers FOR SELECT TO authenticated
  USING (true);
