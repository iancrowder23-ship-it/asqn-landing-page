-- Allow authenticated users to submit enlistment applications too
-- (original policy only allowed anon, blocking logged-in users)
CREATE POLICY "Authenticated can submit enlistments"
  ON public.enlistments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
