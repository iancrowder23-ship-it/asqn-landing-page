-- Phase 6: Add NCO+ UPDATE policy on public.events
--
-- No new tables or columns are needed here.
-- The `events` table already exists from the initial schema (Phase 2).
-- The `operations` and `operation_attendance` tables already received their
-- full RLS policies in Phase 3 (20260211000004_phase3_profiles.sql and
-- 20260211000005_phase3_attendance_rls_fix.sql), so no changes are needed there.
--
-- This migration adds only the missing UPDATE policy so that NCO-ranked and
-- above users can update event rows (e.g., change status, edit details).
-- The existing INSERT policy (admin/command/nco) and SELECT policy (public)
-- remain untouched.

CREATE POLICY "NCO and above can update events"
  ON public.events FOR UPDATE TO authenticated
  USING (
    (SELECT (auth.jwt() ->> 'user_role')::public.app_role)
      IN ('nco', 'command', 'admin')
  )
  WITH CHECK (
    (SELECT (auth.jwt() ->> 'user_role')::public.app_role)
      IN ('nco', 'command', 'admin')
  );
