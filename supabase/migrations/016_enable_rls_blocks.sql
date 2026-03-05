-- Enable RLS on public.blocks table
-- This table was flagged by Supabase Security Advisor as having RLS disabled.
-- It is not currently used by the application (user blocks use user_blocks table instead).
-- Enabling RLS with no policies denies all public access by default.

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- Allow admins full access
CREATE POLICY "Admins can manage blocks"
  ON public.blocks
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );
