-- Fix: Allow any authenticated member to read attendance records for cross-profile viewing
-- Without this, member A viewing member B's profile sees empty attendance stats and combat record
-- Analogous to "Authenticated can read all soldiers" on soldiers table
CREATE POLICY "Authenticated can read all attendance"
  ON public.operation_attendance FOR SELECT TO authenticated
  USING (true);
