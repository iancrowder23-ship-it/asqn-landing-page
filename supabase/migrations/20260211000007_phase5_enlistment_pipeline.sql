-- Phase 5: Enlistment Pipeline
-- 1. Add 'interview_scheduled' to enlistments status constraint
-- 2. Add soldier_id FK column for idempotency when accepting applications
-- 3. Add Command+ UPDATE RLS policy on enlistments

-- 1. Update status check constraint to include 'interview_scheduled'
ALTER TABLE public.enlistments DROP CONSTRAINT IF EXISTS enlistments_status_check;
ALTER TABLE public.enlistments ADD CONSTRAINT enlistments_status_check
  CHECK (status IN ('pending', 'reviewing', 'interview_scheduled', 'accepted', 'rejected'));

-- 2. Add soldier_id FK column (nullable — only set when application is accepted)
ALTER TABLE public.enlistments
  ADD COLUMN IF NOT EXISTS soldier_id uuid REFERENCES public.soldiers(id) ON DELETE SET NULL;

-- 3. Add RLS UPDATE policy for Command and above
CREATE POLICY "Command and above can update enlistments"
  ON public.enlistments FOR UPDATE TO authenticated
  USING (
    (SELECT (auth.jwt() ->> 'user_role')::public.app_role)
      IN ('command', 'admin')
  )
  WITH CHECK (
    (SELECT (auth.jwt() ->> 'user_role')::public.app_role)
      IN ('command', 'admin')
  );
