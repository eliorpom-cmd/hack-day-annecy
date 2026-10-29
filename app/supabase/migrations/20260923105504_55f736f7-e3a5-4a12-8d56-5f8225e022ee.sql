REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_org_member(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_org_admin(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_org_member(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_org_admin(UUID) TO authenticated, service_role;