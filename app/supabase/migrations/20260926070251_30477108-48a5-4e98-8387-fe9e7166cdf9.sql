DROP POLICY IF EXISTS "flags_public_read" ON public.feature_flags;
REVOKE SELECT ON public.feature_flags FROM anon;
CREATE POLICY "flags_signed_in_read" ON public.feature_flags FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);