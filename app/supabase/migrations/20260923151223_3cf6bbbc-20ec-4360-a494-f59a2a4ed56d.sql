GRANT SELECT ON public.plans TO anon, authenticated;
GRANT SELECT ON public.voices TO anon, authenticated;
GRANT SELECT ON public.feature_flags TO anon, authenticated;
GRANT ALL ON public.plans TO service_role;
GRANT ALL ON public.voices TO service_role;
GRANT ALL ON public.feature_flags TO service_role;